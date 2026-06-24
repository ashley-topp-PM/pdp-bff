/**
 * Test Suite: Products E2E (Supertest)
 * Type: Integration / E2E
 * Status: FAILING — TDD RED phase (no implementation exists)
 * Generated: 2026-06-24
 * Agent: sephora-test-creator
 * Criteria: AC-01, AC-12, AC-13
 * JIRA: AGNT-1582
 *
 * Uses Supertest against the NestJS application.
 * Verifies: 3 endpoints, 404 for unknown product, 503 graceful degradation.
 *
 * These tests will remain FAILING until the NestJS app is implemented.
 */

// Production app — does not exist yet (RED state)
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Products E2E — Supertest', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Endpoint 1: GET /products/:id — happy path
  // SCEN-001: Returns 200 with PdpPageDto for a valid product ID
  it('GET /products/:id — should return 200 with PdpPageDto for valid productId (SCEN001)', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/P123456')
      .query({ locale: 'en-US' })
      .expect(200);

    expect(response.body.productId).toBe('P123456');
    expect(response.body.brandName).toBeDefined();
    expect(response.body.price).toBeDefined();
    expect(response.body.images).toBeDefined();
  });

  // Endpoint 2: GET /products/:id/inventory — happy path
  it('GET /products/:id/inventory — should return 200 with inventory data', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/P123456/inventory')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.productId).toBe('P123456');
  });

  // Endpoint 3: GET /products/:id/reviews — happy path
  it('GET /products/:id/reviews — should return 200 with reviews summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/P123456/reviews')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(typeof response.body.averageRating).toBe('number');
  });

  // SCEN-030, AC-12: 404 when product not found — response must contain human-readable message
  it('GET /products/:id — should return 404 with human-readable message for unknown product (SCEN030)', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/INVALID999')
      .query({ locale: 'en-US' })
      .expect(404);

    expect(response.body.message).toBe(
      'Product not found. Please check the product ID and try again.'
    );
    // Must not expose raw codes
    expect(response.body.message).not.toContain('404');
    expect(response.body.message).not.toContain('ERR_');
  });

  // SCEN-031, AC-13: 503 graceful degradation when Product Graph is unavailable
  // This test requires the Product Graph Service to be mocked to return a 500
  it('GET /products/:id — should return 503 when Product Graph service is unavailable (SCEN031)', async () => {
    // Product ID 'P-GRAPH-DOWN' is a test sentinel that triggers upstream failure in test env
    const response = await request(app.getHttpServer())
      .get('/products/P-GRAPH-DOWN')
      .query({ locale: 'en-US' })
      .expect(503);

    expect(response.body.message).toContain('trouble loading');
    expect(response.body.message).not.toContain('500');
    expect(response.body.message).not.toContain('stack');
  });

  // Health check endpoint
  it('GET /health — should return 200 OK', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
