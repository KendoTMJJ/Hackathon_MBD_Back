import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tecnologie, ZoneKind } from '../../entities/tecnologie/tecnologie';
import { CreateTecnologieDto } from './dto/create-tecnologie.dto';
import { UpdateTecnologieDto } from './dto/update-tecnologie.dto';

@Injectable()
export class TecnologiesService {
  constructor(@InjectRepository(Tecnologie) private readonly repo: Repository<Tecnologie>,
  ) {}

  create(dto: CreateTecnologieDto) {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity);
  }

  findAll(zone?: ZoneKind, subzone?: string) {
  const qb = this.repo.createQueryBuilder('t');
  if (zone)    qb.andWhere(':z = ANY(t.allowed_zones)', { z: zone });
  if (subzone) qb.andWhere(':sz = ANY(t.allowed_subzones)', { sz: subzone });
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

