import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppTestModule } from 'src/app-test/app-test.module';
import { TechnologiesService } from 'src/diagrams/tecnologies/technologies.service';

/**
 * End-to-End (E2E) test suite for the TechnologiesController.
 *
 * This suite spins up a full NestJS application instance using AppTestModule,
 * applies global validation pipes, and tests REST endpoints using Supertest.
 *
 * The goal is to validate:
 * - Request/response behavior
 * - Validation errors
 * - Controller/service integration
 * - Database interactions through the test module
 */
describe('TechnologiesController (E2E)', () => {
  let app: INestApplication;
  let service: TechnologiesService;
  let createdTechnologyId: string;

  /**
   * Bootstraps a full Nest application before running E2E tests.
   * Global validation pipes are applied to match real-world behavior.
   */
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    service = moduleFixture.get<TechnologiesService>(TechnologiesService);
  });

  /**
   * Closes the NestJS application once the entire suite finishes.
   */
  afterAll(async () => {
    await app.close();
  });

  describe('POST /technologies', () => {
    /**
     * Valid DTO containing all required and optional fields.
     */
    const validCreateDto = {
      name: 'Firewall ASA',
      imageUrl: 'https://example.com/image.jpg',
      description: 'Protege la red perimetral',
      provider: ['Cisco'],
      allowedZones: ['dmz'],
      allowedSubzones: [
        'email-gateway-aas',
        'dc-email-and-protection',
        'dc-intranet',
        'dmz-email-gateway',
      ],
      tags: ['security', 'firewall', 'network'],
    };

    /**
     * Ensures a technology can be created successfully,
     * verifying that the API returns the expected structure.
     */
    it('should create a new technology', async () => {
      const response = await request(app.getHttpServer())
        .post('/technologies')
        .send(validCreateDto);

      console.log(response.body);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validCreateDto.name);
      expect(response.body.description).toBe(validCreateDto.description);
      expect(response.body.provider).toEqual(validCreateDto.provider);
      expect(response.body.allowedZones).toEqual(validCreateDto.allowedZones);

      createdTechnologyId = response.body.id;
    });

    /**
     * Ensures validation rejects incomplete DTOs.
     */
    it('should return 400 when creating with missing required fields', async () => {
      const incompleteDto = { name: 'Test Tech', provider: ['Cisco'] };

      await request(app.getHttpServer())
        .post('/technologies')
        .send(incompleteDto)
        .expect(400);
    });

    /**
     * Validates that the API accepts minimal valid DTO input,
     * ensuring optional fields behave as expected.
     */
    it('should create technology with minimal required fields', async () => {
      const minimalDto = {
        name: 'Minimal Tech',
        description: 'Descripción mínima',
        provider: ['Cisco'],
        allowedZones: ['cloud'],
      };

      const response = await request(app.getHttpServer())
        .post('/technologies')
        .send(minimalDto)
        .expect(201);

      expect(response.body.name).toBe(minimalDto.name);
      expect(response.body.description).toBe(minimalDto.description);
      expect(response.body.provider).toEqual(minimalDto.provider);
      expect(response.body.allowedZones).toEqual(minimalDto.allowedZones);
    });
  });

  describe('GET /technologies', () => {
    /**
     * Ensures the route returns an array of technologies.
     */
    it('should return all technologies', async () => {
      const response = await request(app.getHttpServer())
        .get('/technologies')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /technologies/by-name/:name', () => {
    /**
     * Ensures a technology can be retrieved by name.
     */
    it('should return technology by name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/technologies/by-name/${encodeURIComponent('Firewall ASA')}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Firewall ASA');
    });

    /**
     * Ensures not-found responses work for non-existing names.
     */
    it('should return 404 for non-existent technology name', async () => {
      await request(app.getHttpServer())
        .get('/technologies/by-name/non-existent-tech')
        .expect(404);
    });
  });

  describe('GET /technologies/by-id/:id', () => {
    /**
     * Retrieves a previously created technology by ID.
     */
    it('should return technology by ID', async () => {
      if (createdTechnologyId) {
        const response = await request(app.getHttpServer())
          .get(`/technologies/by-id/${createdTechnologyId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', createdTechnologyId);
      }
    });

    /**
     * Ensures invalid UUID formats trigger validation errors.
     */
    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/technologies/by-id/invalid-uuid')
        .expect(400);
    });

    /**
     * Ensures the API correctly reports missing entries.
     */
    it('should return 404 for non-existent technology ID', async () => {
      await request(app.getHttpServer())
        .get('/technologies/by-id/12345678-1234-1234-1234-123456789012')
        .expect(404);
    });
  });

  describe('PATCH /technologies/:id', () => {
    /**
     * Validates update behavior and response body updates.
     */
    it('should update technology', async () => {
      if (createdTechnologyId) {
        const updateData = { description: 'Descripción actualizada' };

        const response = await request(app.getHttpServer())
          .patch(`/technologies/${createdTechnologyId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.description).toBe(updateData.description);
      }
    });

    /**
     * Ensures updating a non-existing entity results in 404.
     */
    it('should return 404 when updating non-existent technology', async () => {
      await request(app.getHttpServer())
        .patch('/technologies/12345678-1234-1234-1234-123456789012')
        .send({ description: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /technologies/:id', () => {
    /**
     * Validates entity deletion and ensures subsequent reads return 404.
     */
    it('should delete technology', async () => {
      if (createdTechnologyId) {
        await request(app.getHttpServer())
          .delete(`/technologies/${createdTechnologyId}`)
          .expect(200);

        await request(app.getHttpServer())
          .get(`/technologies/by-id/${createdTechnologyId}`)
          .expect(404);
      }
    });

    /**
     * Ensures deleting a non-existing entity produces a 404 response.
     */
    it('should return 404 when deleting non-existent technology', async () => {
      await request(app.getHttpServer())
        .delete('/technologies/12345678-1234-1234-1234-123456789012')
        .expect(404);
    });
  });
});
