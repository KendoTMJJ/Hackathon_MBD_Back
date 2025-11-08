import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Document } from '../../entities/document/document';
import { Project } from '../../entities/project/project';
import { Collaborator } from '../../entities/collaborator/collaborator';
import { Snapshot } from '../../entities/snapshot/snapshot';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

/**
 * Service responsible for document management operations
 *
 * @remarks
 * Handles CRUD operations, cloning, version control, and permission management for documents.
 * Implements comprehensive access control with role-based permissions (owner, editor, reader).
 * Supports optimistic locking for concurrent updates and automatic snapshot creation.
 */
@Injectable()
export class DocumentsService {
  private readonly documentRepository: Repository<Document>;
  private readonly projectRepository: Repository<Project>;
  private readonly collaboratorRepository: Repository<Collaborator>;
  private readonly snapshotRepository: Repository<Snapshot>;

  /**
   * Initializes the DocumentsService with data source dependency
   *
   * @param dataSource - TypeORM DataSource for database operations and transactions
   */
  constructor(private readonly dataSource: DataSource) {
    this.documentRepository = dataSource.getRepository(Document);
    this.projectRepository = dataSource.getRepository(Project);
    this.collaboratorRepository = dataSource.getRepository(Collaborator);
    this.snapshotRepository = dataSource.getRepository(Snapshot);
  }

  // ---------- CRUD Operations ----------

  /**
   * Creates a new document in the specified project
   *
   * @param dto - Data transfer object containing document creation parameters
   * @param userSub - The subject identifier of the user creating the document
   * @returns The newly created document
   * @throws {NotFoundException} When the specified project is not found
   * @throws {ForbiddenException} When user is not the owner of the project
   *
   * @remarks
   * Automatically assigns the creator as the document owner collaborator.
   * Executes within a transaction to ensure data consistency.
   */
  async create(dto: CreateDocumentDto, userSub: string): Promise<Document> {
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerSub !== userSub) throw new ForbiddenException();

