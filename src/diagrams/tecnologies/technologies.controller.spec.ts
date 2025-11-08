import { Test, TestingModule } from '@nestjs/testing';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';

describe('TecnologiesController', () => {
  let controller: TechnologiesController;
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: '1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findByName: jest.fn().mockResolvedValue(null),
    findOne: jest.fn().mockResolvedValue({ id: '1' }),
    update: jest.fn().mockResolvedValue({ id: '1' }),
    delete: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnologiesController],
      providers: [{ provide: TechnologiesService, useValue: mockService }],
    }).compile();

    controller = module.get<TechnologiesController>(TechnologiesController);
  });

  it('create -> retorna lo creado', async () => {
    const dto = {} as any;
    expect(await controller.create(dto)).toEqual({ id: '1' });
  });

  it('findAll -> retorna lista', async () => {
    expect(
      await controller.findAll(undefined, undefined, undefined, 100, 0),
    ).toEqual([]);
  });

  it('findOne -> retorna entidad', async () => {
    expect(await controller.getOne('1')).toEqual({ id: '1' });
  });
});
