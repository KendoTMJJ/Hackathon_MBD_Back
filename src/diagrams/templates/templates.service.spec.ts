import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { Template } from 'src/entities/template/template';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Unit tests for TemplatesService.
 * These tests verify service behavior, exception handling,
 * and interactions with the underlying repository.
 */
describe('TemplatesService', () => {
  let service: TemplatesService;
  let repo: jest.Mocked<Repository<Template>>;

  /**
   * Mocked repository implementing the methods used internally
   * by TemplatesService. Each method is a Jest mock to allow
   * controlled responses and interaction assertions.
   */
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Template>>;

  /**
   * Mocked DataSource returning the mocked repository.
   * Only the minimal behavior required by the service is stubbed.
   */
  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepo),
    createQueryRunner: jest.fn(),
  } as unknown as DataSource;

  beforeEach(async () => {
    /**
     * Testing module initialization where DataSource and repository
     * tokens are overridden using the mocked implementations.
     */
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

  /**
   * Ensures create() persists a new Template entity and returns it.
   */
  it('create -> should create and return template', async () => {
    const dto = { title: 'A', kind: 'basic', data: {}, version: 1 };
    const tpl = { id: '1', ...dto } as Template;

    repo.create.mockReturnValue(tpl);
    repo.save.mockResolvedValue(tpl);

    const result = await service.create(dto as any, 'user1');
    expect(result).toEqual(tpl);
  });

  /**
   * Ensures get() throws a NotFoundException when no template is found.
   */
  it('get -> throws NotFoundException if not found', async () => {
    repo.findOne.mockResolvedValue(undefined as any);
    await expect(service.get('nope')).rejects.toThrow(NotFoundException);
  });

  /**
   * Ensures update() throws a ConflictException when the version
   * check fails and the query returns no updated rows.
   */
  it('update -> throws ConflictException if version mismatch', async () => {
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
