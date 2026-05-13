const request = require('supertest');
const { expect } = require('chai');
const app = require('../index');

describe('Basic Health Check', () => {
  it('should return 200 for /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ ok: true, service: 'dholera-backend' });
  });
});
