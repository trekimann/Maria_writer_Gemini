import { randomBytes } from 'crypto';
import {
  getMasterKey,
  deriveUserKey,
  encryptData,
  decryptData,
  encryptForUser,
  decryptForUser,
  isEncryptedPayload,
  safeEquals,
  type EncryptedPayload,
} from '../../src/services/encryptionService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_MASTER_KEY_HEX = randomBytes(32).toString('hex'); // 64 hex chars
const VALID_MASTER_KEY_BUF = Buffer.from(VALID_MASTER_KEY_HEX, 'hex');
const USER_ID_A = '11111111-1111-4111-8111-111111111111';
const USER_ID_B = '22222222-2222-4222-8222-222222222222';

// ---------------------------------------------------------------------------
// getMasterKey()
// ---------------------------------------------------------------------------

describe('getMasterKey()', () => {
  const originalEnv = process.env.DATA_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DATA_ENCRYPTION_KEY;
    } else {
      process.env.DATA_ENCRYPTION_KEY = originalEnv;
    }
  });

  it('returns a 32-byte Buffer for a valid 64-char hex key', () => {
    process.env.DATA_ENCRYPTION_KEY = VALID_MASTER_KEY_HEX;
    const key = getMasterKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
    expect(key.toString('hex')).toBe(VALID_MASTER_KEY_HEX.toLowerCase());
  });

  it('throws when DATA_ENCRYPTION_KEY is not set', () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    expect(() => getMasterKey()).toThrow('DATA_ENCRYPTION_KEY environment variable is not set');
  });

  it('throws when DATA_ENCRYPTION_KEY is too short', () => {
    process.env.DATA_ENCRYPTION_KEY = 'abc123';
    expect(() => getMasterKey()).toThrow('must be exactly 64 hex characters');
  });

  it('throws when DATA_ENCRYPTION_KEY contains non-hex characters', () => {
    process.env.DATA_ENCRYPTION_KEY = 'z'.repeat(64);
    expect(() => getMasterKey()).toThrow('must be exactly 64 hex characters');
  });

  it('accepts uppercase hex', () => {
    process.env.DATA_ENCRYPTION_KEY = VALID_MASTER_KEY_HEX.toUpperCase();
    const key = getMasterKey();
    expect(key.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// deriveUserKey()
// ---------------------------------------------------------------------------

describe('deriveUserKey()', () => {
  it('returns a 32-byte Buffer', () => {
    const key = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('is deterministic — same inputs always produce the same key', () => {
    const k1 = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
    const k2 = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
    expect(k1.toString('hex')).toBe(k2.toString('hex'));
  });

  it('produces different keys for different user IDs', () => {
    const kA = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
    const kB = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_B);
    expect(kA.toString('hex')).not.toBe(kB.toString('hex'));
  });

  it('produces different keys for different master keys', () => {
    const otherMaster = randomBytes(32);
    const k1 = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
    const k2 = deriveUserKey(otherMaster, USER_ID_A);
    expect(k1.toString('hex')).not.toBe(k2.toString('hex'));
  });

  it('throws when masterKey is not 32 bytes', () => {
    expect(() => deriveUserKey(Buffer.from('tooshort'), USER_ID_A)).toThrow('must be 32 bytes');
  });

  it('throws when userId is empty', () => {
    expect(() => deriveUserKey(VALID_MASTER_KEY_BUF, '')).toThrow('userId must be a non-empty string');
  });
});

// ---------------------------------------------------------------------------
// encryptData() + decryptData() round-trip
// ---------------------------------------------------------------------------

describe('encryptData() / decryptData() — round-trip', () => {
  const userKey = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
  const plaintext = JSON.stringify({ title: 'My Novel', chapters: [], version: '2.1' });

  it('encrypts and decrypts a string successfully', () => {
    const payload = encryptData(plaintext, userKey);
    const result = decryptData(payload, userKey);
    expect(result).toBe(plaintext);
  });

  it('returns an object with ciphertext, iv, and authTag fields', () => {
    const payload = encryptData(plaintext, userKey);
    expect(payload).toHaveProperty('ciphertext');
    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('authTag');
  });

  it('all returned fields are base64 strings', () => {
    const payload = encryptData(plaintext, userKey);
    const b64 = /^[A-Za-z0-9+/]+=*$/;
    expect(payload.ciphertext).toMatch(b64);
    expect(payload.iv).toMatch(b64);
    expect(payload.authTag).toMatch(b64);
  });

  it('generates a unique IV on every call (never reuses IVs)', () => {
    const p1 = encryptData(plaintext, userKey);
    const p2 = encryptData(plaintext, userKey);
    expect(p1.iv).not.toBe(p2.iv);
    // Ciphertexts differ because IVs differ
    expect(p1.ciphertext).not.toBe(p2.ciphertext);
  });

  it('encrypts the empty string', () => {
    const payload = encryptData('', userKey);
    expect(decryptData(payload, userKey)).toBe('');
  });

  it('encrypts a very large string (1 MB)', () => {
    const large = 'x'.repeat(1024 * 1024);
    const payload = encryptData(large, userKey);
    expect(decryptData(payload, userKey)).toBe(large);
  });

  it('preserves unicode / emoji in the plaintext', () => {
    const unicode = '{"title":"📖 Héros & Héroïne","notes":"日本語テスト"}';
    const payload = encryptData(unicode, userKey);
    expect(decryptData(payload, userKey)).toBe(unicode);
  });
});

// ---------------------------------------------------------------------------
// encryptData() — invalid input guards
// ---------------------------------------------------------------------------

describe('encryptData() — invalid inputs', () => {
  it('throws when userKey is not 32 bytes', () => {
    expect(() => encryptData('hello', Buffer.from('bad'))).toThrow('must be 32 bytes');
  });
});

// ---------------------------------------------------------------------------
// decryptData() — tamper detection
// ---------------------------------------------------------------------------

describe('decryptData() — tamper detection', () => {
  const userKey = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_A);
  const plaintext = 'sensitive manuscript data';

  function freshPayload(): EncryptedPayload {
    return encryptData(plaintext, userKey);
  }

  it('throws when the ciphertext is modified', () => {
    const payload = freshPayload();
    const buf = Buffer.from(payload.ciphertext, 'base64');
    buf[0] ^= 0xff; // flip bits in first byte
    const tampered = { ...payload, ciphertext: buf.toString('base64') };
    expect(() => decryptData(tampered, userKey)).toThrow();
  });

  it('throws when the authTag is modified', () => {
    const payload = freshPayload();
    const buf = Buffer.from(payload.authTag, 'base64');
    buf[0] ^= 0xff;
    const tampered = { ...payload, authTag: buf.toString('base64') };
    expect(() => decryptData(tampered, userKey)).toThrow();
  });

  it('throws when the IV is modified', () => {
    const payload = freshPayload();
    const buf = Buffer.from(payload.iv, 'base64');
    buf[0] ^= 0xff;
    const tampered = { ...payload, iv: buf.toString('base64') };
    expect(() => decryptData(tampered, userKey)).toThrow();
  });

  it('throws when decrypting with the wrong user key', () => {
    const payload = freshPayload();
    const wrongKey = deriveUserKey(VALID_MASTER_KEY_BUF, USER_ID_B);
    expect(() => decryptData(payload, wrongKey)).toThrow();
  });

  it('throws when decrypting with a completely different key', () => {
    const payload = freshPayload();
    const differentKey = randomBytes(32);
    expect(() => decryptData(payload, differentKey)).toThrow();
  });

  it('throws when userKey is not 32 bytes', () => {
    const payload = freshPayload();
    expect(() => decryptData(payload, Buffer.from('short'))).toThrow('must be 32 bytes');
  });

  it('throws when payload is missing ciphertext', () => {
    const { iv, authTag } = freshPayload();
    // Pass undefined for ciphertext (cast to bypass TypeScript) to simulate a corrupt payload
    expect(() => decryptData({ ciphertext: undefined as unknown as string, iv, authTag }, userKey)).toThrow(
      'missing required fields',
    );
  });

  it('throws when payload is missing iv', () => {
    const { ciphertext, authTag } = freshPayload();
    expect(() => decryptData({ ciphertext, iv: '', authTag }, userKey)).toThrow(
      'missing required fields',
    );
  });

  it('throws when payload is missing authTag', () => {
    const { ciphertext, iv } = freshPayload();
    expect(() => decryptData({ ciphertext, iv, authTag: '' }, userKey)).toThrow(
      'missing required fields',
    );
  });
});

// ---------------------------------------------------------------------------
// encryptForUser() / decryptForUser() — env-var integration
// ---------------------------------------------------------------------------

describe('encryptForUser() / decryptForUser()', () => {
  const originalEnv = process.env.DATA_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = VALID_MASTER_KEY_HEX;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.DATA_ENCRYPTION_KEY;
    } else {
      process.env.DATA_ENCRYPTION_KEY = originalEnv;
    }
  });

  it('round-trips plaintext for a given userId', () => {
    const original = '{"meta":{"title":"Test Novel"}}';
    const payload = encryptForUser(original, USER_ID_A);
    const result = decryptForUser(payload, USER_ID_A);
    expect(result).toBe(original);
  });

  it('user A cannot decrypt user B ciphertext', () => {
    const payload = encryptForUser('secret text', USER_ID_A);
    expect(() => decryptForUser(payload, USER_ID_B)).toThrow();
  });

  it('throws when DATA_ENCRYPTION_KEY is not set', () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    expect(() => encryptForUser('test', USER_ID_A)).toThrow('DATA_ENCRYPTION_KEY');
    // restore for other tests
    process.env.DATA_ENCRYPTION_KEY = VALID_MASTER_KEY_HEX;
  });
});

