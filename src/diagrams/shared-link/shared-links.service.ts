import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SharedLink } from '../../entities/shared-link/shared-link';
import { Document } from '../../entities/document/document';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateShareLinkDto } from './dto/create-shared-link.dto';

@Injectable()
export class SharedLinksService {
  private sharedLinks: Repository<SharedLink>;
  private documents: Repository<Document>;

  constructor(private readonly ds: DataSource) {
    this.sharedLinks = ds.getRepository(SharedLink);
    this.documents = ds.getRepository(Document);
  }

  async create(
    documentId: string,
    dto: CreateShareLinkDto,
    userSub: string,
  ): Promise<{ shareUrl: string; link: SharedLink }> {
    await this.canShare(documentId, userSub);

    const token = crypto.randomBytes(32).toString('hex');

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const link = await this.sharedLinks.save(
      this.sharedLinks.create({
        token,
        permission: dto.permission,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        passwordHash,
        documentId,
        createdBy: userSub,
      }),
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/shared/${token}`;

    return { shareUrl, link };
  }

  async listByDocument(documentId: string, userSub: string): Promise<SharedLink[]> {
    await this.canShare(documentId, userSub);

    return this.sharedLinks.find({
      where: { documentId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getByToken(
    token: string,
    password?: string,
  ): Promise<{ document: Document; permission: 'read' | 'edit' }> {
    const link = await this.sharedLinks.findOne({
      where: { token, isActive: true },
      relations: ['document', 'document.project', 'document.sheets'],
    });

    if (!link) throw new NotFoundException('Shared link not found');
    

    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new ForbiddenException('Shared link has expired');
    }

    if (link.passwordHash) {
      if (!password) {
        throw new BadRequestException('Password required');
      }
      const isValidPassword = await bcrypt.compare(password, link.passwordHash);
      if (!isValidPassword) {
        throw new ForbiddenException('Invalid password');
      }
    }

    return { document: link.document, permission: link.permission };
  }

  async revoke(linkId: string, userSub: string): Promise<void> {
    const link = await this.sharedLinks.findOne({
      where: { id: linkId },
      relations: ['document'],
    });

    if (!link) throw new NotFoundException('Shared link not found');

    await this.canShare(link.documentId, userSub);

    await this.sharedLinks.update(linkId, { isActive: false });
  }

  private async canShare(documentId: string, userSub: string): Promise<void> {
    const document = await this.documents
      .createQueryBuilder('d')
      .leftJoin('d.collaborators', 'c')
      .leftJoin('d.project', 'p')
      .where('d.id = :documentId', { documentId })
      .andWhere(
        '(d.created_by = :userSub OR p.owner_sub = :userSub OR (c.user_sub = :userSub AND c.role IN (:...roles)))',
        { userSub, roles: ['owner', 'editor'] },
      )
      .getOne();

    if (!document) {
      throw new ForbiddenException('No permission to share this document');
    }
  }

async findById(id: string) {
  return await this.sharedLinks.findOne({ where: { id } });
}
}
