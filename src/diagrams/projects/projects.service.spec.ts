import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from 'src/entities/project/project';
import { Repository, DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: jest.Mocked<Repository<Project>>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Project>>;

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
    createQueryRunner: jest.fn(),
  } as unknown as DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repo = mockRepo;
  });

  it('create -> guarda proyecto', async () => {
    const entity = { id: '1', name: 'Test', ownerSub: 'user1' } as Project;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    const result = await service.create('Test', 'user1');

    expect(repo.create).toHaveBeenCalledWith({
      name: 'Test',
      ownerSub: 'user1',
    });
    expect(repo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  it('get -> lanza NotFoundException si no existe', async () => {
    repo.findOne.mockResolvedValue(undefined as any);
    await expect(service.get('nope', 'u')).rejects.toThrow(NotFoundException);
  });

  it('get -> lanza ForbiddenException si no es dueño', async () => {
    repo.findOne.mockResolvedValue({ id: 'p1', ownerSub: 'other' } as Project);
    await expect(service.get('p1', 'me')).rejects.toThrow(ForbiddenException);
  });

  it('get -> devuelve proyecto si es dueño', async () => {
    const entity = { id: 'p1', ownerSub: 'me' } as Project;
    repo.findOne.mockResolvedValue(entity);
    const result = await service.get('p1', 'me');
    expect(result).toEqual(entity);
  });
});