    return this.dataSource.transaction(async (m) => {
      const dRepo = m.getRepository(Document);
      const cRepo = m.getRepository(Collaborator);

      const doc = await dRepo.save(
        dRepo.create({
          title: dto.title,
          kind: dto.kind,
          data: dto.data,
          projectId: dto.projectId,
          templateId: dto.templateId ?? null,
          createdBy: userSub,
        }),
      );

      await cRepo.save(
        cRepo.create({ documentId: doc.id, userSub, role: 'owner' }),
      );

      return doc;
    });
  }

  /**
   * Retrieves a document by ID with read permission validation
   *
   * @param id - The unique identifier of the document
   * @param userSub - The subject identifier of the user requesting access
   * @returns The requested document
   * @throws {NotFoundException} When document with the given ID is not found
   * @throws {ForbiddenException} When user lacks read permission for the document
   */
  async get(id: string, userSub: string): Promise<Document> {
    await this.canRead(id, userSub);
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  /**
   * Lists all documents in a project accessible to the user
   *
   * @param projectId - The unique identifier of the project
   * @param userSub - The subject identifier of the user requesting access
   * @returns Array of documents ordered by update date (descending)
   *
   * @remarks
   * Returns documents where the user is either the project owner or a collaborator on the document
   */
  listByProject(projectId: string, userSub: string): Promise<Document[]> {
    return this.documentRepository
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.project_id = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.document_id AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.project_id = :projectId', { projectId })
      .andWhere('(p.owner_sub = :userSub OR c.collaborator_id IS NOT NULL)', {
        userSub,
      })
      .orderBy('d.updated_at', 'DESC')
      .getMany();
  }

  /**
   * Updates a document with optimistic locking and version control
   *
   * @param id - The unique identifier of the document to update
   * @param dto - Data transfer object containing update parameters
   * @param userSub - The subject identifier of the user performing the update
   * @returns The updated document
   * @throws {ForbiddenException} When user lacks edit permission for the document
   * @throws {ConflictException} When version mismatch occurs (optimistic locking)
   *
   * @remarks
   * Uses optimistic locking to prevent concurrent update conflicts.
   * Automatically creates snapshots for version history (best-effort, non-blocking).
   */
  async update(
    id: string,
    dto: UpdateDocumentDto,
    userSub: string,
  ): Promise<Document> {
    await this.canEdit(id, userSub);

    const res = await this.documentRepository
      .createQueryBuilder()
      .update(Document)
      .set({
        data: dto.data,
        title: dto.title,
        version: () => `"version" + 1`,
        updatedAt: () => 'NOW()',
      })
      .where('document_id = :id AND "version" = :version', {
        id,
        version: dto.version,
      })
      .returning('*')
      .execute();

    const updated = res.raw[0] as Document | undefined;
    if (!updated) throw new ConflictException('Version mismatch');

    // Snapshot best-effort (no bloquea la respuesta)
    this.snapshotRepository
      .insert({ documentId: id, version: updated.version, data: dto.data })
      .catch(() => void 0);

    return updated;
  }

  /**
   * Clones a template document to create a new diagram
   *
   * @param templateId - The unique identifier of the template document to clone
   * @param projectId - The unique identifier of the target project
   * @param title - The title for the new document
   * @param userSub - The subject identifier of the user performing the clone
   * @returns The newly created document clone
   * @throws {BadRequestException} When source document is not a template
   * @throws {NotFoundException} When template document is not found
   * @throws {ForbiddenException} When user lacks read permission for the template
   *
   * @remarks
   * Creates a deep copy of the template data to avoid reference sharing.
   */
  async cloneFromTemplate(
    templateId: string,
    projectId: string,
    title: string,
    userSub: string,
  ): Promise<Document> {
    const tpl = await this.get(templateId, userSub);
    if (tpl.kind !== 'template') {
      throw new BadRequestException('Source document is not a template');
    }

    // Copia defensiva del JSON (evita compartir referencias)
    const dataCopy = JSON.parse(JSON.stringify(tpl.data));

    return this.create(
      { title, kind: 'diagram', data: dataCopy, projectId, templateId },
      userSub,
    );
  }

  /**
   * Lists all collaborators for a document
   *
   * @param id - The unique identifier of the document
   * @param userSub - The subject identifier of the user requesting the list
   * @returns Array of collaborators for the document
   * @throws {ForbiddenException} When user lacks read permission for the document
   */
  async listCollaborators(
    id: string,
    userSub: string,
  ): Promise<Collaborator[]> {
    await this.canRead(id, userSub);
    return this.collaboratorRepository.find({ where: { documentId: id } });
  }

  /**
   * Permanently deletes a document and its related data
   *
   * @param id - The unique identifier of the document to delete
   * @param userSub - The subject identifier of the user performing the deletion
   * @throws {NotFoundException} When document with the given ID is not found
   * @throws {ForbiddenException} When user lacks delete permission for the document
   *
   * @remarks
   * Executes within a transaction to ensure all related data (snapshots, collaborators)
   * are deleted atomically with the document.
   */
  async remove(id: string, userSub: string): Promise<void> {
    await this.canDelete(id, userSub);

    await this.dataSource.transaction(async (m) => {
      const dRepo = m.getRepository(Document);
      const cRepo = m.getRepository(Collaborator);
      const sRepo = m.getRepository(Snapshot);

      // Verifica existencia (opcional, pero útil para 404)
      const exists = await dRepo.findOne({ where: { id } });
      if (!exists) throw new NotFoundException('Document not found');

      await sRepo.delete({ documentId: id });
      await cRepo.delete({ documentId: id });
      await dRepo.delete({ id });
    });
  }

  // ---------- Permission Methods ----------

  /**
   * Validates if user has read permission for the document
   *
   * @param id - The unique identifier of the document
   * @param userSub - The subject identifier of the user to validate
   * @throws {ForbiddenException} When user lacks read permission
   *
   * @remarks
   * User must be either the project owner or a collaborator on the document
   */
  private async canRead(id: string, userSub: string): Promise<void> {
    const ok = await this.documentRepository
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.project_id = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.document_id AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.document_id = :id', { id })
      .andWhere('(p.owner_sub = :userSub OR c.collaborator_id IS NOT NULL)', {
        userSub,
      })
      .getOne();
    if (!ok) throw new ForbiddenException();
  }

  /**
   * Validates if user has edit permission for the document
   *
   * @param id - The unique identifier of the document
   * @param userSub - The subject identifier of the user to validate
   * @throws {ForbiddenException} When user lacks edit permission
   *
   * @remarks
   * User must be either the project owner or a collaborator with 'owner' or 'editor' role
   */
  private async canEdit(id: string, userSub: string): Promise<void> {
    const ok = await this.documentRepository
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.project_id = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.document_id AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.document_id = :id', { id })
      .andWhere(
        "(p.owner_sub = :userSub OR (c.collaborator_id IS NOT NULL AND c.role IN ('owner','editor')))",
        { userSub },
      )
      .getOne();
    if (!ok) throw new ForbiddenException();
  }

  /**
   * Validates if user has delete permission for the document
   *
   * @param id - The unique identifier of the document
   * @param userSub - The subject identifier of the user to validate
   * @throws {ForbiddenException} When user lacks delete permission
   *
   * @remarks
   * User must be either the project owner or a collaborator with 'owner' role
   */
  private async canDelete(id: string, userSub: string): Promise<void> {
    const ok = await this.documentRepository
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.project_id = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.document_id AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.document_id = :id', { id })
      .andWhere(
        "(p.owner_sub = :userSub OR (c.collaborator_id IS NOT NULL AND c.role = 'owner'))",
        { userSub },
      )
      .getOne();

    if (!ok) throw new ForbiddenException();
  }
}
