import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateTecnologieDto } from './dto/create-tecnologie.dto';
import { UpdateTecnologieDto } from './dto/update-tecnologie.dto';
import { Technology, ZoneType } from 'src/entities/tecnologie/tecnology';

/**
 * Service responsible for technology management operations
 *
 * @remarks
 * Handles CRUD operations for technologies including creation, retrieval, updating,
 * deletion, and requirements mapping by zones and subzones.
 */
@Injectable()
export class TecnologiesService {
  private readonly repository: Repository<Technology>;

  /**
   * Initializes the TecnologiesService with data source dependency
   *
   * @param dataSource - TypeORM DataSource for database operations
   */
  constructor(private readonly dataSource: DataSource) {
    this.repository = dataSource.getRepository(Technology);
  }

  /**
   * Creates a new technology
   *
   * @param createTecnologieDto - DTO containing technology creation data
   * @returns The newly created technology entity
   */
  async create(createTecnologieDto: CreateTecnologieDto) {
    const entity = this.repository.create(createTecnologieDto as any);
    return this.repository.save(entity);
  }

  /**
   * Retrieves all technologies with optional filtering and pagination
   *
   * @param zone - Optional zone type filter
   * @param subzone - Optional subzone filter
   * @param q - Optional search query for name, description, provider, or tags
   * @param limit - Maximum number of results to return (default: 100)
   * @param offset - Number of results to skip for pagination (default: 0)
   * @returns Array of technologies matching the criteria, ordered by name
   */
  async findAll(
    zone?: ZoneType,
    subzone?: string,
    q?: string,
    limit = 100,
    offset = 0,
  ): Promise<Technology[]> {
    const queryBuilder = this.repository.createQueryBuilder('t');

    if (zone) queryBuilder.andWhere(':z = ANY(t.allowed_zones)', { z: zone });
    if (subzone)
      queryBuilder.andWhere(':sz = ANY(t.allowed_subzones)', { sz: subzone });

    if (q?.trim()) {
      const like = `%${q.toLowerCase()}%`;
      queryBuilder.andWhere(
        `(LOWER(t.name) LIKE :q OR LOWER(t.description) LIKE :q OR LOWER(t.provider) LIKE :q
          OR EXISTS (
            SELECT 1 FROM unnest(t.tags) tag WHERE LOWER(tag) LIKE :q
          ))`,
        { q: like },
      );
    }

    queryBuilder.orderBy('t.name', 'ASC').take(limit).skip(offset);
    return queryBuilder.getMany();
  }

  /**
   * Retrieves a technology by its ID
   *
   * @param id - The unique identifier of the technology
   * @returns The found technology entity
   * @throws {NotFoundException} When technology with the given ID is not found
   */
  async findOne(id: string): Promise<Technology> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Technology not found');
    return entity;
  }

  /**
   * Retrieves a technology by its name
   *
   * @param name - The name of the technology to find
   * @returns The found technology entity or null if not found
   */
  async findByName(name: string): Promise<Technology | null> {
    return this.repository.findOne({ where: { name } });
  }

  /**
   * Updates a technology with the given ID
   *
   * @param id - The unique identifier of the technology to update
   * @param updateTecnologieDto - DTO containing technology update data
   * @returns The updated technology entity
   * @throws {BadRequestException} When DTO is empty or contains no valid fields
   * @throws {NotFoundException} When technology with the given ID is not found
   */
  async update(
    id: string,
    updateTecnologieDto: UpdateTecnologieDto,
  ): Promise<Technology> {
    if (!updateTecnologieDto)
      throw new BadRequestException('Request body is required');

    const partial = this.filterValidFields(updateTecnologieDto);
    if (Object.keys(partial).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const entity = await this.repository.preload({ id, ...partial });
    if (!entity) throw new NotFoundException('Technology not found');

    return this.repository.save(entity);
  }

  /**
   * Filters out undefined and null values from DTO
   *
   * @param dto - The data transfer object to filter
   * @returns Object containing only valid fields
   */
  private filterValidFields(dto: object): Record<string, any> {
    return Object.fromEntries(
      Object.entries(dto).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    );
  }

  /**
   * Deletes a technology by its ID
   *
   * @param id - The unique identifier of the technology to delete
   * @returns Confirmation object with deletion status and ID
   * @throws {NotFoundException} When technology with the given ID is not found
   */
  async delete(id: string): Promise<{ deleted: boolean; id: string }> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true, id };
  }

  /**
   * Gets technology requirements mapped by subzone
   *
   * @param zone - Optional zone type to filter requirements
   * @param subzones - Optional array of specific subzones to include
   * @returns Object mapping subzone IDs to arrays of technology names
   */
  async getRequirementsBySubzone(
    zone?: ZoneType,
    subzones?: string[],
  ): Promise<Record<string, string[]>> {
    const queryBuilder = this.repository
      .createQueryBuilder('t')
      .select(['t.name', 't.allowedZones', 't.allowedSubzones']);

    const rows = await queryBuilder.getMany();
    const filterSet = subzones ? new Set(subzones) : null;

    const map: Record<string, string[]> = {};
    const prefixMap: Record<ZoneType, string> = {
      cloud: 'cloud-',
      dmz: 'dmz-',
      lan: 'lan-',
      datacenter: 'dc-',
      ot: 'ot-',
    };

    for (const technology of rows) {
      const subzonesList = Array.isArray(technology.allowedSubzones)
        ? technology.allowedSubzones
        : [];

      for (const subzoneId of subzonesList) {
        if (zone && !subzoneId.startsWith(prefixMap[zone])) continue;
        if (filterSet && !filterSet.has(subzoneId)) continue;

        const technologyName = technology.name?.trim();
        if (!technologyName) continue;

        const list = (map[subzoneId] ||= []);
        if (
          !list.some(
            (existingName) =>
              existingName.toLowerCase() === technologyName.toLowerCase(),
          )
        ) {
          list.push(technologyName);
        }
      }
    }

    // Sort technology names alphabetically for each subzone
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.localeCompare(b, 'es'));
    }

    return map;
  }
}
