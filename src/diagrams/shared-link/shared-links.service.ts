import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { Document } from 'src/entities/document/document';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { DataSource, Repository } from 'typeorm';
import { CreateShareLinkDto } from './dto/create-shared-link.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLink) private readonly repo: Repository<ShareLink>,
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @InjectRepository(Collaborator)
    private readonly collabRepo: Repository<Collaborator>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  /**
   * Builds the final public URL for sharing a link.
   * Falls back to localhost if FRONTEND_URL is not defined.
   */
  private shareUrl(slug: string) {
    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${base}/shared/${slug}`;
  }

  /**
   * Ensures that the user has permission to share a document.
   *
   * Permissions allowed:
   * - Document creator
   * - Project owner
   * - Document collaborator with the role "owner" or "editor"
   *
   * Throws:
   * - ForbiddenException if the user is not allowed to manage share links
   */
  private async ensureCanShare(documentId: string, userSub: string) {
    const doc = await this.docRepo
      .createQueryBuilder('d')
      .leftJoin('d.project', 'p')
      .leftJoin('d.collaborators', 'c')
      .where('d.id = :documentId', { documentId })
      .andWhere(
        '(d.createdBy = :userSub OR p.ownerSub = :userSub OR (c.userSub = :userSub AND c.role IN (:...roles)))',
        { userSub, roles: ['owner', 'editor'] },
      )
      .getOne();

    if (!doc)
      throw new ForbiddenException('No permission to share this document');
  }

  /**
   * Creates a share link for either:
   * - A specific document, or
   * - An entire project (optional behavior)
   *
   * Validates:
   * - Required fields depending on the selected scope
   * - User permissions for the document
   *
   * Generates:
   * - A random slug using base64url encoding
   * - The minimum role required for whoever uses the link
   *
   * Returns:
   * - The full share URL and the saved ShareLink entity
   */
  async create(dto: CreateShareLinkDto, createdBySub: string) {
    const scope: 'document' | 'project' = dto.scope ?? 'document';

    if (scope === 'project' && !dto.projectId)
      throw new BadRequestException('projectId requerido');
    if (scope === 'document' && !dto.documentId)
      throw new BadRequestException('documentId requerido');

    if (scope === 'document' && dto.documentId) {
      await this.ensureCanShare(dto.documentId, createdBySub);
    }

    const slug = randomBytes(16).toString('base64url').slice(0, 20);

    const minRole: 'reader' | 'editor' =
      dto.minRole ?? (dto.permission === 'edit' ? 'editor' : 'reader');

    const entity = this.repo.create({
      slug,
      scope,
      projectId: scope === 'project' ? (dto.projectId ?? null) : null,
      documentId: scope === 'document' ? (dto.documentId ?? null) : null,
      minRole,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      maxUses: dto.maxUses ?? null,
      createdBySub,
    });

    const saved = await this.repo.save(entity);
    return { shareUrl: this.shareUrl(saved.slug), link: saved };
  }

  /**
   * Lists all active share links that belong to a document.
   * Only callable by users who have permissions (checked via ensureCanShare).
   */
  async listByDocument(documentId: string, userSub: string) {
    await this.ensureCanShare(documentId, userSub);
    return this.repo.find({
      where: { documentId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Deactivates (revokes) a share link.
   *
   * Validates:
   * - Link existence
   * - User permissions based on document ownership/collaboration
   *
   * Soft-delete behavior:
   * - Sets isActive = false instead of removing the record
   */
  async revoke(id: string, userSub: string) {
    const link = await this.repo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Link no existe');

    if (link.documentId) {
      await this.ensureCanShare(link.documentId, userSub);
    }
    // If supporting project-scope sharing, you may also verify project ownership here.

    await this.repo.update({ id }, { isActive: false });
    return { ok: true };
  }

  /**
   * Returns basic preview information before accepting a share link.
   *
   * Validates:
   * - Link existence
   * - Link active state
   * - Expiration
   * - Remaining allowed uses
   */
  async preview(slug: string) {
    const link = await this.repo.findOne({ where: { slug, isActive: true } });
    if (!link) throw new NotFoundException('Link no existe');
    if (link.isExpired) throw new ForbiddenException('Link expirado');
    if (link.maxUses && link.uses >= link.maxUses)
      throw new ForbiddenException('Link sin cupos');
    return link;
  }

  /**
   * Accepts a share link and grants access to the user.
   *
   * Behavior:
   * - For document-level links: user becomes collaborator of that document.
   * - For project-level links: user is added to all documents under the project.
   * - Uses a transaction to ensure atomic operations.
   *
   * Also increments:
   * - `uses` counter of the ShareLink
   */
  async accept(slug: string, userSub: string) {
    return this.ds.transaction(async (manager) => {
      const link = await manager.findOne(ShareLink, {
        where: { slug, isActive: true },
      });

      if (!link) throw new NotFoundException('Link no existe');
      if (link.expiresAt && new Date() > link.expiresAt)
        throw new ForbiddenException('Link expirado');
      if (link.maxUses && link.uses >= link.maxUses)
        throw new ForbiddenException('Link sin cupos');

      if (link.scope === 'document' && link.documentId) {
        await manager.upsert(
          Collaborator,
          { documentId: link.documentId, userSub, role: link.minRole },
          { conflictPaths: ['documentId', 'userSub'] },
        );
      } else if (link.scope === 'project' && link.projectId) {
        const docs = await manager.find(Document, {
          where: { project: { id: link.projectId } },
          relations: ['project'],
        });

        for (const d of docs) {
          await manager.upsert(
            Collaborator,
            { documentId: d.id, userSub, role: link.minRole },
            { conflictPaths: ['documentId', 'userSub'] },
          );
        }
      }

      await manager.increment(ShareLink, { id: link.id }, 'uses', 1);
      return { ok: true };
    });
  }

  /**
   * Retrieves a share link by slug, including its related document/project.
   * Used by some frontend flows to check metadata.
   */
  async getByToken(slug: string) {
    return this.repo.findOne({
      where: { slug, isActive: true },
      relations: ['document', 'project'],
    });
  }
}
