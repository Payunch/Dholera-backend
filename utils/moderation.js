// Intelligent Vulgarity, Abuse & Spam Filter for Community Comments

// 1. English profanity & vulgarity patterns
const ENGLISH_PROFANITY_PATTERNS = [
  /\b(f+u+c+k+|f+u+k+|f+c+k+|f+\*+c+k+)\b/i,
  /\b(s+h+i+t+|s+h+\*+t+|s+h+1+t+)\b/i,
  /\b(b+i+t+c+h+|b+\*+t+c+h+)\b/i,
  /\b(b+a+s+t+a+r+d+)\b/i,
  /\b(a+s+s+h+o+l+e+|a+s+s+h+0+l+e+)\b/i,
  /\b(w+h+o+r+e+|s+l+u+t+)\b/i,
  /\b(d+i+c+k+|c+o+c+k+|p+u+s+s+y+|v+a+g+i+n+a+|p+e+n+i+s+)\b/i,
  /\b(c+u+n+t+|p+r+i+c+k+)\b/i,
  /\b(b+o+o+b+s+|t+i+t+s+)\b/i,
  /\b(p+o+r+n+|x+x+x+|n+u+d+e+s?|e+r+o+t+i+c+)\b/i,
  /\b(m+o+t+h+e+r+f+u+c+k+e+r+)\b/i
];

// 2. Hindi / Hinglish / Regional abusive terms
const HINDI_PROFANITY_PATTERNS = [
  /\b(b+h+e+n+c+h+o+d+|b+c+|b+h+o+s+d+i+|b+h+o+s+a+d+i+k+e+)\b/i,
  /\b(m+a+d+a+r+c+h+o+d+|m+c+)\b/i,
  /\b(c+h+u+t+i+y+a+|c+h+u+t+)\b/i,
  /\b(g+a+a+n+d+|g+a+n+d+u+|g+a+n+d+i+)\b/i,
  /\b(h+a+r+a+m+i+|h+a+r+a+m+z+a+d+a+)\b/i,
  /\b(l+a+u+d+a+|l+u+n+d+|l+a+n+d+)\b/i,
  /\b(r+a+n+d+i+|r+a+n+d+)\b/i,
  /\b(k+a+m+i+n+a+|k+u+t+t+a+)\b/i
];

// 3. Scam & spam solicitation triggers
const SPAM_SOLICITATION_PATTERNS = [
  /\b(t\.me\/[a-z0-9_]+|telegram\s*:\s*@?[a-z0-9_]+)\b/i,
  /\b(whatsapp\s*group|call\s*girls?|escort\s*service)\b/i,
  /\b(casino|betting|satta|matka|lottery\s*winner)\b/i,
  /\b(crypto\s*giveaway|double\s*your\s*money|binary\s*option)\b/i
];

/**
 * Checks if comment content contains vulgarity, profanity, or scam solicitation.
 * @param {string} text 
 * @returns {{ isVulgarOrSuspicious: boolean, reason: string | null }}
 */
function checkContentSafety(text = '') {
  if (!text || typeof text !== 'string') {
    return { isVulgarOrSuspicious: false, reason: null };
  }

  const normalized = text.toLowerCase().trim();

  // Check English profanity
  for (const pattern of ENGLISH_PROFANITY_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isVulgarOrSuspicious: true, reason: 'Profanity detected' };
    }
  }

  // Check Hindi/Regional profanity
  for (const pattern of HINDI_PROFANITY_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isVulgarOrSuspicious: true, reason: 'Abusive language detected' };
    }
  }

  // Check spam solicitation
  for (const pattern of SPAM_SOLICITATION_PATTERNS) {
    if (pattern.test(normalized)) {
      return { isVulgarOrSuspicious: true, reason: 'Spam pattern detected' };
    }
  }

  return { isVulgarOrSuspicious: false, reason: null };
}

module.exports = {
  checkContentSafety
};
