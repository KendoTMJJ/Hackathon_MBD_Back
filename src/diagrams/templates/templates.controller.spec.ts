import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

describe('TemplatesController', () => {
  let controller: TemplatesController;
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [{ provide: TemplatesService, useValue: mockService }],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  it('create -> devuelve lo que retorna el service', async () => {
    const dto = { title: 'x' } as any;
    const req: any = { user: { sub: 'auth0|1' } };
    const r = await controller.create(dto, req);
    expect(r).toEqual({ id: '1' });
    expect(mockService.create).toHaveBeenCalledWith(dto, 'auth0|1');
  });

  it('get -> devuelve plantilla', async () => {
    expect(await controller.get('1')).toEqual({ id: '1' });
  });

  it('list -> devuelve lista', async () => {
    expect(await controller.list(false)).toEqual([]);
  });
});