// ---------------------------------------------------------------------------
// isEncryptedPayload()
// ---------------------------------------------------------------------------

describe('isEncryptedPayload()', () => {
  it('returns true for a valid payload shape', () => {
    const payload: EncryptedPayload = { ciphertext: 'abc', iv: 'def', authTag: 'ghi' };
    expect(isEncryptedPayload(payload)).toBe(true);
  });

  it('returns false for null', () => expect(isEncryptedPayload(null)).toBe(false));
  it('returns false for a string', () => expect(isEncryptedPayload('oops')).toBe(false));
  it('returns false for an empty object', () => expect(isEncryptedPayload({})).toBe(false));

  it('returns false when ciphertext is missing', () => {
    expect(isEncryptedPayload({ iv: 'x', authTag: 'y' })).toBe(false);
  });

  it('returns false when a field is a number instead of string', () => {
    expect(isEncryptedPayload({ ciphertext: 1, iv: 'x', authTag: 'y' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// safeEquals()
// ---------------------------------------------------------------------------

describe('safeEquals()', () => {
  it('returns true for identical strings', () => {
    expect(safeEquals('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(safeEquals('abc123', 'abc124')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(safeEquals('short', 'longer-string')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(safeEquals('', '')).toBe(true);
  });

  it('returns false when one string is empty', () => {
    expect(safeEquals('', 'notempty')).toBe(false);
  });
});
