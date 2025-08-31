// tecnologies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tecnologie, ZoneKind } from '../../entities/tecnologie/tecnologie';
import { CreateTecnologieDto } from './dto/create-tecnologie.dto';
import { UpdateTecnologieDto } from './dto/update-tecnologie.dto';

@Injectable()
export class TecnologiesService {
  constructor(
    @InjectRepository(Tecnologie) private readonly repo: Repository<Tecnologie>,
  ) {}

  create(dto: CreateTecnologieDto) {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity);
  }

  // ✅ versión completa con filtros del mock + paginación
  async findAll(
    zone?: ZoneKind,
    subzone?: string,
    q?: string,
    limit = 100,
    offset = 0,
  ) {
    const qb = this.repo.createQueryBuilder('t');

    if (zone) {
      // Postgres: comparar contra array de texto
      qb.andWhere(':z = ANY(t.allowed_zones)', { z: zone });
    }
    if (subzone) {
      qb.andWhere(':sz = ANY(t.allowed_subzones)', { sz: subzone });
    }

    if (q && q.trim()) {
      const like = `%${q.toLowerCase()}%`;
      // name / description / provider
      qb.andWhere(
        `(LOWER(t.name) LIKE :q OR LOWER(t.description) LIKE :q OR LOWER(t.provider) LIKE :q
          OR EXISTS (
            SELECT 1 FROM unnest(t.tags) tag WHERE LOWER(tag) LIKE :q
          )
        )`,
        { q: like },
      );
    }

    qb.orderBy('t.name', 'ASC').take(limit).skip(offset);

    return qb.getMany();
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Tecnología no encontrada');
    return entity;
  }

  findByName(name: string) {
    return this.repo.findOne({ where: { name } });
  }

  async update(id: string, dto: UpdateTecnologieDto) {
    await this.repo.update(id, dto as any);
    return this.findOne(id);
  }

  async delete(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { deleted: true, id };
  }
}
