import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

/**
 * Unit tests for TemplatesController.
 * These tests validate that the controller properly delegates
 * to the TemplatesService and returns its results.
 */
describe('TemplatesController', () => {
  let controller: TemplatesController;

  /**
   * Mock service implementing the same methods as TemplatesService.
   * Each method returns predictable values for assertion.
   */
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: '1' }),
    get: jest.fn().mockResolvedValue({ id: '1' }),
    list: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    archive: jest.fn().mockResolvedValue({}),
    unarchive: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    /**
     * Create a testing module with the controller
     * and override TemplatesService with mockService.
     */
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [{ provide: TemplatesService, useValue: mockService }],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  /**
   * Ensures the controller's create method forwards the correct arguments
   * to the service and returns its result.
   */
  it('create -> returns the service result', async () => {
    const dto = { title: 'x' } as any;
    const req: any = { user: { sub: 'auth0|1' } };
    const r = await controller.create(dto, req);

    expect(r).toEqual({ id: '1' });
    expect(mockService.create).toHaveBeenCalledWith(dto, 'auth0|1');
  });

  /**
   * Ensures that get() returns the template provided by the service.
   */
  it('get -> returns template', async () => {
    expect(await controller.get('1')).toEqual({ id: '1' });
  });

  /**
   * Ensures that list() returns the list provided by the service.
   */
  it('list -> returns list', async () => {
    expect(await controller.list(false)).toEqual([]);
  });
});
