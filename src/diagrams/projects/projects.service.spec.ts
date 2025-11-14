import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from 'src/entities/project/project';
import { Repository, DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: jest.Mocked<Repository<Project>>;

  // Mocked repository to simulate TypeORM operations
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Project>>;

  // Mocked DataSource used internally by the service
  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
    createQueryRunner: jest.fn(),
  } as unknown as DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,

        // Provide a mocked DataSource to avoid using a real database connection
        {
          provide: DataSource,
          useValue: mockDataSource,
        },

        // Override the TypeORM repository for Project with the mocked version
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repo = mockRepo;
  });

  it('create → should create and save a project', async () => {
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

  it('get → should throw NotFoundException when project does not exist', async () => {
    repo.findOne.mockResolvedValue(undefined as any);

    await expect(service.get('nope', 'u')).rejects.toThrow(NotFoundException);
  });

  it('get → should throw ForbiddenException when user is not the owner', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p1',
      ownerSub: 'other',
    } as Project);

    await expect(service.get('p1', 'me')).rejects.toThrow(ForbiddenException);
  });

  it('get → should return project when user is the owner', async () => {
    const entity = { id: 'p1', ownerSub: 'me' } as Project;

    repo.findOne.mockResolvedValue(entity);

    const result = await service.get('p1', 'me');
    expect(result).toEqual(entity);
  });
});
