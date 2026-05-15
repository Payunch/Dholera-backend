const DEFAULT_ALLOWED_ORIGINS = [
  'https://dholeraplatform.com',
  'https://dholera-frontend-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];

const LOCAL_DEV_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOrigin = (value) => {
  if (!value || typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch (_err) {
    return trimmed.replace(/\/+$/, '');
  }
};

const parseAllowedOrigins = (rawValue) => {
  const source = rawValue || DEFAULT_ALLOWED_ORIGINS.join(',');

  return source
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
};

const wildcardToRegExp = (pattern) => {
  if (pattern === '*') {
    return /^https?:\/\/[^/]+$/;
  }

  return new RegExp(`^${escapeRegExp(pattern).replace(/\\\*/g, '.*')}$`);
};

const buildOriginMatcher = (rawValue) => {
  const allowedOrigins = parseAllowedOrigins(rawValue);
  const exactOrigins = new Set();
  const wildcardOrigins = [];
  let allowAnyOrigin = false;

  for (const origin of allowedOrigins) {
    if (origin === '*') {
      allowAnyOrigin = true;
      continue;
    }

    if (origin.includes('*')) {
      wildcardOrigins.push({
        pattern: origin,
        regex: wildcardToRegExp(origin)
      });
      continue;
    }

    exactOrigins.add(origin);
  }

  const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) return false;

    if (allowAnyOrigin || exactOrigins.has(normalizedOrigin)) {
      return true;
    }

    if (LOCAL_DEV_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalizedOrigin))) {
      return true;
    }

    return wildcardOrigins.some(({ regex }) => regex.test(normalizedOrigin));
  };

  return {
    allowAnyOrigin,
    allowedOrigins,
    exactOrigins: Array.from(exactOrigins),
    wildcardOrigins: wildcardOrigins.map(({ pattern }) => pattern),
    isAllowedOrigin
  };
};

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  buildOriginMatcher,
  normalizeOrigin,
  parseAllowedOrigins
};
