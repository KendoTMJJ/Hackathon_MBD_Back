// src/diagrams/documents/documents.service.ts
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

@Injectable()
export class DocumentsService {
  private docs: Repository<Document>;
  private projects: Repository<Project>;
  private cols: Repository<Collaborator>;
  private snaps: Repository<Snapshot>;

  constructor(private readonly ds: DataSource) {
    this.docs = ds.getRepository(Document);
    this.projects = ds.getRepository(Project);
    this.cols = ds.getRepository(Collaborator);
    this.snaps = ds.getRepository(Snapshot);
  }

  // ---------- CRUD ----------
  async create(dto: CreateDocumentDto, userSub: string): Promise<Document> {
    const project = await this.projects.findOne({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerSub !== userSub) throw new ForbiddenException();

    return this.ds.transaction(async (m) => {
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

  async get(id: string, userSub: string): Promise<Document> {
    await this.canRead(id, userSub);
    const doc = await this.docs.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  listByProject(projectId: string, userSub: string): Promise<Document[]> {
    // Permite si es owner del proyecto o colaborador del documento
    return this.docs
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.cod_project = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.cod_document AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.project_id = :projectId', { projectId })
      .andWhere('(p.owner_sub = :userSub OR c.cod_collaborator IS NOT NULL)', {
        userSub,
      })
      .orderBy('d.updated_at', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    userSub: string,
  ): Promise<Document> {
    await this.canEdit(id, userSub);

    // UPDATE atómico con lock optimista y RETURNING *
    const res = await this.docs
      .createQueryBuilder()
      .update(Document)
      .set({
        data: dto.data,
        title: dto.title,
        version: () => `"version" + 1`,
        updatedAt: () => 'NOW()',
      })
      .where('cod_document = :id AND "version" = :version', {
        id,
        version: dto.version,
      })
      .returning('*')
      .execute();

    const updated = res.raw[0] as Document | undefined;
    if (!updated) throw new ConflictException('Version mismatch');

    // Snapshot best-effort (no bloquea la respuesta)
    this.snaps
      .insert({ documentId: id, version: updated.version, data: dto.data })
      .catch(() => void 0);

    return updated;
  }

  async cloneFromTemplate(
    templateId: string,
    projectId: string,
    title: string,
    userSub: string,
  ): Promise<Document> {
    const tpl = await this.get(templateId, userSub); // get() ya garantiza no-null
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

  async listCollaborators(
    id: string,
    userSub: string,
  ): Promise<Collaborator[]> {
    await this.canRead(id, userSub);
    return this.cols.find({ where: { documentId: id } });
  }

  async remove(id: string, userSub: string): Promise<void> {
    await this.canDelete(id, userSub);

    // Si no hay cascadas en FK, borramos explícitamente
    await this.ds.transaction(async (m) => {
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

  // --- permisos ---

  private async canDelete(id: string, userSub: string): Promise<void> {
    // Requiere ser owner del proyecto o owner del documento
    const ok = await this.docs
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.cod_project = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.cod_document AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.cod_document = :id', { id })
      .andWhere(
        "(p.owner_sub = :userSub OR (c.cod_collaborator IS NOT NULL AND c.role_collab = 'owner'))",
        { userSub },
      )
      .getOne();

    if (!ok) throw new ForbiddenException();
  }

  // ---------- permisos ----------
  private async canRead(id: string, userSub: string): Promise<void> {
    const ok = await this.docs
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.cod_project = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.cod_document AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.cod_document = :id', { id })
      .andWhere('(p.owner_sub = :userSub OR c.cod_collaborator IS NOT NULL)', {
        userSub,
      })
      .getOne();
    if (!ok) throw new ForbiddenException();
  }

  private async canEdit(id: string, userSub: string): Promise<void> {
    const ok = await this.docs
      .createQueryBuilder('d')
      .leftJoin(Project, 'p', 'p.cod_project = d.project_id')
      .leftJoin(
        Collaborator,
        'c',
        'c.document_id = d.cod_document AND c.user_sub = :userSub',
        { userSub },
      )
      .where('d.cod_document = :id', { id })
      .andWhere(
        "(p.owner_sub = :userSub OR (c.cod_collaborator IS NOT NULL AND c.role_collab IN ('owner','editor')))",
        { userSub },
      )
      .getOne();
    if (!ok) throw new ForbiddenException();
  }
}
