/**
 * tests/api.test.js
 * Basic integration tests for DRTS API routes.
 * Run with: npm test  (from server/)
 *
 * Requires: jest, supertest, mongodb-memory-server
 * Install: npm install --save-dev jest supertest @jest-community/jest-extended mongodb-memory-server
 */

const request  = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;
let authToken;
let userId;
let scenarioId;

// ── Setup ───────────────────────────────────────────────────────────────────
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI   = mongoServer.getUri();
  process.env.JWT_SECRET  = 'test_secret_key_drts';
  process.env.JWT_EXPIRES_IN = '1d';

  // Require app after env is set
  app = require('../index');
  await new Promise(r => setTimeout(r, 500)); // wait for DB connect
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── Auth ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should register a new user and return a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testtrainee',
      email:    'test@drts.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('testtrainee');
    authToken = res.body.token;
    userId    = res.body.user.id;
  });

  it('should reject duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'other',
      email:    'test@drts.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('should reject missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    'test@drts.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email:    'test@drts.com',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('testtrainee');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Scenarios ─────────────────────────────────────────────────────────────────
describe('GET /api/scenarios/active', () => {
  it('should return active scenarios (seeded)', async () => {
    const res = await request(app)
      .get('/api/scenarios/active')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.scenarios)).toBe(true);
    // Store first active scenario id for later
    const active = res.body.scenarios.find(s => s.active && s.durationSeconds > 0);
    if (active) scenarioId = active._id;
  });
});

// ── Training Results ──────────────────────────────────────────────────────────
describe('POST /api/results', () => {
  it('should save a training result', async () => {
    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        scenarioId:       scenarioId || new mongoose.Types.ObjectId().toString(),
        scenarioType:     'earthquake',
        score:            620,
        survivorsHelped:  3,
        survivorsPanicked:1,
        survivorsLost:    1,
        evacuated:        true,
        healthRemaining:  65,
        debrisHits:       1,
        durationSeconds:  147,
        decisions: [
          { timestamp: 12, phase: 'calm',           action: 'helped_npc',     target: 'NPC_0', scoreImpact: 150 },
          { timestamp: 28, phase: 'shaking_strong',  action: 'took_cover',    target: null,    scoreImpact: 50  },
          { timestamp: 45, phase: 'shaking_strong',  action: 'hit_by_debris', target: null,    scoreImpact: -60 },
          { timestamp: 90, phase: 'evacuation',      action: 'evacuated',     target: null,    scoreImpact: 200 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.result.score).toBe(620);
    expect(res.body.result.grade).toBe('B');
    expect(res.body.result.passed).toBe(true);
  });

  it('should reject result without required fields', async () => {
    const res = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ score: 500 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/results/my', () => {
  it('should return the current users results', async () => {
    const res = await request(app)
      .get('/api/results/my')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});

describe('GET /api/results/leaderboard', () => {
  it('should return leaderboard array', async () => {
    const res = await request(app)
      .get('/api/results/leaderboard')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
describe('GET /api/analytics/me', () => {
  it('should return personal analytics with at least one run', async () => {
    const res = await request(app)
      .get('/api/analytics/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.analytics).not.toBeNull();
    expect(res.body.analytics.totalRuns).toBeGreaterThan(0);
    expect(typeof res.body.analytics.successRate).toBe('number');
  });
});

// ── Grade computation ─────────────────────────────────────────────────────────
describe('Grade computation', () => {
  const cases = [
    [950, 'S'], [800, 'A'], [650, 'B'], [500, 'C'], [350, 'D'], [200, 'F'],
  ];
  cases.forEach(([score, expectedGrade]) => {
    it(`score ${score} → grade ${expectedGrade}`, async () => {
      const res = await request(app)
        .post('/api/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenarioId:     scenarioId || new mongoose.Types.ObjectId().toString(),
          scenarioType:   'earthquake',
          score,
          durationSeconds: 120,
        });
      expect(res.status).toBe(201);
      expect(res.body.result.grade).toBe(expectedGrade);
    });
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
