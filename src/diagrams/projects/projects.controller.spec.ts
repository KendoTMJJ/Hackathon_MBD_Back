import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  // Mock implementation of the ProjectsService
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
    list: jest.fn().mockResolvedValue([{ id: 'p1' }]),
    get: jest.fn().mockResolvedValue({ id: 'p1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],

      // Replace the real service with the mocked version
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('create → should use req.user.sub and return a project', async () => {
    const req: any = { user: { sub: 'auth0|1' } };

    expect(await controller.create({ name: 'X' }['name'], req)).toEqual({
      id: 'p1',
    });
  });

  it('list → should return a list of projects for the user', async () => {
    const req: any = { user: { sub: 'auth0|1' } };

    expect(await controller.list(req)).toEqual([{ id: 'p1' }]);
  });

  it('get → should return a project by id', async () => {
    const req: any = { user: { sub: 'auth0|1' } };

    expect(await controller.get('p1', req)).toEqual({ id: 'p1' });
  });
});
