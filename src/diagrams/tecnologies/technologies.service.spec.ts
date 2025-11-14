import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TechnologiesService } from './technologies.service';
import { Technology } from 'src/entities/tecnologie/tecnology';
import { mockRepository } from 'test/utils/mock-repo';
import { createMockQueryBuilder } from 'test/utils/mock-query-builder';

/**
 * Unit tests for TechnologiesService.
 * These tests validate the behavior of the service by mocking
 * the repository and DataSource dependencies.
 */
describe('TechnologiesService', () => {
  let service: TechnologiesService;
  let mockRepo: ReturnType<typeof mockRepository>;
  let mockDataSource: any;

  beforeEach(async () => {
    // Create and configure mock repository, including query builder
    mockRepo = mockRepository();
    mockRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder());

    // Mock DataSource to return the mocked repository
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnologiesService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TechnologiesService>(TechnologiesService);
  });

  /**
   * Ensures that create() stores and returns the new entity correctly.
   */
  it('create -> saves and returns entity', async () => {
    const dto = { name: 'NodeJS' };
    const entity = { id: '1', ...dto } as Technology;

    mockRepo.create.mockReturnValue(entity);
    mockRepo.save.mockResolvedValue(entity);

    const result = await service.create(dto as any);

    expect(mockRepo.create).toHaveBeenCalledWith(dto);
    expect(mockRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  /**
   * Ensures that findOne() throws NotFoundException when the entity does not exist.
   */
  it('findOne -> throws NotFoundException if not found', async () => {
    mockRepo.findOne.mockResolvedValue(undefined);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});
