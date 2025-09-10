import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Document } from 'src/entities/document/document';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { ShareLink } from 'src/entities/shared-link/shared-link';

@Injectable()
export class CollabService {
  private alreadyCounted = new Set<string>();
  constructor(
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @InjectRepository(Collaborator)
    private readonly collabRepo: Repository<Collaborator>,
    @InjectRepository(ShareLink)
    private readonly shareLinkRepo: Repository<ShareLink>,
    private readonly ds: DataSource,
  ) {}

  // <- userSub ahora es OPCIONAL
  async ensureCanJoin(
    documentId: string,
    userSub?: string,
    sharedToken?: string,
  ) {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({ where: { documentId, userSub } });
      if (!collab) throw new ForbiddenException('No tienes acceso');
      return;
    }

    // Invitado via token
    if (sharedToken) {
      const shareLink = await this.shareLinkRepo.findOne({
        where: { slug: sharedToken, isActive: true },
      });
      if (!shareLink) throw new ForbiddenException('Enlace inválido');
      if (shareLink.isExpired) throw new ForbiddenException('Enlace expirado');
      if (shareLink.maxUses && shareLink.uses >= shareLink.maxUses) {
        throw new ForbiddenException('Límite de usos alcanzado');
      }
      if (String(shareLink.documentId) !== String(documentId)) {
        throw new ForbiddenException('Enlace no válido para este documento');
      }
      return;
    }

    throw new ForbiddenException('Acceso no autorizado');
  }

  // <- userSub ahora es OPCIONAL
  async ensureCanEdit(
    documentId: string,
    userSub?: string,
    sharedToken?: string,
  ) {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({ where: { documentId, userSub } });
      if (!collab || collab.role === 'reader') {
        throw new ForbiddenException('Solo lectura');
      }
      return;
    }

    if (sharedToken) {
      const shareLink = await this.shareLinkRepo.findOne({
        where: { slug: sharedToken, isActive: true },
      });

      if (!shareLink) throw new ForbiddenException('Enlace inválido');
      if (shareLink.isExpired) throw new ForbiddenException('Enlace expirado');
      if (shareLink.maxUses && shareLink.uses >= shareLink.maxUses) {
        throw new ForbiddenException('Límite de usos alcanzado');
      }
      if (String(shareLink.documentId) !== String(documentId)) {
        throw new ForbiddenException('Enlace no válido para este documento');
      }
      if (shareLink.minRole !== 'editor') {
        throw new ForbiddenException('Solo lectura - Enlace de solo lectura');
      }
      return;
    }

    throw new ForbiddenException('Acceso no autorizado');
  }

  // <- puede devolver null si no hay acceso real
  async getPermissions(
    documentId: string,
    userSub?: string,
    sharedToken?: string,
  ): Promise<'read' | 'edit' | null> {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({ where: { documentId, userSub } });
      if (!collab) return null;
      return collab.role === 'editor' ? 'edit' : 'read';
    }

    // Invitado via token
    if (sharedToken) {
      const shareLink = await this.shareLinkRepo.findOne({
        where: { slug: sharedToken, isActive: true },
      });
      if (!shareLink) return null;
      if (String(shareLink.documentId) !== String(documentId)) return null;
      if (shareLink.isExpired) return null;

      return shareLink.minRole === 'editor' ? 'edit' : 'read';
    }

    return null; // sin userSub y sin token => no acceso
  }

  async incrementShareUseOnce(slug: string) {
    if (this.alreadyCounted.has(slug)) return;
    const link = await this.shareLinkRepo.findOne({ where: { slug, isActive: true } });
    if (!link) return;
    if (link.maxUses && link.uses >= link.maxUses) return;
    await this.shareLinkRepo.increment({ slug }, 'uses', 1);
    this.alreadyCounted.add(slug);
  }

  async getSnapshot(documentId: string) {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Documento no existe');
    return { data: (doc as any).data, version: (doc as any).version };
  }

  async applyOps(
    documentId: string,
    version: number,
    ops: any,
    actor: string,
    isGuest: boolean = false,
  ) {
    return this.ds.transaction(async (manager) => {
      const current = await manager.findOne(Document, { where: { id: documentId } });
      if (!current) throw new NotFoundException('Documento no existe');
      if ((current as any).version !== version) throw new ConflictException('Version conflict');

      const nextData = this.applyOpsPure((current as any).data, ops);
      const nextVersion = version + 1;

      const res = await manager
        .createQueryBuilder()
        .update(Document)
        .set({ data: nextData, version: nextVersion })
        .where('id = :id AND version = :version', { id: documentId, version })
        .returning('*')
        .execute();

      if (res.affected !== 1) throw new ConflictException('Optimistic lock failed');

      return { version: nextVersion, appliedOps: ops };
    });
  }

  private applyOpsPure(data: any, ops: any): any {
    if (ops.apply && typeof ops.apply === 'object') {
      return { ...data, ...ops.apply };
    }
    if (ops.nodes && Array.isArray(ops.nodes)) {
      return { ...data, nodes: ops.nodes };
    }
    if (ops.edges && Array.isArray(ops.edges)) {
      return { ...data, edges: ops.edges };
    }
    if (typeof ops.title === 'string') {
      return { ...data, title: ops.title };
    }
    return data;
  }
}
