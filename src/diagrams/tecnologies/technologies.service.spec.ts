import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TechnologiesService } from './technologies.service';
import { Technology } from 'src/entities/tecnologie/tecnology';
import { mockRepository } from 'test/utils/mock-repo';
import { createMockQueryBuilder } from 'test/utils/mock-query-builder';

describe('TechnologiesService', () => {
  let service: TechnologiesService;
  let mockRepo: ReturnType<typeof mockRepository>;
  let mockDataSource: any;

  beforeEach(async () => {
    mockRepo = mockRepository();
    mockRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder());

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

  it('create -> guarda y devuelve entidad', async () => {
    const dto = { name: 'NodeJS' };
    const entity = { id: '1', ...dto } as Technology;

    mockRepo.create.mockReturnValue(entity);
    mockRepo.save.mockResolvedValue(entity);

    const result = await service.create(dto as any);

    expect(mockRepo.create).toHaveBeenCalledWith(dto);
    expect(mockRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  it('findOne -> lanza NotFoundException si no existe', async () => {
    mockRepo.findOne.mockResolvedValue(undefined);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});
