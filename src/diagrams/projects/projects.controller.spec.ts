import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
    list: jest.fn().mockResolvedValue([{ id: 'p1' }]),
    get: jest.fn().mockResolvedValue({ id: 'p1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('create -> usa req.user.sub y retorna proyecto', async () => {
    const req: any = { user: { sub: 'auth0|1' } };
    expect(await controller.create({ name: 'X' }['name'], req)).toEqual({
      id: 'p1',
    });
  });

  it('list -> retorna lista para user', async () => {
    const req: any = { user: { sub: 'auth0|1' } };
    expect(await controller.list(req)).toEqual([{ id: 'p1' }]);
  });

  it('get -> retorna proyecto', async () => {
    const req: any = { user: { sub: 'auth0|1' } };
    expect(await controller.get('p1', req)).toEqual({ id: 'p1' });
  });
});
