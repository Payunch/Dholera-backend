const { z } = require('zod');

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.');
const fourDigitPinSchema = z.string().trim().regex(/^\d{4}$/, 'Password must be exactly 4 digits.');
const sixDigitOtpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.');

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your full name.').max(120),
  phone: phoneSchema,
  email: emailSchema,
  password: fourDigitPinSchema,
  acceptedTerms: z.coerce.boolean().refine((v) => v === true, 'Accept the Terms & Conditions.'),
  acceptedPrivacy: z.coerce.boolean().refine((v) => v === true, 'Accept the Privacy Policy.'),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or mobile number.').max(255),
  password: z.string().trim().min(1, 'Enter your password.').max(32),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: sixDigitOtpSchema,
  password: fourDigitPinSchema,
});

const leadNameSchema = z.string().trim().min(1, 'Name is required.').max(120);
const leadPhoneSchema = z.string().trim().regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter a valid mobile number.');

const onboardLeadSchema = z.object({
  name: leadNameSchema.optional(),
  phone: leadPhoneSchema,
  browserFingerprint: z.string().trim().max(120).optional().default(''),
  sessionId: z.string().trim().max(100).optional().default(''),
  preferred_language: z.string().trim().max(5).optional().default('en'),
});

const verifyOtpSchema = z.object({
  name: leadNameSchema.optional(),
  phone: leadPhoneSchema,
  firebaseToken: z.string().trim().max(5000).optional().default(''),
  browserFingerprint: z.string().trim().max(120).optional().default(''),
  sessionId: z.string().trim().max(100).optional().default(''),
  preferred_language: z.string().trim().max(5).optional().default('en'),
  utm_source: z.string().trim().max(80).optional().default(''),
});

const trackReturningSchema = z.object({
  page: z.string().trim().min(1).max(120),
  timeSpent: z.coerce.number().int().min(0).max(60).optional().default(5),
});

const updateProfileSchema = z.object({
  name: leadNameSchema.optional(),
});

const createLeadSchema = z.object({
  name: leadNameSchema,
  source: z.string().trim().max(80).optional().default(''),
  utm_source: z.string().trim().max(80).optional().default('organic'),
  sessionId: z.string().trim().max(100).optional().default(''),
  phone: leadPhoneSchema,
  preferred_language: z.string().trim().max(5).optional().default('en'),
});

const requestBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request.' });
  }
  req.body = parsed.data;
  return next();
};

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  onboardLeadSchema,
  verifyOtpSchema,
  trackReturningSchema,
  updateProfileSchema,
  createLeadSchema,
  requestBody,
};
