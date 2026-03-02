/**
 * Encryption Service — Phase 2
 *
 * Provides AES-256-GCM application-level encryption for project data stored
 * in the database. Uses per-user derived keys (Option B from the plan):
 *   masterKey (32 bytes from DATA_ENCRYPTION_KEY env) + userId → HMAC-SHA256 → 32-byte user key
 *
 * Nothing from this module touches the database or Express — it is pure crypto.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  /** Base64-encoded AES-256-GCM ciphertext */
  ciphertext: string;
  /** Base64-encoded 96-bit initialisation vector */
  iv: string;
  /** Base64-encoded 128-bit GCM authentication tag */
  authTag: string;
}

// ---------------------------------------------------------------------------
// Master key management
// ---------------------------------------------------------------------------

/**
 * Reads and validates the DATA_ENCRYPTION_KEY environment variable.
 * Expects exactly 64 hex characters (= 32 bytes = 256 bits).
 *
 * @throws if the variable is absent or malformed
 */
export function getMasterKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'DATA_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      'DATA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
        `Got ${raw.length} characters.`,
    );
  }
  return Buffer.from(raw, 'hex');
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derives a 32-byte user-specific encryption key from the master key.
 * Uses HMAC-SHA256: H(masterKey, userId) → 32-byte key.
 *
 * The same userId always produces the same derived key (deterministic),
 * but different users produce different keys, limiting breach blast radius.
 *
 * @param masterKey - 32-byte master key from getMasterKey()
 * @param userId    - The user's UUID string
 * @returns 32-byte Buffer suitable for AES-256
 */
export function deriveUserKey(masterKey: Buffer, userId: string): Buffer {
  if (masterKey.length !== 32) {
    throw new Error(`deriveUserKey: masterKey must be 32 bytes, got ${masterKey.length}`);
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('deriveUserKey: userId must be a non-empty string');
  }
  return createHmac('sha256', masterKey).update(userId, 'utf8').digest();
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * A fresh random 96-bit IV is generated for every call — never reuse IVs
 * with the same key. The GCM auth tag is included so tampering is detected
 * on decrypt.
 *
 * @param plaintext - The UTF-8 string to encrypt (e.g. JSON.stringify(appState))
 * @param userKey   - 32-byte key from deriveUserKey()
 * @returns EncryptedPayload with base64-encoded ciphertext, iv, and authTag
 */
export function encryptData(plaintext: string, userKey: Buffer): EncryptedPayload {
  if (userKey.length !== 32) {
    throw new Error(`encryptData: userKey must be 32 bytes, got ${userKey.length}`);
  }

  const iv = randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', userKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

/**
 * Decrypts an EncryptedPayload produced by encryptData().
 *
 * GCM authentication is verified automatically by Node's crypto module —
 * if the ciphertext or auth tag has been tampered with, an error is thrown
 * before any plaintext is returned.
 *
 * @param payload - The EncryptedPayload to decrypt
 * @param userKey - 32-byte key from deriveUserKey() — must match the key used to encrypt
 * @returns The original plaintext UTF-8 string
 * @throws if the payload is tampered with, the key is wrong, or inputs are malformed
 */
export function decryptData(payload: EncryptedPayload, userKey: Buffer): string {
  if (userKey.length !== 32) {
    throw new Error(`decryptData: userKey must be 32 bytes, got ${userKey.length}`);
  }

  const { ciphertext, iv, authTag } = payload;
  // Use typeof checks rather than falsy checks: ciphertext can legitimately be
  // an empty string when the plaintext was empty (AES-GCM produces no output bytes).
  if (typeof ciphertext !== 'string' || !iv || !authTag) {
    throw new Error('decryptData: payload is missing required fields (ciphertext, iv, authTag)');
  }

  const ivBuf = Buffer.from(iv, 'base64');
  const authTagBuf = Buffer.from(authTag, 'base64');
  const ciphertextBuf = Buffer.from(ciphertext, 'base64');

  if (ivBuf.length !== 12) {
    throw new Error(`decryptData: IV must be 12 bytes, got ${ivBuf.length}`);
  }
  if (authTagBuf.length !== 16) {
    throw new Error(`decryptData: authTag must be 16 bytes, got ${authTagBuf.length}`);
  }

  const decipher = createDecipheriv('aes-256-gcm', userKey, ivBuf);
  decipher.setAuthTag(authTagBuf);

  const decrypted = Buffer.concat([
    decipher.update(ciphertextBuf),
    decipher.final(), // throws if GCM auth tag verification fails
  ]);

  return decrypted.toString('utf8');
}

// ---------------------------------------------------------------------------
// Convenience helpers — used by projectService
// ---------------------------------------------------------------------------

/**
 * Encrypts a plain AppState JSON string for a specific user, using the
 * application master key read from the DATA_ENCRYPTION_KEY env var.
 *
 * @param plaintext - JSON.stringify'd AppState
 * @param userId    - The owning user's UUID
 */
export function encryptForUser(plaintext: string, userId: string): EncryptedPayload {
  const masterKey = getMasterKey();
  const userKey = deriveUserKey(masterKey, userId);
  return encryptData(plaintext, userKey);
}

/**
 * Decrypts an EncryptedPayload for a specific user, using the application
 * master key read from the DATA_ENCRYPTION_KEY env var.
 *
 * @param payload - The EncryptedPayload from the database
 * @param userId  - The owning user's UUID
 * @returns The original plaintext string
 */
export function decryptForUser(payload: EncryptedPayload, userId: string): string {
  const masterKey = getMasterKey();
  const userKey = deriveUserKey(masterKey, userId);
  return decryptData(payload, userKey);
}

// ---------------------------------------------------------------------------
// Utility — validate an EncryptedPayload shape (used in project controller)
// ---------------------------------------------------------------------------

/**
 * Returns true if the value looks like a valid EncryptedPayload.
 * Does NOT verify cryptographic correctness — use decryptData for that.
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['ciphertext'] === 'string' &&
    typeof v['iv'] === 'string' &&
    typeof v['authTag'] === 'string'
  );
}

/**
 * Constant-time equality check for two strings (prevents timing attacks
 * when comparing tokens/hashes). Falls back to timingSafeEqual on Buffers.
 */
export function safeEquals(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
