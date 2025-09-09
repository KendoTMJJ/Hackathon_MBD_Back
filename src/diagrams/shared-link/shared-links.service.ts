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

  private shareUrl(slug: string) {
    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${base}/shared/${slug}`;
  }

  /** Permisos: creador del doc, owner del proyecto, o collaborator owner/editor */
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

  async create(dto: CreateShareLinkDto, createdBySub: string) {
    const scope: 'document' | 'project' = dto.scope ?? 'document'; // 👈 default aquí

    if (scope === 'project' && !dto.projectId)
      throw new BadRequestException('projectId requerido');
    if (scope === 'document' && !dto.documentId)
      throw new BadRequestException('documentId requerido');

    if (scope === 'document' && dto.documentId) {
      await this.ensureCanShare(dto.documentId, createdBySub);
    }

    const slug = randomBytes(16).toString('base64url').slice(0, 20);

    // Si el front manda "permission", mapéalo a minRole:
    const minRole: 'reader' | 'editor' =
      dto.minRole ?? (dto.permission === 'edit' ? 'editor' : 'reader');

    const entity = this.repo.create({
      slug,
      scope, // 👈 usa la variable con fallback
      projectId: scope === 'project' ? (dto.projectId ?? null) : null,
      documentId: scope === 'document' ? (dto.documentId ?? null) : null,
      minRole, // 👈 respeta el permiso del modal
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      maxUses: dto.maxUses ?? null,
      createdBySub,
      // isActive toma el default de la entidad
    });

    const saved = await this.repo.save(entity);
    return { shareUrl: this.shareUrl(saved.slug), link: saved };
  }

  /** Usado por el modal para listar links de un documento */
  async listByDocument(documentId: string, userSub: string) {
    await this.ensureCanShare(documentId, userSub);
    return this.repo.find({
      where: { documentId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Desactiva (revoca) un link */
  async revoke(id: string, userSub: string) {
    const link = await this.repo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Link no existe');

    if (link.documentId) {
      await this.ensureCanShare(link.documentId, userSub);
    }
    // si soportas scope project, valida que userSub sea owner del proyecto

    await this.repo.update({ id }, { isActive: false });
    return { ok: true };
  }

  async preview(slug: string) {
    const link = await this.repo.findOne({ where: { slug, isActive: true } });
    if (!link) throw new NotFoundException('Link no existe');
    if (link.isExpired) throw new ForbiddenException('Link expirado');
    if (link.maxUses && link.uses >= link.maxUses)
      throw new ForbiddenException('Link sin cupos');
    return link;
  }

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
          { documentId: link.documentId, userSub, role: link.minRole }, // 'reader' | 'editor'
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
}
