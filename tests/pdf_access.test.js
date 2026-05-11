const request = require('supertest');
const { expect } = require('chai');
const app = require('../index');

describe('PDF Viewer Admin Access', () => {
  let adminCookie = '';

  before(async () => {
    // Login to get admin cookie
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    adminCookie = res.headers['set-cookie'];
  });

  describe('GET /api/pdf/view/:id', () => {
    it('should allow admin access without lead token', async () => {
      // PDF ID 1 exists from our earlier check
      const res = await request(app)
        .get('/api/pdf/view/1')
        .set('Cookie', adminCookie);

      // It should either stream the PDF (200) or 502/404 if the remote file is missing,
      // but NOT 403 (which is for unauthorized access)
      expect(res.status).to.not.equal(403);
    });

    it('should block access without lead token for non-admins', async () => {
      const res = await request(app).get('/api/pdf/view/1');
      expect(res.status).to.equal(403);
      expect(res.body.error).to.contain('Verification required');
    });
  });
});
