// tecnologies.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    // Si no enviaron body, corta con 400
    if (!dto) throw new BadRequestException('Body requerido');

    // filtra undefined/null
    const partial = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined && v !== null),
    );

    if (Object.keys(partial).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }

    const entity = await this.repo.preload({ id, ...partial });
    if (!entity) throw new NotFoundException('Tecnologie no encontrada');
    return this.repo.save(entity);
  }

  async delete(id: string) {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { deleted: true, id };
  }

  async getRequirementsBySubzone(zone?: ZoneKind, subzones?: string[]) {
    const ZONE_PREFIX: Record<ZoneKind, string> = {
      cloud: 'cloud-',
      dmz: 'dmz-',
      lan: 'lan-',
      datacenter: 'dc-',
      ot: 'ot-',
    };

    const qb = this.repo
      .createQueryBuilder('t')
      .select(['t.name', 't.allowedZones', 't.allowedSubzones']);

    // (opcional) si prefieres filtrar en SQL por zona, ajusta al nombre real de la columna
    // if (zone) qb.andWhere(':z = ANY(t.allowed_zones)', { z: zone });

    const rows = await qb.getMany();

    const filterSet = subzones ? new Set(subzones) : null;
    const map: Record<string, string[]> = {};

    for (const t of rows) {
      const subs: string[] = Array.isArray(t.allowedSubzones)
        ? t.allowedSubzones
        : [];

      for (const subId of subs) {
        if (zone) {
          const pref = ZONE_PREFIX[zone];
          if (!subId.startsWith(pref)) continue;
        }
        if (filterSet && !filterSet.has(subId)) continue;

        const techName = String(t.name ?? '').trim();
        if (!techName) continue;

        if (!map[subId]) map[subId] = [];
        if (
          !map[subId].some((x) => x.toLowerCase() === techName.toLowerCase())
        ) {
          map[subId].push(techName);
        }
      }
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.localeCompare(b, 'es'));
    }
    return map;
  }
}
