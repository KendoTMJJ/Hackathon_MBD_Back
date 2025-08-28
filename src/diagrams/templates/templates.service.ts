// src/diagrams/templates/templates.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Template } from '../../entities/template/template';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  private tpls: Repository<Template>;

  constructor(private readonly ds: DataSource) {
    this.tpls = ds.getRepository(Template);
  }

  // ---------- CRUD ----------
  async create(dto: CreateTemplateDto, userSub: string): Promise<Template> {
    const tpl = this.tpls.create({
      title: dto.title,
      kind: dto.kind,
      data: dto.data,
      createdBy: userSub,
    });
    return this.tpls.save(tpl);
  }

  async get(id: string): Promise<Template> {
    const tpl = await this.tpls.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  /**
   * Lista plantillas (por defecto solo no archivadas), ordenadas por actualización descendente.
   * @param includeArchived si true, incluye archivadas
   */
  list(includeArchived = false): Promise<Template[]> {
    const qb = this.tpls
      .createQueryBuilder('t')
      .orderBy('t.updated_at', 'DESC');

    if (!includeArchived) qb.where('t.is_archived = FALSE');

    return qb.getMany();
  }

  /**
   * Actualiza usando lock optimista por versión y retorna el registro actualizado.
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    const res = await this.tpls
      .createQueryBuilder()
      .update(Template)
      .set({
        data: dto.data,
        title: dto.title,
        version: () => `"version" + 1`,
        updatedAt: () => 'NOW()',
      })
      .where('cod_template = :id AND "version" = :version', {
        id,
        version: dto.version,
      })
      .returning('*')
      .execute();

    const updated = res.raw[0] as Template | undefined;
    if (!updated) throw new ConflictException('Version mismatch');
    return updated;
  }

  /**
   * Archivado lógico (soft delete).
   */
  async archive(id: string): Promise<Template> {
    const res = await this.tpls
      .createQueryBuilder()
      .update(Template)
      .set({ isArchived: true, updatedAt: () => 'NOW()' })
      .where('cod_template = :id', { id })
      .returning('*')
      .execute();

    const updated = res.raw[0] as Template | undefined;
    if (!updated) throw new NotFoundException('Template not found');
    return updated;
  }

  /**
   * Desarchiva una plantilla.
   */
  async unarchive(id: string): Promise<Template> {
    const res = await this.tpls
      .createQueryBuilder()
      .update(Template)
      .set({ isArchived: false, updatedAt: () => 'NOW()' })
      .where('cod_template = :id', { id })
      .returning('*')
      .execute();

    const updated = res.raw[0] as Template | undefined;
    if (!updated) throw new NotFoundException('Template not found');
    return updated;
  }

  /**
   * Eliminación física. Si prefieres solo archivado, puedes omitir este método.
   */
  async remove(id: string): Promise<void> {
    const res = await this.tpls.delete(id);
    if (!res.affected) throw new NotFoundException('Template not found');
  }
}
