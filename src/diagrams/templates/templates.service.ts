import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Template } from 'src/entities/template/template';

/**
 * Service responsible for template management operations
 *
 * @remarks
 * Handles CRUD operations for templates including creation, retrieval, updating,
 * archiving, unarchiving, and deletion with proper version control.
 */
@Injectable()
export class TemplatesService {
  private readonly repository: Repository<Template>;

  /**
   * Initializes the TemplatesService with data source dependency
   *
   * @param dataSource - TypeORM DataSource for database operations
   */
  constructor(private readonly dataSource: DataSource) {
    this.repository = dataSource.getRepository(Template);
  }

  /**
   * Creates a new template
   *
   * @param createTemplateDto - DTO containing template creation data
   * @param userSub - User subject identifier who creates the template
   * @returns The newly created template
   */
  async create(
    createTemplateDto: CreateTemplateDto,
    userSub: string,
  ): Promise<Template> {
    const template = this.repository.create({
      title: createTemplateDto.title,
      kind: createTemplateDto.kind,
      data: createTemplateDto.data,
      createdBy: userSub,
    });

    return this.repository.save(template);
  }

  /**
   * Retrieves a template by its ID
   *
   * @param id - The unique identifier of the template
   * @returns The found template entity
   * @throws {NotFoundException} When template with the given ID is not found
   */
  async get(id: string): Promise<Template> {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  /**
   * Lists all templates with optional archived inclusion
   *
   * @param includeArchived - Whether to include archived templates in the results
   * @returns Array of templates ordered by update date (descending)
   */
  async list(includeArchived = false): Promise<Template[]> {
    const query = this.repository
      .createQueryBuilder('t')
      .orderBy('t.updated_at', 'DESC');

    if (!includeArchived) {
      query.where('t.is_archived = FALSE');
    }

    return query.getMany();
  }

  /**
   * Updates a template with version control
   *
   * @param id - The unique identifier of the template to update
   * @param updateTemplateDto - DTO containing template update data
   * @returns The updated template entity
   * @throws {ConflictException} When version mismatch occurs (optimistic locking)
   * @throws {NotFoundException} When template with the given ID is not found
   */
  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<Template> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Template)
      .set({
        title: updateTemplateDto.title,
        data: updateTemplateDto.data,
        version: () => `"version" + 1`,
        updatedAt: () => 'NOW()',
      })
      .where('template_id = :id AND "version" = :version', {
        id,
        version: updateTemplateDto.version,
      })
      .returning('*')
      .execute();

    const updated = result.raw[0] as Template | undefined;
    if (!updated) {
      throw new ConflictException('Version mismatch');
    }
    return updated;
  }

  /**
   * Archives a template (soft delete)
   *
   * @param id - The unique identifier of the template to archive
   * @returns The archived template entity
   * @throws {NotFoundException} When template with the given ID is not found
   */
  async archive(id: string): Promise<Template> {
    return this.toggleArchive(id, true);
  }

  /**
   * Unarchives a template
   *
   * @param id - The unique identifier of the template to unarchive
   * @returns The unarchived template entity
   * @throws {NotFoundException} When template with the given ID is not found
   */
  async unarchive(id: string): Promise<Template> {
    return this.toggleArchive(id, false);
  }

  /**
   * Toggles the archive status of a template
   *
   * @param id - The unique identifier of the template
   * @param isArchived - The desired archive status
   * @returns The updated template entity
   * @throws {NotFoundException} When template with the given ID is not found
   */
  private async toggleArchive(
    id: string,
    isArchived: boolean,
  ): Promise<Template> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Template)
      .set({ isArchived, updatedAt: () => 'NOW()' })
      .where('template_id = :id', { id })
      .returning('*')
      .execute();

    const updated = result.raw[0] as Template | undefined;
    if (!updated) {
      throw new NotFoundException('Template not found');
    }
    return updated;
  }

  /**
   * Permanently deletes a template
   *
   * @param id - The unique identifier of the template to delete
   * @throws {NotFoundException} When template with the given ID is not found
   */
  async remove(id: string): Promise<void> {
    const result = await this.repository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Template not found');
    }
  }
}
