process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';

const crypto = require('crypto');
const { expect } = require('chai');
const leadsRouter = require('../routes/leads');
const { Lead, sequelize } = require('../models');

const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const getRouteHandler = (path, method, indexFromEnd = 0) => {
  const layer = leadsRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const targetIndex = layer.route.stack.length - 1 - indexFromEnd;
  return layer.route.stack[targetIndex].handle;
};

const invokeHandler = async (handler, req = {}) => {
  let statusCode = 200;
  let payload;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    }
  };

  await handler(
    {
      body: {},
      headers: { 'user-agent': 'mocha-test' },
      ip: '127.0.0.1',
      ...req
    },
    res,
    () => {}
  );

  return { statusCode, body: payload };
};

describe('Lead Registration Auth Flow', () => {
  const phone = '74358080310';
  const email = 'lead-auth@example.com';
  const otp = '123456';

  const verifyRegistrationOtp = getRouteHandler('/verify-registration-otp', 'post');
  const setupPasscode = getRouteHandler('/setup-passcode', 'post');

  before(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Lead.destroy({ where: { phone } });

    await Lead.create({
      name: 'Lead Auth Test',
      phone,
      email,
      verified: false,
      is_registered: false,
      otp: hashValue(otp),
      otp_expiry: new Date(Date.now() + 5 * 60 * 1000)
    });
  });

  afterEach(async () => {
    await Lead.destroy({ where: { phone } });
  });

  it('requires a verification token before a passcode can be created', async () => {
    const verifyResponse = await invokeHandler(verifyRegistrationOtp, {
      body: { phone, otp }
    });

    expect(verifyResponse.statusCode).to.equal(200);
    expect(verifyResponse.body.success).to.equal(true);
    expect(verifyResponse.body.verification_token).to.be.a('string').and.not.empty;

    const missingTokenResponse = await invokeHandler(setupPasscode, {
      body: { phone, passcode: '654321' }
    });

    expect(missingTokenResponse.statusCode).to.equal(400);
    expect(missingTokenResponse.body.error).to.contain('Verification token');

    const wrongTokenResponse = await invokeHandler(setupPasscode, {
      body: {
        phone,
        passcode: '654321',
        verificationToken: 'wrong-token'
      }
    });

    expect(wrongTokenResponse.statusCode).to.equal(403);
    expect(wrongTokenResponse.body.error).to.contain('Verification expired');
  });

  it('creates a passcode only when the verification token is valid', async () => {
    const verifyResponse = await invokeHandler(verifyRegistrationOtp, {
      body: { phone, otp }
    });

    const verificationToken = verifyResponse.body.verification_token;

    const setupResponse = await invokeHandler(setupPasscode, {
      body: {
        phone,
        passcode: '654321',
        verificationToken
      }
    });

    expect(setupResponse.statusCode).to.equal(200);
    expect(setupResponse.body.success).to.equal(true);
    expect(setupResponse.body.lead_token).to.be.a('string').and.not.empty;

    const lead = await Lead.findOne({ where: { phone } });
    expect(lead).to.not.equal(null);
    expect(lead.is_registered).to.equal(true);
    expect(lead.verified).to.equal(true);
    expect(lead.passcode).to.be.a('string').and.not.empty;
    expect(lead.otp).to.equal(null);
    expect(lead.otp_expiry).to.equal(null);

    const repeatSetupResponse = await invokeHandler(setupPasscode, {
      body: {
        phone,
        passcode: '123123',
        verificationToken
      }
    });

    expect(repeatSetupResponse.statusCode).to.equal(409);
    expect(repeatSetupResponse.body.error).to.contain('already registered');
  });
});
