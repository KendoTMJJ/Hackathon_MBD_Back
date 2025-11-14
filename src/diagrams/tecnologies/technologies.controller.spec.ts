import { Test, TestingModule } from '@nestjs/testing';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';

describe('TecnologiesController', () => {
  let controller: TechnologiesController;

  // Mocked service with predefined return values for controller tests
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

  /**
   * Ensures that the controller correctly returns the created entity
   * when delegating to the service's create() method.
   */
  it('create -> returns created entity', async () => {
    const dto = {} as any;
    expect(await controller.create(dto)).toEqual({ id: '1' });
  });

  /**
   * Ensures that findAll() returns the list provided by the service.
   */
  it('findAll -> returns list', async () => {
    expect(
      await controller.findAll(undefined, undefined, undefined, 100, 0),
    ).toEqual([]);
  });

  /**
   * Ensures that getOne() returns the entity retrieved by the service.
   */
  it('findOne -> returns entity', async () => {
    expect(await controller.getOne('1')).toEqual({ id: '1' });
  });
});
