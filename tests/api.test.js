const request = require('supertest');
const { expect } = require('chai');
const app = require('../index');

describe('API Endpoints', () => {
  describe('GET /healthz', () => {
    it('should return 200 and ok: true', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ok: true, service: 'dholera-backend' });
    });
  });

  describe('GET /healthz/runtime', () => {
    it('should return runtime diagnostic data', async () => {
      const res = await request(app).get('/healthz/runtime');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('bootAt');
      expect(res.body).to.have.property('nodeEnv');
    });
  });
});
