import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../../entities/project/project';

@Injectable()
export class ProjectsService {
  private repo: Repository<Project>;
  constructor(private ds: DataSource) {
    this.repo = ds.getRepository(Project);
  }

  create(name: string, ownerSub: string) {
    return this.repo.save(this.repo.create({ name, ownerSub }));
  }
  list(ownerSub: string) {
    return this.repo.find({
      where: { ownerSub },
      order: { updatedAt: 'DESC' },
    });
  }
  async get(id: string, userSub: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Project not found');
    if (p.ownerSub !== userSub) throw new ForbiddenException();
    return p;
  }
}
