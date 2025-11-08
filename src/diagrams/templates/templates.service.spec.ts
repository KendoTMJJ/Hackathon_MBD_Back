import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { Template } from 'src/entities/template/template';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let repo: jest.Mocked<Repository<Template>>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Template>>;

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
    createQueryRunner: jest.fn(),
  } as unknown as DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Template),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    repo = mockRepo;
  });

  it('create -> debe crear y devolver plantilla', async () => {
    const dto = { title: 'A', kind: 'basic', data: {}, version: 1 };
    const tpl = { id: '1', ...dto } as Template;

    repo.create.mockReturnValue(tpl);
    repo.save.mockResolvedValue(tpl);

    const result = await service.create(dto as any, 'user1');
    expect(result).toEqual(tpl);
  });

  it('get -> lanza NotFoundException si no existe', async () => {
    repo.findOne.mockResolvedValue(undefined as any);
    await expect(service.get('nope')).rejects.toThrow(NotFoundException);
  });

  it('update -> lanza ConflictException si version no coincide', async () => {
    const qbMock: any = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [] }),
    };
    repo.createQueryBuilder.mockReturnValue(qbMock);
    await expect(
      service.update('id', { version: 1, data: {}, title: 'x' } as any),
    ).rejects.toThrow(ConflictException);
  });
});
