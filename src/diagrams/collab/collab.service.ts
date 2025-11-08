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

/**
 * Service responsible for collaboration and real-time document editing operations
 *
 * @remarks
 * Handles permission validation, share link management, and operational transformation.
 * Supports both authenticated users and guest access via share links.
 * Implements optimistic locking for conflict-free concurrent editing.
 */
@Injectable()
export class CollabService {
  /**
   * Track already counted share link uses to prevent duplicate increments
   */
  private alreadyCounted = new Set<string>();

  /**
   * Initializes the CollabService with repository dependencies
   *
   * @param docRepo - Repository for document entities
   * @param collabRepo - Repository for collaborator entities
   * @param shareLinkRepo - Repository for share link entities
   * @param ds - DataSource for transaction management
   */
  constructor(
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @InjectRepository(Collaborator)
    private readonly collabRepo: Repository<Collaborator>,
    @InjectRepository(ShareLink)
    private readonly shareLinkRepo: Repository<ShareLink>,
    private readonly ds: DataSource,
  ) {}

  /**
   * Validates if a user can join a document for viewing/editing
   *
   * @param documentId - The unique identifier of the document
   * @param userSub - The subject identifier of the user (authenticated)
   * @param sharedToken - Optional share link token for guest access
   * @throws {ForbiddenException} When access is denied for any reason
   *
   * @remarks
   * For authenticated users: checks collaborator status
   * For guest users: validates share link expiration, usage limits, and document matching
   */
  async ensureCanJoin(
    documentId: string,
    userSub: string,
    sharedToken?: string,
  ) {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({
        where: { documentId, userSub },
      });
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
      if (shareLink.documentId !== documentId) {
        throw new ForbiddenException('Enlace no válido para este documento');
      }

      return;
    }

    throw new ForbiddenException('Acceso no autorizado');
  }

  /**
   * Validates if a user has edit permissions for a document
   *
   * @param documentId - The unique identifier of the document
   * @param userSub - The subject identifier of the user (authenticated)
   * @param sharedToken - Optional share link token for guest access
   * @throws {ForbiddenException} When edit access is denied
   *
   * @remarks
   * For authenticated users: requires collaborator role of 'editor' or higher
   * For guest users: requires share link with minRole of 'editor'
   */
  async ensureCanEdit(
    documentId: string,
    userSub: string,
    sharedToken?: string,
  ) {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({
        where: { documentId, userSub },
      });
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
      if (shareLink.documentId !== documentId) {
        throw new ForbiddenException('Enlace no válido para este documento');
      }
      if (shareLink.minRole !== 'editor') {
        throw new ForbiddenException('Solo lectura - Enlace de solo lectura');
      }
      return;
    }
  }

  /**
   * Retrieves the permission level for a user/document combination
   *
   * @param documentId - The unique identifier of the document
   * @param userSub - Optional subject identifier for authenticated users
   * @param sharedToken - Optional share link token for guest access
   * @returns 'read' for read-only access, 'edit' for edit access
   *
   * @remarks
   * Defaults to 'read' if no valid credentials are provided
   */
  async getPermissions(
    documentId: string,
    userSub?: string,
    sharedToken?: string,
  ): Promise<'read' | 'edit'> {
    // Usuario autenticado
    if (userSub && !sharedToken) {
      const collab = await this.collabRepo.findOne({
        where: { documentId, userSub },
      });
      return collab?.role === 'editor' ? 'edit' : 'read';
    }

    // Invitado via token
    if (sharedToken) {
      const shareLink = await this.shareLinkRepo.findOne({
        where: { slug: sharedToken, isActive: true },
      });

      if (!shareLink || shareLink.documentId !== documentId) {
        return 'read';
      }

      return shareLink.minRole === 'editor' ? 'edit' : 'read';
    }

    return 'read';
  }

  /**
   * Increments the usage count for a share link (once per session)
   *
   * @param slug - The unique slug identifier of the share link
   *
   * @remarks
   * Uses an in-memory set to prevent duplicate increments within the same service instance
   * Only increments if the share link is active and hasn't reached its usage limit
   */
  async incrementShareUseOnce(slug: string) {
    if (this.alreadyCounted.has(slug)) return;
    const link = await this.shareLinkRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!link) return;
    if (link.maxUses && link.uses >= link.maxUses) return;
    await this.shareLinkRepo.increment({ slug }, 'uses', 1);
    this.alreadyCounted.add(slug);
  }

  /**
   * Retrieves the current snapshot of a document
   *
   * @param documentId - The unique identifier of the document
   * @returns Object containing document data and current version
   * @throws {NotFoundException} When document is not found
   */
  async getSnapshot(documentId: string) {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Documento no existe');
    return { data: (doc as any).data, version: (doc as any).version };
  }

  /**
   * Applies operations to a document with optimistic locking
   *
   * @param documentId - The unique identifier of the document
   * @param version - The expected current version for optimistic locking
   * @param ops - The operations to apply to the document
   * @param actor - Identifier of the user performing the operation
   * @param isGuest - Whether the actor is a guest user
   * @returns Object containing new version and applied operations
   * @throws {NotFoundException} When document is not found
   * @throws {ConflictException} When version mismatch occurs
   *
   * @remarks
   * Executes within a transaction to ensure atomicity
   * Uses optimistic locking to prevent concurrent modification conflicts
   */
  async applyOps(
    documentId: string,
    version: number,
    ops: any,
    actor: string,
    isGuest: boolean = false,
  ) {
    return this.ds.transaction(async (manager) => {
      const current = await manager.findOne(Document, {
        where: { id: documentId },
      });
      if (!current) throw new NotFoundException('Documento no existe');
      if ((current as any).version !== version)
        throw new ConflictException('Version conflict');

      const nextData = this.applyOpsPure((current as any).data, ops);
      const nextVersion = version + 1;

      const res = await manager
        .createQueryBuilder()
        .update(Document)
        .set({
          data: nextData,
          version: nextVersion,
        })
        .where('id = :id AND version = :version', { id: documentId, version })
        .returning('*')
        .execute();

      if (res.affected !== 1)
        throw new ConflictException('Optimistic lock failed');

      return { version: nextVersion, appliedOps: ops };
    });
  }

  /**
   * Applies operations to document data (pure function)
   *
   * @param data - Current document data
   * @param ops - Operations to apply
   * @returns New document data with operations applied
   *
   * @remarks
   * Supports various operation types:
   * - Object merge operations
   * - Node array updates
   * - Edge array updates
   * - Title updates
   */
  private applyOpsPure(data: any, ops: any): any {
    // Implementación mejorada para merge seguro
    if (ops.apply && typeof ops.apply === 'object') {
      return { ...data, ...ops.apply };
    }

    // Soporte para operaciones específicas
    if (ops.nodes && Array.isArray(ops.nodes)) {
      return { ...data, nodes: ops.nodes };
    }

    if (ops.edges && Array.isArray(ops.edges)) {
      return { ...data, edges: ops.edges };
    }

    if (typeof ops.title === 'string') {
      return { ...data, title: ops.title };
    }

    return data; // No changes
  }
}
