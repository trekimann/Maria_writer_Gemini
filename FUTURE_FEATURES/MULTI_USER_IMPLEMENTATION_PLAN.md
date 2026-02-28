# Multi-User Implementation Plan for Maria Writer

**Status:** Phase 1 In Progress (Partially Implemented)  
**Last Updated:** February 28, 2026  
**Decision:** JWT Authentication + WebSockets + MariaDB

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Architecture Decisions](#architecture-decisions)
3. [Phase 1: MariaDB Persistent Storage](#phase-1-mariadb-persistent-storage)
4. [Phase 2: Authentication & User Management](#phase-2-authentication--user-management)
5. [Phase 3: Collaboration Features](#phase-3-collaboration-features)
6. [Phase 4: Real-Time Sync](#phase-4-real-time-sync)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### Application Architecture (As of Feb 2026)

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- Pure client-side application
- State management: Context API with useReducer (`StoreContext.tsx`)
- Data persistence: browser `localStorage` only
- Dockerized with nginx for static serving

**Current Data Structure:**
```typescript
interface AppState {
  meta: BookMetadata;
  chapters: Chapter[];
  activeChapterId: string | null;
  characters: Character[];
  events: Event[];
  relationships: Relationship[];
  comments: Record<string, StoryComment>;
  timeline: Timeline;
  viewMode: ViewMode;
  context: ContextMode;
  activeCodexTab: CodexTab;
  activeModal: ModalType;
  editingItemId: string | null;
  viewingItemId: string | null;
  prefilledEventData?: Partial<Event>;
  themeCustomizations?: ThemeCustomization[];
}
```

**Storage Location:**
- File: `src/utils/storage.ts`
- Key: `'maria_autosave'`
- Version: `'2.1'`
- Methods: `loadFromLocal()`, `saveToLocal()`, `exportFile()`

**Limitations:**
- Single-user, single-device only
- No data synchronization across devices
- No collaboration features
- No cloud backup
- Data loss risk if browser storage cleared

---

## Architecture Decisions

### Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Backend** | Node.js + Express + TypeScript | Matches frontend expertise, easy integration |
| **Database** | MariaDB 11 | Requested by stakeholder, robust, free |
| **ORM** | Prisma | Type-safe, excellent TypeScript support |
| **Authentication** | JWT (JSON Web Tokens) | Stateless, scalable, no external dependencies |
| **Real-Time** | WebSockets (Socket.io) | Bi-directional, lower latency than polling |
| **Testing** | Jest + Supertest | Industry standard, good TypeScript support |
| **Deployment** | Docker Compose | Multi-container orchestration |

### Why Not...

**Why not OAuth/Firebase?**
- Want full control over authentication
- No external dependencies in v1
- Can add OAuth later as additional option

**Why not PostgreSQL?**
- MariaDB explicitly requested
- Both are excellent choices
- MariaDB has better MySQL compatibility

**Why not GraphQL?**
- REST is simpler for this use case
- Team likely more familiar with REST
- Can migrate later if needed

---

## Phase 1: MariaDB Persistent Storage

**Goal:** Add cloud storage without changing existing frontend behavior significantly

### Strategy
1. Build backend API that accepts entire `AppState` JSON
2. Keep localStorage as primary storage (backward compatible)
3. Add "Save to Cloud" and "Load from Cloud" buttons
4. Use temporary guest IDs (no auth yet)
5. Roll out to existing customers as optional cloud backup

### Implementation Steps

#### Step 1.1: Backend Project Setup

**Location:** `c:\Source\Maria_writer_Gemini\maria-writer-backend\`

**Structure:**
```
maria-writer-backend/
├── src/
│   ├── server.ts                 # Express app + WebSocket setup
│   ├── routes/
│   │   ├── health.ts             # Health check endpoint
│   │   └── projects.ts           # Project CRUD endpoints
│   ├── controllers/
│   │   └── projectController.ts  # Business logic
│   ├── middleware/
│   │   ├── errorHandler.ts       # Global error handling
│   │   ├── validator.ts          # Request validation
│   │   ├── rateLimit.ts          # Rate limiting
│   │   └── cors.ts               # CORS configuration
│   ├── services/
│   │   └── projectService.ts     # Database operations
│   ├── config/
│   │   └── database.ts           # Prisma client
│   ├── types/
│   │   └── index.ts              # Shared types
│   └── utils/
│       ├── logger.ts             # Winston logger
│       └── validation.ts         # Zod schemas
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Auto-generated
├── tests/
│   ├── integration/
│   │   └── projects.test.ts
│   └── unit/
│       └── projectService.test.ts
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

#### Step 1.2: Database Schema (Simplified)

**Prisma Schema** (`prisma/schema.prisma`):
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id          String   @id @default(uuid())
  guestId     String   @map("guest_id")
  title       String   @db.VarChar(500)
  data        Json     // Entire AppState as JSON
  version     String   @default("2.1")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([guestId])
  @@map("projects")
}
```

**Migration Strategy:**
- Start with single JSON column for quick implementation
- Later phases will normalize into proper tables (chapters, characters, etc.)
- Allows gradual migration without breaking changes

#### Step 1.3: API Endpoints (Phase 1)

```typescript
// Health check
GET  /api/health
Response: { status: 'ok', timestamp: string, version: string }

// Save project (create or update)
POST /api/projects
Body: { guestId: string, title: string, data: AppState }
Response: { id: string, updatedAt: string }

// Get all projects for a guest
GET  /api/projects?guestId={guestId}
Response: { projects: Project[] }

// Get specific project
GET  /api/projects/:id
Response: { project: Project }

// Update project
PUT  /api/projects/:id
Body: { data: AppState }
Response: { id: string, updatedAt: string }

// Delete project
DELETE /api/projects/:id
Response: { success: boolean }
```

#### Step 1.4: Frontend Integration (Minimal Changes)

**New Files:**
- `src/services/cloudStorage.ts` - API client
- `src/components/molecules/CloudSyncButtons.tsx` - Save/Load UI

**Modified Files:**
- `src/context/StoreContext.tsx` - Add cloud sync actions
- `src/App.tsx` - Add CloudSyncButtons component

**New State:**
```typescript
interface AppState {
  // ... existing fields
  cloudSync?: {
    projectId: string | null;
    guestId: string | null;
    lastSyncedAt: string | null;
    isSyncing: boolean;
    syncError: string | null;
  };
}
```

**Guest ID Generation:**
```typescript
// Store in localStorage on first use
const GUEST_ID_KEY = 'maria_guest_id';

function getOrCreateGuestId(): string {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}
```

#### Step 1.5: Docker Compose Setup

**`docker-compose.yml`** (root level):
```yaml
version: '3.8'

services:
  frontend:
    build: ./maria-writer-react
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:3000

  backend:
    build: ./maria-writer-backend
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=mysql://maria_user:${DB_PASSWORD}@db:3306/maria_writer
      - NODE_ENV=production
      - PORT=3000
      - CORS_ORIGIN=http://localhost
    volumes:
      - ./maria-writer-backend/src:/app/src

  db:
    image: mariadb:11
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=maria_writer
      - MYSQL_USER=maria_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  db_data:
```

**`.env.example`:**
```env
DB_ROOT_PASSWORD=your_root_password_here
DB_PASSWORD=your_db_password_here
DATABASE_URL=mysql://maria_user:your_db_password_here@localhost:3306/maria_writer
```

#### Step 1.6: Testing Requirements

**Backend Tests:**
```typescript
// Integration tests (tests/integration/projects.test.ts)
describe('Projects API', () => {
  describe('POST /api/projects', () => {
    it('should create a new project');
    it('should validate required fields');
    it('should reject invalid JSON');
    it('should handle large payloads (>1MB)');
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by ID');
    it('should return 404 for non-existent project');
  });

  describe('PUT /api/projects/:id', () => {
    it('should update existing project');
    it('should preserve metadata');
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project');
    it('should return 404 if already deleted');
  });
});

// Load tests
describe('Load Testing', () => {
  it('should handle 100 concurrent saves');
  it('should handle 500 concurrent reads');
  it('should respond within 200ms for reads');
  it('should respond within 500ms for writes');
});
```

**Frontend Tests:**
```typescript
describe('Cloud Storage Integration', () => {
  it('should save to cloud successfully');
  it('should load from cloud successfully');
  it('should show sync status');
  it('should handle offline gracefully');
  it('should handle API errors with user-friendly messages');
  it('should preserve localStorage as fallback');
});
```

### Phase 1 Deliverables

- ✅ Backend API with 5 endpoints
- ✅ MariaDB database with Prisma
- ✅ Docker Compose setup for all services
- 🟡 Comprehensive test suite (>80% coverage)
- ✅ "Save to Cloud" button in UI
- ❌ "Load from Cloud" button in UI
- ✅ Error handling and user feedback
- 🟡 Documentation (README, API docs)

### Phase 1 Implementation Reality Check (as of Feb 28, 2026)

- ✅ Implemented: Guest-ID based cloud save/list/get/update/delete API (`/api/projects`)
- ✅ Implemented: Frontend cloud-save integration in save settings and auto-save flow
- ✅ Implemented: Health checks, Prisma schema, and Docker Compose stack
- 🟡 Partial: WebSocket server initialized but only connection/disconnection placeholder logic
- ❌ Missing for "basic cloud storage" completion: user-facing cloud project browser + "Load from Cloud" flow
- ❌ Not started: Phase 2 auth, Phase 3 collaboration permissions/invites, Phase 4 real-time sync events

### Phase 1 Timeline Estimate
- **Setup & Configuration:** 2-3 days
- **Backend Development:** 3-4 days
- **Frontend Integration:** 2-3 days
- **Testing:** 2-3 days
- **Documentation:** 1 day
- **Total:** 10-14 days

---

## Phase 2: Authentication & User Management

**Goal:** Replace guest IDs with real user accounts  
**Status:** 📋 Planned — Not yet started  
**Prerequisites:** Phase 1 complete (cloud save working with guestId)  
**Estimated effort:** 3–4 weeks

### 2.0 What Already Exists (Inventory)

Before writing any code, note what's already in place:

| Asset | Location | Notes |
|-------|----------|-------|
| `bcrypt` ^5.1.1 | backend `package.json` | Installed, not imported anywhere |
| `jsonwebtoken` ^9.0.2 | backend `package.json` | Installed, not imported anywhere |
| `@types/bcrypt`, `@types/jsonwebtoken` | backend devDependencies | Types ready |
| `JWT_SECRET` env var | `docker-compose.yml` + `.env.example` | Plumbed but unused |
| `credentials: true` in CORS | `server.ts` | Already allows cookies |
| `express.json()` body parser | `server.ts` | Already configured |
| `guestId` column on `projects` | `prisma/schema.prisma` | Will be migrated to `ownerId` FK |

**Nothing needs to be installed.** All libraries are present — we just need to write the auth layer.

---

### 2.1 Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Register (email + password) | P0 | Core |
| Login → JWT pair | P0 | Core |
| Refresh token rotation | P0 | Security-critical |
| Logout (revoke refresh) | P0 | Core |
| `requireAuth` middleware | P0 | Gates every endpoint except register/login/health |
| Login screen (frontend) | P0 | New React page |
| Registration screen (frontend) | P0 | New React page |
| AuthContext + token manager | P0 | Frontend state |
| Guest → User migration | P0 | One-click claim of existing guestId projects |
| Password reset flow | P1 | Requires email transport (can defer) |
| Email verification | P2 | Optional — can ship without |
| User profile editing | P2 | Display name, avatar — cosmetic |

---

### 2.2 Authentication Architecture

#### 2.2.1 Token Strategy — Dual JWT with httpOnly Cookies

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER                                                     │
│                                                              │
│  ┌──────────────┐       ┌──────────────────────────────────┐ │
│  │ JS Memory    │       │ httpOnly Secure Cookie           │ │
│  │              │       │                                  │ │
│  │ accessToken  │       │ refreshToken                     │ │
│  │ (short-lived)│       │ (long-lived, NOT readable by JS) │ │
│  └──────┬───────┘       └──────────────┬───────────────────┘ │
│         │                              │                      │
│         ▼                              ▼                      │
│  Authorization: Bearer <token>    Cookie: refresh=<token>    │
│         │                              │                      │
└─────────┼──────────────────────────────┼──────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXPRESS BACKEND                                             │
│                                                              │
│  requireAuth middleware        POST /api/auth/refresh        │
│  ─ reads Authorization header  ─ reads httpOnly cookie       │
│  ─ verifies accessToken JWT    ─ verifies refreshToken JWT   │
│  ─ attaches req.user           ─ issues NEW accessToken      │
│  ─ rejects 401 if expired      ─ rotates refreshToken        │
│                                ─ revokes old refreshToken     │
└─────────────────────────────────────────────────────────────┘
```

**Why this split?**

| Concern | Access Token (memory) | Refresh Token (httpOnly cookie) |
|---------|-----------------------|---------------------------------|
| XSS attack steals it? | Possible but short-lived (15 min) | **No** — JS cannot read httpOnly cookies |
| CSRF attack uses it? | **No** — not sent automatically | Possible, but mitigated by SameSite=Strict + CSRF token |
| Lifespan | 15 minutes | 7 days |
| Stored where | React state (`AuthContext`) | Browser cookie jar |
| Survives page refresh? | No — must call `/api/auth/refresh` on mount | Yes |

#### 2.2.2 Token Payloads

**Access Token** (15 min, signed with `JWT_SECRET`):
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token** (7 days, signed with `JWT_REFRESH_SECRET`):
```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "family": "token-family-uuid",
  "iat": 1234567890,
  "exp": 1235172690
}
```

The `family` field enables **refresh token rotation with replay detection** —
if the same family produces two refresh attempts, all tokens in that family are
revoked (indicates token theft).

#### 2.2.3 Cookie Configuration

```typescript
res.cookie('refresh', refreshToken, {
  httpOnly: true,          // JS cannot read it
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'strict',      // not sent on cross-site requests
  path: '/api/auth',       // only sent to auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in ms
});
```

**`path: '/api/auth'`** is important — the refresh cookie is only sent when the
browser calls `/api/auth/refresh` or `/api/auth/logout`, not on every API call.
This limits CSRF surface area.

---

### 2.3 Encryption & Data Protection

#### 2.3.1 Password Hashing

```
User password  ──►  bcrypt.hash(password, 12)  ──►  $2b$12$... stored in DB
                         │
                         ├── 12 salt rounds (~250ms on modern hardware)
                         ├── Adaptive — increase rounds as CPUs get faster
                         └── Each hash includes unique random salt
```

- **Algorithm:** bcrypt (already in `package.json`)
- **Cost factor:** 12 rounds minimum (configurable via env `BCRYPT_ROUNDS`)
- **Verification:** `bcrypt.compare(plaintext, hash)` — never decrypt, always re-hash and compare
- **Password rules enforced at API level (Zod schema):**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
  - Maximum 128 characters (prevent bcrypt DoS with very long inputs)

#### 2.3.2 Encryption of User Data at Rest

Novel content is personal/creative data and should be encrypted in the database
so that a database breach does not expose raw manuscript text.

**Strategy: Application-level AES-256-GCM encryption on the `data` JSON column**

```
┌─────────────────────────────────────────────────────────────┐
│  Application Layer                                           │
│                                                              │
│  SAVE:                                                       │
│  JSON.stringify(appState)                                    │
│    ──► compress (optional, gzip)                             │
│    ──► AES-256-GCM encrypt with per-row IV                   │
│    ──► base64 encode                                         │
│    ──► store in projects.data_encrypted (LONGTEXT)           │
│    ──► store IV + authTag in projects.encryption_meta (JSON) │
│                                                              │
│  LOAD:                                                       │
│    ◄── read data_encrypted + encryption_meta                 │
│    ◄── base64 decode                                         │
│    ◄── AES-256-GCM decrypt using IV + authTag                │
│    ◄── decompress (if compressed)                            │
│    ◄── JSON.parse → AppState                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key management options (decide before implementation):**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A) Single server key** (`DATA_ENCRYPTION_KEY` env var) | Simple, one key to manage | Key compromise = all data exposed | Good for self-hosted / v1 |
| **B) Per-user derived key** (HKDF from master key + userId) | Different key per user, limits blast radius | Slightly more complex | Better for multi-tenant |
| **C) User-password-derived key** (PBKDF2 from user password) | True zero-knowledge — server can't read data | Password change = re-encrypt everything. Password reset = data loss. | Too complex for v1 |

**Recommendation for v1:** Option **B — per-user derived key**.

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

// Derive per-user key from master key
function deriveUserKey(masterKey: Buffer, userId: string): Buffer {
  return createHmac('sha256', masterKey).update(userId).digest();
  // Returns 32-byte key unique to this user
}

// Encrypt
function encryptData(plaintext: string, userKey: Buffer): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', userKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

// Decrypt
function decryptData(ciphertext: string, iv: string, authTag: string, userKey: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', userKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**New env var required:**
```env
DATA_ENCRYPTION_KEY=<64-hex-char-random-key>  # 32 bytes = 256 bits
```

Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### 2.3.3 What Gets Encrypted vs. What Stays Plaintext

| Column | Encrypted? | Why |
|--------|-----------|-----|
| `projects.data` (novel JSON) | **Yes** — AES-256-GCM | Contains manuscript text, character details, private creative content |
| `projects.title` | **No** — plaintext | Needed for listing/searching projects without decryption |
| `users.email` | **No** — plaintext | Needed for login lookup, password reset |
| `users.password_hash` | N/A — bcrypt hash, not reversible | Already one-way |
| `users.display_name` | **No** — plaintext | Non-sensitive, used in UI |
| `refresh_tokens.token` | **Hashed** (SHA-256) | Stored as hash, compared by hash — prevents DB leak = token theft |

#### 2.3.4 Refresh Token Storage

Refresh tokens are **hashed before storage** in the database:

```typescript
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// On login: store hash, send raw token in cookie
const rawToken = jwt.sign(payload, REFRESH_SECRET);
await prisma.refreshToken.create({ data: { tokenHash: hashToken(rawToken), ... } });
res.cookie('refresh', rawToken, { httpOnly: true, ... });

// On refresh: hash the incoming cookie, look up in DB
const incoming = req.cookies.refresh;
const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(incoming) } });
```

This means a database dump does **not** reveal usable refresh tokens.

---

### 2.4 Database Schema Changes

#### 2.4.1 New Prisma Models

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  displayName  String?   @map("display_name") @db.VarChar(255)
  createdAt    DateTime  @default(now()) @map("created_at")
  lastLogin    DateTime? @map("last_login")

  projects      Project[]
  refreshTokens RefreshToken[]

  @@index([email])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash") @db.VarChar(64)
  family    String   @db.VarChar(36)  // for rotation replay detection
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  revoked   Boolean  @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([family])
  @@map("refresh_tokens")
}
```

#### 2.4.2 Project Table Migration

```prisma
model Project {
  id              String   @id @default(uuid())
  ownerId         String   @map("owner_id") @db.VarChar(36)
  guestId         String?  @map("guest_id") @db.VarChar(36)  // nullable during migration period
  title           String   @db.VarChar(500)
  dataEncrypted   String?  @map("data_encrypted") @db.LongText  // AES-256-GCM ciphertext
  encryptionMeta  Json?    @map("encryption_meta")  // { iv, authTag, algorithm }
  data            Json?    @db.Json  // legacy unencrypted — removed after migration
  version         String   @default("2.2.0") @db.VarChar(10)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@index([guestId])
  @@map("projects")
}
```

**Migration steps (non-destructive):**
1. Add `User`, `RefreshToken` models. Add `ownerId`, `dataEncrypted`, `encryptionMeta` columns.
2. Make `guestId` nullable (was required).
3. Deploy migration. Old projects keep their `guestId` + unencrypted `data`.
4. When a user claims a guestId's projects, set `ownerId` and encrypt `data` → `dataEncrypted`.
5. After migration window (e.g. 90 days), drop `guestId` column and `data` column.

---

### 2.5 API Endpoints — Auth Routes

All auth routes are under `/api/auth`. A new Express router file: `src/routes/auth.ts`.

#### 2.5.1 Register

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MySecureP4ss!",
  "displayName": "Jane Doe"        // optional
}

Response 201:
{
  "user": { "id": "uuid", "email": "...", "displayName": "..." },
  "accessToken": "eyJ..."
}
+ Set-Cookie: refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth

Response 409: { "error": "Email already registered" }
Response 422: { "error": "Password must be at least 8 characters..." }
```

**Server logic:**
1. Validate input (Zod schema)
2. Check email uniqueness
3. `bcrypt.hash(password, 12)`
4. Create `User` row
5. Generate access token (15 min) + refresh token (7 days)
6. Hash refresh token → store in `refresh_tokens` table
7. Set refresh cookie, return access token in body

#### 2.5.2 Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MySecureP4ss!"
}

Response 200:
{
  "user": { "id": "uuid", "email": "...", "displayName": "..." },
  "accessToken": "eyJ..."
}
+ Set-Cookie: refresh=<token>; HttpOnly; ...

Response 401: { "error": "Invalid email or password" }
```

**Server logic:**
1. Find user by email
2. `bcrypt.compare(password, user.passwordHash)`
3. If match: generate token pair, set cookie, return access token
4. If no match: generic "Invalid email or password" (don't reveal which)
5. Update `lastLogin` timestamp

#### 2.5.3 Refresh

```
POST /api/auth/refresh
Cookie: refresh=<token>

Response 200:
{
  "accessToken": "eyJ..."
}
+ Set-Cookie: refresh=<new-token>; HttpOnly; ...

Response 401: { "error": "Invalid or expired refresh token" }
```

**Server logic (with rotation + replay detection):**
1. Read `refresh` from httpOnly cookie
2. Verify JWT signature + expiry
3. Hash token → look up in `refresh_tokens` table
4. If not found or revoked → **possible token theft** → revoke ALL tokens in this `family` → 401
5. If found and valid → revoke this token → issue new token pair in same `family`
6. Set new refresh cookie, return new access token

#### 2.5.4 Logout

```
POST /api/auth/logout
Cookie: refresh=<token>
Authorization: Bearer <accessToken>

Response 200: { "success": true }
+ Set-Cookie: refresh=; HttpOnly; Max-Age=0  (clear cookie)
```

**Server logic:**
1. Read refresh cookie → hash → revoke in DB
2. Clear cookie with `Max-Age=0`

#### 2.5.5 Get Current User

```
GET /api/auth/me
Authorization: Bearer <accessToken>

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "createdAt": "2026-02-28T...",
    "lastLogin": "2026-02-28T..."
  }
}
```

---

### 2.6 Backend Middleware

#### 2.6.1 `requireAuth` Middleware

```
New file: src/middleware/auth.ts

Every request (except /api/auth/register, /api/auth/login, /api/auth/refresh, /api/health):
  1. Read Authorization header → extract Bearer token
  2. jwt.verify(token, JWT_SECRET)
  3. If valid → attach req.user = { id, email, displayName }
  4. If expired or invalid → 401 { error: "Authentication required" }
```

Applied in `server.ts`:
```typescript
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/novels',   requireAuth, novelRoutes);   // future
```

#### 2.6.2 Rate Limiting (Auth-specific)

```
/api/auth/login      → 5 attempts per 15 minutes per IP (prevent brute force)
/api/auth/register   → 3 attempts per hour per IP (prevent spam)
/api/auth/refresh    → 30 per minute per IP (normal usage)
/api/auth/forgot-password → 3 per hour per email (prevent abuse)
```

---

### 2.7 Frontend — Login & Registration UI

#### 2.7.1 New Files

```
src/
├── context/
│   └── AuthContext.tsx              # Auth state + token management
├── components/
│   ├── pages/
│   │   ├── LoginPage.tsx            # Login form
│   │   ├── RegisterPage.tsx         # Registration form
│   │   └── ClaimProjectsPage.tsx    # Guest → User migration
│   └── atoms/
│       └── ProtectedRoute.tsx       # Redirects to login if not authed
├── services/
│   └── authService.ts              # API calls to /api/auth/*
└── hooks/
    └── useAuth.ts                  # Convenience hook for AuthContext
```

#### 2.7.2 AuthContext Design

```typescript
interface AuthState {
  user: { id: string; email: string; displayName: string } | null;
  accessToken: string | null;
  isLoading: boolean;       // true while checking refresh on mount
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}
```

**Lifecycle:**
```
App mounts
  └── AuthProvider mounts
        └── Calls POST /api/auth/refresh (cookie sent automatically)
              ├── Success → set user + accessToken → render app
              └── Failure → set isAuthenticated=false → show LoginPage
```

**Silent refresh (keep user logged in):**
```
- On mount: call /api/auth/refresh
- Set a timer for (accessToken.exp - 60 seconds) to refresh proactively
- On 401 from any API call: try refresh once, retry original request
- If refresh fails: logout, redirect to login
```

#### 2.7.3 Login Page — UI Specification

```
┌──────────────────────────────────────────┐
│          ✦  Maria Writer                 │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  Email                           │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ user@example.com         │    │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  Password                        │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ ••••••••          👁️     │    │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  ☐ Remember me                   │   │
│   │                                  │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │       Sign In             │   │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  Forgot password?                │   │
│   │                                  │   │
│   │  ─────── or ───────             │   │
│   │                                  │   │
│   │  Don't have an account?          │   │
│   │  Create one →                    │   │
│   │                                  │   │
│   │  ─────── or ───────             │   │
│   │                                  │   │
│   │  Continue as Guest →             │   │
│   │  (local storage only, no cloud)  │   │
│   └──────────────────────────────────┘   │
│                                          │
│   Themed with current app theme colors.  │
│   Uses existing SCSS module pattern.     │
└──────────────────────────────────────────┘
```

**Behaviour:**
- "Remember me" → extends refresh token to 30 days instead of 7
- "Continue as Guest" → skips auth, uses current guestId flow, cloud save disabled
- Form validation inline (email format, password minimum length)
- Error messages appear below inputs, not as alerts
- Loading spinner on submit button while API call in progress
- After successful login → redirect to main editor

#### 2.7.4 Registration Page — UI Specification

```
┌──────────────────────────────────────────┐
│          ✦  Maria Writer                 │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  Create your account             │   │
│   │                                  │   │
│   │  Display Name (optional)         │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ Jane Doe                 │    │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  Email                           │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ user@example.com         │    │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  Password                        │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ ••••••••          👁️     │    │   │
│   │  └──────────────────────────┘    │   │
│   │  ▓▓▓▓▓▓▓▓░░ Strong              │   │
│   │                                  │   │
│   │  Confirm Password               │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │ ••••••••                 │    │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  ┌──────────────────────────┐    │   │
│   │  │     Create Account        │   │   │
│   │  └──────────────────────────┘    │   │
│   │                                  │   │
│   │  Already have an account?        │   │
│   │  Sign in →                       │   │
│   └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

**Behaviour:**
- Password strength meter (visual bar, not a hard requirement beyond minimum rules)
- Confirm password must match before submit enabled
- On success → auto-login → check for existing guestId projects → offer migration
- After success, if `localStorage` has `maria_guest_id` → redirect to Claim Projects page

#### 2.7.5 Claim Projects Page (Guest → User Migration)

```
┌──────────────────────────────────────────┐
│  ✦ Welcome, Jane!                        │
│                                          │
│  We found projects saved on this device  │
│  under your guest session. Would you     │
│  like to link them to your account?      │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ☑ "My Fantasy Novel"             │    │
│  │   Last edited: Feb 28, 2026       │    │
│  │   12 chapters, 45,000 words       │    │
│  ├──────────────────────────────────┤    │
│  │ ☑ "Short Story Collection"        │    │
│  │   Last edited: Feb 15, 2026       │    │
│  │   3 chapters, 8,200 words         │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────┐  ┌──────────────┐      │
│  │  Claim All   │  │  Skip        │      │
│  └──────────────┘  └──────────────┘      │
│                                          │
│  These projects will be encrypted and    │
│  stored securely in your account.        │
└──────────────────────────────────────────┘
```

**Server logic for claim:**
1. `GET /api/projects?guestId=<old-guest-id>` → list unclaimed projects
2. For each selected project:
   - Decrypt if encrypted (shouldn't be yet in Phase 1 data)
   - Re-encrypt with user's derived key
   - Set `ownerId = user.id`
   - Optionally clear `guestId`
3. Remove `maria_guest_id` from localStorage

---

### 2.8 Application Routing

#### 2.8.1 Route Structure

```
/login           → LoginPage        (public)
/register        → RegisterPage     (public)
/claim-projects  → ClaimProjectsPage (authenticated, one-time)
/                → MainLayout       (authenticated OR guest)
```

**Implementation approach — no React Router needed yet:**

Since Maria Writer is a single-page editor, we don't need a full router. Instead:

```typescript
// In App.tsx
function App() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  // If not authed and not guest → show login
  if (!isAuthenticated && !isGuest) return <LoginPage />;

  // If authed and has unclaimed projects → show claim page
  if (isAuthenticated && hasUnclaimedProjects) return <ClaimProjectsPage />;

  // Otherwise → main editor
  return <MainLayout />;
}
```

No URL routing needed — state-driven page switching. We can add React Router
later for Phase 3 (collaboration invite links need URLs like `/invite/:token`).

---

### 2.9 Updating Existing API Calls

#### 2.9.1 Frontend `cloudStorage.ts` Changes

All existing cloud API calls currently pass `guestId` as a query parameter.
After Phase 2, they switch to using the access token in the `Authorization` header:

```
BEFORE (Phase 1 — current):
  GET /api/projects?guestId=abc-123
  Authorization: (none)

AFTER (Phase 2):
  GET /api/projects
  Authorization: Bearer eyJ...
  (server extracts userId from token — no guestId needed)
```

The `cloudStorage.ts` service will be updated to:
1. Accept an `accessToken` parameter (or read from AuthContext)
2. Set `Authorization: Bearer ${token}` on all requests
3. Remove `guestId` from query strings
4. Handle 401 → trigger token refresh → retry

#### 2.9.2 Backend Controller Changes

`projectController.ts` currently reads `guestId` from query/body.
After Phase 2, it reads `req.user.id` (set by `requireAuth` middleware):

```
BEFORE: const guestId = req.query.guestId;
AFTER:  const userId = req.user.id;  // set by requireAuth
```

---

### 2.10 Environment Variables (New)

```env
# Existing
JWT_SECRET=<min-32-chars>            # Signs access tokens

# New
JWT_REFRESH_SECRET=<min-32-chars>    # Signs refresh tokens (different from access!)
DATA_ENCRYPTION_KEY=<64-hex-chars>   # 256-bit AES key for novel data
BCRYPT_ROUNDS=12                     # Tunable cost factor
```

Update `.env.example` and `docker-compose.yml` with these new variables.

---

### 2.11 Migration Strategy (guestId → userId)

**Phase 2a (deploy auth, keep guestId working):**
- Deploy User + RefreshToken tables
- Deploy auth routes + requireAuth middleware
- `requireAuth` middleware allows both: valid JWT **or** valid guestId header (backward compat)
- Frontend shows login page but also "Continue as Guest" option
- Guest flow works exactly as before

**Phase 2b (encourage migration):**
- After login/register, Claim Projects page migrates guestId projects
- Backend: `UPDATE projects SET owner_id = :userId WHERE guest_id = :guestId`
- Encrypt data column during migration
- Add banner for guest users: "Create an account to enable cloud sync"

**Phase 2c (deprecate guestId):**
- Remove "Continue as Guest" cloud save option (local-only still works for guests)
- Set deadline for guestId project access (e.g. 90 days)
- After deadline: migration to drop `guest_id` column and unencrypted `data` column

---

### 2.12 Testing Plan

#### Backend Tests

| Test file | What it covers |
|-----------|---------------|
| `tests/unit/auth.service.test.ts` | Password hashing, token generation, token validation, rotation logic |
| `tests/unit/encryption.service.test.ts` | AES encrypt/decrypt round-trip, per-user key derivation, corrupted data handling |
| `tests/integration/auth.test.ts` | Register, login, refresh, logout full flows, rate limiting, replay detection |
| `tests/integration/projects.auth.test.ts` | Projects CRUD with JWT (replaces guestId tests), 401 on missing/expired token |

#### Frontend Tests

| Test file | What it covers |
|-----------|---------------|
| `AuthContext.test.tsx` | Login/logout state transitions, silent refresh on mount, token expiry handling |
| `LoginPage.test.tsx` | Form validation, error display, submit flow, "Continue as Guest" |
| `RegisterPage.test.tsx` | Form validation, password strength, confirm match, success → redirect |
| `ClaimProjectsPage.test.tsx` | Project list display, selective claim, skip flow |
| `authService.test.ts` | API calls, cookie handling, 401 retry logic |

#### Security Tests

| Test | What it verifies |
|------|-----------------|
| Refresh token replay | Using a consumed refresh token revokes entire family |
| Expired access token | Returns 401, not stale data |
| Wrong password timing | bcrypt comparison takes same time for valid vs invalid email (timing attack prevention) |
| SQL injection in email | Prisma parameterized queries prevent it |
| XSS in displayName | Sanitized on output |
| CSRF on auth endpoints | SameSite=Strict cookie + no cookie on non-auth paths |
| Password in logs | Ensure password never appears in Winston logs |

---

### 2.13 Implementation Order

```
Step 1:  Prisma schema migration (User, RefreshToken, Project changes)     ~ 0.5 day
Step 2:  Encryption service (encrypt/decrypt/deriveKey)                     ~ 1 day
Step 3:  Auth service (register, login, token generation, rotation)         ~ 2 days
Step 4:  Auth routes + requireAuth middleware                               ~ 1 day
Step 5:  Backend tests for auth + encryption                                ~ 1.5 days
Step 6:  Frontend AuthContext + authService                                 ~ 1 day
Step 7:  LoginPage + RegisterPage components + styles                       ~ 2 days
Step 8:  Wire up ProtectedRoute, update App.tsx routing                     ~ 0.5 day
Step 9:  Update cloudStorage.ts to use Bearer tokens                        ~ 0.5 day
Step 10: ClaimProjectsPage + guest migration API                            ~ 1 day
Step 11: Frontend tests                                                     ~ 1.5 days
Step 12: End-to-end manual testing in Docker                                ~ 1 day
Step 13: Update SETUP_GUIDE.md + README                                     ~ 0.5 day
                                                                    Total: ~14 days
```

---

### 2.14 Open Questions — DECIDED (Feb 28, 2026)

| # | Question | Decision | Detail |
|---|----------|----------|--------|
| 1 | Email verification required? | **Skip for v1** | Email used as username only. No verification email. Add email verification later as a separate feature. |
| 2 | Password reset mechanism? | **Admin role resets passwords** | No self-service password reset for v1. Instead, add an **Admin role** with a user management modal. Admin can: list all users, search by email, view minimal profile, and reset any user's password. Requires a conditional "Admin" button on the main screen visible only to admin users. See §2.15 below for full spec. |
| 3 | Data encryption key management? | **Per-user derived key** (Option B) | HKDF from master `DATA_ENCRYPTION_KEY` + userId. Good security/complexity balance. |
| 4 | Guest mode after auth ships? | **Guest = local-only** (Option B) | Guest users can use the app with localStorage only. Login required for: cloud save/load, viewing other users' books in read-only/comment/write modes. Cloud sync button hidden for guests. |
| 5 | Cookie name? | **`maria_rt`** | Namespaced to avoid collisions with other apps on same domain. |
| 6 | Add React Router now? | **Yes — add router in Phase 2** (Option A) | Add `react-router-dom` now. Routes: `/login`, `/register`, `/claim-projects`, `/admin/users` (admin only), `/` (editor). Needed for admin panel and future invite links. |

---

### 2.15 Admin Role — User Management (NEW)

**Triggered by:** Decision #2 — admin-based password reset instead of email-based self-service.

#### 2.15.1 Admin Flag

Add an `isAdmin` boolean to the `User` model:

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  displayName  String?   @map("display_name") @db.VarChar(255)
  isAdmin      Boolean   @default(false) @map("is_admin")
  createdAt    DateTime  @default(now()) @map("created_at")
  lastLogin    DateTime? @map("last_login")
  // ... relations
}
```

**First admin creation:** Seed script or direct SQL:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com';
```

The access token payload gains an `isAdmin` field:
```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "displayName": "Admin",
  "isAdmin": true,
  "type": "access"
}
```

#### 2.15.2 Admin API Endpoints

```
GET    /api/admin/users              # List all users (paginated, searchable)
GET    /api/admin/users/:id          # Get user profile (minimal)
PUT    /api/admin/users/:id/password # Reset user's password
```

All gated by `requireAdmin` middleware (checks `req.user.isAdmin === true`).

**`GET /api/admin/users`** query params:
- `search` — filter by email (LIKE '%search%')
- `page` — page number (default 1)
- `limit` — per page (default 20, max 100)

Response:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "isAdmin": false,
      "createdAt": "2026-02-28T...",
      "lastLogin": "2026-02-28T...",
      "projectCount": 3
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

**`PUT /api/admin/users/:id/password`**:
```json
// Request
{ "newPassword": "NewSecureP4ss!" }

// Response 200
{ "success": true, "message": "Password updated" }
```

Server logic:
1. Validate `newPassword` with same Zod schema as registration
2. `bcrypt.hash(newPassword, 12)`
3. Update user's `passwordHash`
4. Revoke ALL of that user's refresh tokens (force re-login)
5. Log the action: "Admin {adminId} reset password for user {userId}"

#### 2.15.3 Admin UI — Main Screen Button

```
TopBar (when logged in as admin):
┌──────────────────────────────────────────────────────────┐
│  ✦ Maria Writer   [Open] [Save💾] [Meta📋] [Admin👤]    │
└──────────────────────────────────────────────────────────┘
                                              ▲
                                              │
                              Only visible when isAdmin=true
                              Opens AdminUsersModal
```

#### 2.15.4 Admin Users Modal — UI Specification

```
┌────────────────────────────────────────────────────┐
│  User Management                            [✕]   │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔍 Search by email...                        │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  jane@example.com                             │  │
│  │  Jane Doe · 3 projects · Last login: Feb 28   │  │
│  │                          [Reset Password]     │  │
│  ├──────────────────────────────────────────────┤  │
│  │  bob@example.com                              │  │
│  │  Bob Smith · 1 project · Last login: Feb 20   │  │
│  │                          [Reset Password]     │  │
│  ├──────────────────────────────────────────────┤  │
│  │  alice@example.com                            │  │
│  │  Alice · 5 projects · Last login: Feb 27      │  │
│  │                          [Reset Password]     │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ◀ Page 1 of 3 ▶                                   │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Reset Password flow within modal:**
1. Admin clicks [Reset Password] on a user row
2. Inline expansion shows password input + confirm input
3. Admin enters new password → clicks [Confirm Reset]
4. Confirmation dialog: "Reset password for jane@example.com? They will be logged out."
5. On success: toast notification "Password reset successfully"
6. User's sessions are invalidated — they must log in with new password

#### 2.15.5 Admin-Related Files

```
Backend:
  src/routes/admin.ts                    # Admin route definitions
  src/controllers/adminController.ts     # Admin business logic
  src/middleware/requireAdmin.ts          # isAdmin check middleware
  tests/integration/admin.test.ts        # Admin endpoint tests

Frontend:
  src/components/organisms/AdminUsersModal.tsx   # User management modal
  src/components/organisms/AdminUsersModal.module.scss
  src/services/adminService.ts                   # API calls to /api/admin/*
```

#### 2.15.6 Security Considerations for Admin

- `requireAdmin` is a separate middleware, not just a route guard — defense in depth
- Admin actions are logged with admin userId + target userId + timestamp
- Admin cannot delete users in v1 (only reset passwords) — prevents accidental data loss
- Admin cannot change their own admin status via API — must be done via SQL
- Rate limit admin password resets: 10 per minute per admin (prevent bulk resets)

---

## Phase 3: Collaboration Features

**Goal:** Allow multiple users to work on same novel

### Features

#### 3.1 Novel Sharing
- Owner can invite collaborators by email
- Three permission levels:
  - **Read:** View only
  - **Comment:** View + add comments
  - **Edit:** View + comment + modify content

#### 3.2 Invitation System
- Send email invitations with secure tokens
- Pending invitations list
- Accept/decline invitations
- Invitation expiry (7 days)

#### 3.3 Permission Management
- Owner can change collaborator permissions
- Owner can remove collaborators
- Collaborators can leave projects
- Only owner can delete projects

### Database Schema (New Tables)

```sql
CREATE TABLE novel_collaborators (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    can_read BOOLEAN DEFAULT TRUE,
    can_comment BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by VARCHAR(36),
    accepted_at TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_novel_user (novel_id, user_id)
);

CREATE TABLE invitations (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(36) NOT NULL,
    can_read BOOLEAN DEFAULT TRUE,
    can_comment BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_email (email)
);
```

### Permission Middleware

```typescript
// Backend middleware
async function checkPermission(
  userId: string, 
  novelId: string, 
  requiredPermission: 'read' | 'comment' | 'edit' | 'owner'
): Promise<boolean> {
  // Check if user is owner
  const novel = await prisma.novel.findUnique({ 
    where: { id: novelId } 
  });
  
  if (novel?.ownerId === userId) return true;
  
  // Check collaborator permissions
  const collab = await prisma.novelCollaborator.findUnique({
    where: { novelId_userId: { novelId, userId } }
  });
  
  if (!collab) return false;
  
  switch (requiredPermission) {
    case 'read': return collab.canRead;
    case 'comment': return collab.canComment;
    case 'edit': return collab.canEdit;
    default: return false;
  }
}
```

### New API Endpoints

```typescript
// Collaboration management
GET    /api/novels/:id/collaborators
POST   /api/novels/:id/invite
PUT    /api/novels/:id/collaborators/:userId
DELETE /api/novels/:id/collaborators/:userId

// Invitation management
GET    /api/invitations                    # User's pending invitations
POST   /api/invitations/:token/accept
DELETE /api/invitations/:token             # Decline
```

### UI Changes
- "Share" button in novel view
- Invitation modal with email input + checkboxes
- Collaborators list with permission badges
- Pending invitations badge
- Read-only mode when user has no edit permission
- Hide comment features when user has no comment permission

---

## Phase 4: Real-Time Sync with WebSockets

**Goal:** Real-time collaboration without page refreshes

### Features
- Auto-save every 3 seconds
- Real-time updates from other users
- Presence indicators (who's online)
- Cursor/selection sharing (optional for v2)
- Conflict resolution

### WebSocket Events

```typescript
// Client -> Server
socket.emit('join-novel', { novelId, userId, token });
socket.emit('leave-novel', { novelId });
socket.emit('chapter-update', { chapterId, content, userId });
socket.emit('character-update', { characterId, updates, userId });
socket.emit('heartbeat', { userId });

// Server -> Client
socket.on('novel-update', { type, data, userId, timestamp });
socket.on('user-joined', { userId, displayName });
socket.on('user-left', { userId });
socket.on('presence-update', { activeUsers: User[] });
socket.on('sync-error', { message, code });
```

### Conflict Resolution Strategy

**Optimistic UI Updates:**
1. User makes change → Update UI immediately
2. Send change to server via WebSocket
3. Server broadcasts to other users
4. If conflict detected, server wins
5. Show notification to user about overridden changes

**Last-Write-Wins:**
- Simple strategy for Phase 1
- Timestamp-based conflict resolution
- Works well for most use cases
- Can upgrade to OT/CRDT later if needed

### Implementation

**Backend Changes:**
```typescript
// Socket.io setup
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN }
});

io.use(authenticateSocket); // Verify JWT

io.on('connection', (socket) => {
  socket.on('join-novel', async ({ novelId, userId }) => {
    // Verify permission
    const hasAccess = await checkPermission(userId, novelId, 'read');
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }
    
    socket.join(`novel:${novelId}`);
    
    // Broadcast user joined
    socket.to(`novel:${novelId}`).emit('user-joined', {
      userId,
      displayName: socket.data.displayName
    });
  });

  socket.on('chapter-update', async (data) => {
    // Verify edit permission
    // Save to database
    // Broadcast to room
    socket.to(`novel:${data.novelId}`).emit('novel-update', {
      type: 'chapter-update',
      data,
      userId: socket.data.userId,
      timestamp: Date.now()
    });
  });
});
```

**Frontend Changes:**
```typescript
// WebSocket context
import io from 'socket.io-client';

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;
    
    const newSocket = io(API_URL, {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    newSocket.on('novel-update', (update) => {
      dispatch({ type: 'APPLY_REMOTE_UPDATE', payload: update });
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [user, token]);
  
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}
```

### Auto-Save Strategy

```typescript
// Debounced auto-save
useEffect(() => {
  if (!activeChapter || !socket) return;
  
  const timeoutId = setTimeout(() => {
    socket.emit('chapter-update', {
      novelId: state.novelId,
      chapterId: activeChapter.id,
      content: content,
      timestamp: Date.now()
    });
  }, 3000);
  
  return () => clearTimeout(timeoutId);
}, [content, activeChapter?.id]);
```

---

## Database Schema (Complete)

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Novels (projects)
CREATE TABLE novels (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    description TEXT,
    tags JSON,
    current_date VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id)
);

-- Collaborators
CREATE TABLE novel_collaborators (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    can_read BOOLEAN DEFAULT TRUE,
    can_comment BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by VARCHAR(36),
    accepted_at TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_novel_user (novel_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_novel (novel_id)
);

-- Chapters
CREATE TABLE chapters (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT,
    chapter_order INT NOT NULL,
    chapter_date VARCHAR(50),
    related_events JSON,
    mentioned_characters JSON,
    comment_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_edited_by VARCHAR(36),
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_novel (novel_id),
    INDEX idx_order (novel_id, chapter_order)
);

-- Characters
CREATE TABLE characters (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    nicknames JSON,
    age VARCHAR(50),
    dob VARCHAR(50),
    death_date VARCHAR(50),
    gender VARCHAR(50),
    description TEXT,
    picture VARCHAR(500),
    tags JSON,
    color VARCHAR(7),
    life_events JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id)
);

-- Events
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    event_date VARCHAR(50),
    description TEXT,
    characters JSON,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id)
);

-- Relationships
CREATE TABLE relationships (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    character_ids JSON NOT NULL,
    description TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id)
);

-- Comments
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    chapter_id VARCHAR(36),
    author_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    is_suggestion BOOLEAN DEFAULT FALSE,
    replacement_text TEXT,
    is_hidden BOOLEAN DEFAULT FALSE,
    original_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id),
    INDEX idx_chapter (chapter_id),
    INDEX idx_author (author_id)
);

-- Timeline Edges
CREATE TABLE timeline_edges (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    from_event VARCHAR(36) NOT NULL,
    to_event VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id)
);

-- Timeline Configuration
CREATE TABLE timeline_config (
    novel_id VARCHAR(36) PRIMARY KEY,
    character_lane_order JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

-- Theme Customizations
CREATE TABLE theme_customizations (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    colors JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    INDEX idx_novel (novel_id)
);

-- Invitations
CREATE TABLE invitations (
    id VARCHAR(36) PRIMARY KEY,
    novel_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(36) NOT NULL,
    can_read BOOLEAN DEFAULT TRUE,
    can_comment BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_novel (novel_id)
);

-- Refresh Tokens (for JWT)
CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token)
);
```

---

## API Endpoints (Complete)

### Authentication
```
POST   /api/auth/register          # Create account
POST   /api/auth/login             # Login (returns access + refresh tokens)
POST   /api/auth/logout            # Invalidate refresh token
POST   /api/auth/refresh           # Get new access token
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password with token
GET    /api/auth/me                # Get current user info
PUT    /api/auth/profile           # Update user profile
DELETE /api/auth/account           # Delete user account
```

### Novels
```
GET    /api/novels                 # List user's novels (owned + shared)
POST   /api/novels                 # Create new novel
GET    /api/novels/:id             # Get novel with all data
PUT    /api/novels/:id             # Update novel metadata
DELETE /api/novels/:id             # Delete novel (owner only)
GET    /api/novels/:id/export      # Export novel as .maria file
```

### Chapters
```
GET    /api/novels/:novelId/chapters        # List all chapters
POST   /api/novels/:novelId/chapters        # Create chapter
GET    /api/chapters/:id                    # Get chapter
PUT    /api/chapters/:id                    # Update chapter
DELETE /api/chapters/:id                    # Delete chapter
PUT    /api/novels/:novelId/chapters/reorder # Reorder chapters
```

### Characters
```
GET    /api/novels/:novelId/characters  # List characters
POST   /api/novels/:novelId/characters  # Create character
GET    /api/characters/:id              # Get character
PUT    /api/characters/:id              # Update character
DELETE /api/characters/:id              # Delete character
```

### Events
```
GET    /api/novels/:novelId/events   # List events
POST   /api/novels/:novelId/events   # Create event
GET    /api/events/:id               # Get event
PUT    /api/events/:id               # Update event
DELETE /api/events/:id               # Delete event
```

### Relationships
```
GET    /api/novels/:novelId/relationships  # List relationships
POST   /api/novels/:novelId/relationships  # Create relationship
GET    /api/relationships/:id              # Get relationship
PUT    /api/relationships/:id              # Update relationship
DELETE /api/relationships/:id              # Delete relationship
```

### Comments
```
GET    /api/chapters/:chapterId/comments   # List comments
POST   /api/chapters/:chapterId/comments   # Create comment
PUT    /api/comments/:id                   # Update comment
DELETE /api/comments/:id                   # Delete comment
PUT    /api/comments/:id/hide              # Hide comment
```

### Timeline
```
GET    /api/novels/:novelId/timeline       # Get timeline data
PUT    /api/novels/:novelId/timeline       # Update timeline config
POST   /api/novels/:novelId/timeline/edges # Add timeline edge
DELETE /api/timeline/edges/:id             # Remove timeline edge
```

### Collaboration
```
GET    /api/novels/:novelId/collaborators           # List collaborators
POST   /api/novels/:novelId/invite                  # Invite user by email
PUT    /api/novels/:novelId/collaborators/:userId   # Update permissions
DELETE /api/novels/:novelId/collaborators/:userId   # Remove collaborator
```

### Invitations
```
GET    /api/invitations                    # Get user's pending invitations
POST   /api/invitations/:token/accept      # Accept invitation
DELETE /api/invitations/:token             # Decline invitation
```

### Health
```
GET    /api/health                         # Health check
GET    /api/health/db                      # Database connectivity check
```

---

## Security Considerations

### Password Security
- **Hashing:** bcrypt with 12 rounds minimum
- **Requirements:** 
  - Min 8 characters
  - Must include uppercase, lowercase, number
  - Optional: special character requirement
- **Storage:** Never store plaintext passwords
- **Reset:** Secure token-based reset (expires in 1 hour)

### JWT Token Security
- **Access Token:** 
  - 15 minute expiry
  - Stored in memory only
  - Contains minimal user info
- **Refresh Token:**
  - 7 day expiry
  - Stored in httpOnly cookie
  - Rotated on use
  - Stored in database for revocation
- **Secret:** Strong random secret (32+ characters)
- **Algorithm:** RS256 or HS256

### API Security
- **CORS:** Whitelist specific origins
- **Rate Limiting:**
  - Auth endpoints: 5 requests/15 min per IP
  - Read endpoints: 100 requests/min per user
  - Write endpoints: 30 requests/min per user
- **Input Validation:** Zod schemas for all inputs
- **SQL Injection:** Prevented by Prisma ORM
- **XSS Prevention:** DOMPurify on frontend, escape outputs
- **CSRF Protection:** SameSite cookies + CSRF tokens

### Permission Enforcement
- **Double Check:** Verify on frontend AND backend
- **Database Level:** Foreign keys prevent orphaned data
- **Middleware:** `requireAuth`, `requirePermission`
- **Audit Log:** Track who modified what (optional for v2)

### Data Protection
- **Encryption at Rest:** MariaDB encryption (optional)
- **Encryption in Transit:** HTTPS only in production
- **Backup Strategy:** Daily automated backups
- **Data Retention:** Define policy (GDPR compliance)

---

## Testing Strategy

### Backend Testing

**Unit Tests** (70% coverage minimum):
```typescript
// Controller tests
describe('ProjectController', () => {
  it('should create project with valid data');
  it('should reject project without title');
  it('should validate JSON structure');
});

// Service tests
describe('ProjectService', () => {
  it('should save project to database');
  it('should retrieve project by ID');
  it('should handle database errors gracefully');
});
```

**Integration Tests** (50% coverage minimum):
```typescript
describe('Projects API Integration', () => {
  it('should complete full CRUD cycle');
  it('should enforce permission checks');
  it('should handle concurrent updates');
  it('should validate request bodies');
});
```

**Load Tests:**
```typescript
describe('Performance', () => {
  it('should handle 100 concurrent saves');
  it('should handle 500 concurrent reads');
  it('should respond within 200ms (p95)');
  it('should handle 1MB payloads');
});
```

### Frontend Testing

**Component Tests:**
```typescript
describe('CloudSyncButtons', () => {
  it('should show save button');
  it('should disable during sync');
  it('should show success message');
  it('should show error message');
});
```

**Integration Tests:**
```typescript
describe('Cloud Storage Flow', () => {
  it('should save and load project');
  it('should preserve all data');
  it('should handle conflicts');
  it('should work offline (fallback to localStorage)');
});
```

### WebSocket Testing

```typescript
describe('WebSocket Sync', () => {
  it('should connect on login');
  it('should receive updates from other users');
  it('should broadcast own changes');
  it('should reconnect on disconnect');
  it('should handle conflicts gracefully');
});
```

### E2E Testing (Playwright/Cypress)

```typescript
describe('Multi-User Collaboration', () => {
  it('User A creates novel and invites User B');
  it('User B accepts invitation');
  it('User B can view but not edit (read-only)');
  it('User A upgrades User B to editor');
  it('User B can now edit chapters');
  it('Both users see changes in real-time');
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations reviewed
- [ ] Backup strategy in place
- [ ] SSL certificates ready
- [ ] DNS configured
- [ ] Monitoring setup (optional: Sentry, LogRocket)

### Production Deployment
- [ ] Run `docker-compose up -d`
- [ ] Run database migrations
- [ ] Verify health endpoints
- [ ] Test login flow
- [ ] Test save/load flow
- [ ] Monitor logs for errors
- [ ] Set up automated backups
- [ ] Configure firewall rules

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database performance
- [ ] User acceptance testing
- [ ] Document any issues
- [ ] Plan rollback strategy

---

## Migration from Current System

### For Existing Users

**Step 1: Optional Cloud Backup (Phase 1)**
- Existing users keep using localStorage
- "Save to Cloud" button appears
- Users can manually backup to cloud
- No disruption to workflow

**Step 2: Account Creation (Phase 2)**
- User creates account
- System detects localStorage data
- Prompt: "We found a novel on this device. Would you like to save it to your account?"
- One-click migration
- localStorage kept as local cache

**Step 3: Auto-Sync (Phase 4)**
- Enable auto-save to cloud
- Real-time sync across devices
- localStorage becomes cache/offline fallback

### Data Migration Script

```typescript
// Migrate localStorage to cloud
async function migrateLocalStorageToCloud() {
  const localData = loadFromLocal();
  if (!localData) return;
  
  const guestId = getOrCreateGuestId();
  
  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guestId,
      title: localData.meta.title,
      data: localData
    })
  });
  
  // Keep localStorage for offline access
}
```

---

## Future Enhancements (Post-Phase 4)

### Advanced Features
- **Versioning:** Git-like version history for chapters
- **Branching:** Alternative storylines/drafts
- **Publishing:** Export to ePub, PDF, etc.
- **AI Integration:** Writing suggestions, grammar check
- **Mobile Apps:** React Native versions
- **Offline Mode:** Full offline editing with sync on reconnect
- **Advanced Permissions:** Chapter-level permissions
- **Activity Feed:** See who changed what and when
- **Mentions:** @mention collaborators in comments
- **Rich Text Editor:** WYSIWYG editor option
- **Voice Notes:** Audio comments on chapters

### Technical Improvements
- **Operational Transform:** True concurrent editing
- **Redis Caching:** Faster reads
- **CDN:** Static asset delivery
- **Elasticsearch:** Full-text search across novels
- **Microservices:** Split into smaller services
- **GraphQL:** Alternative to REST
- **Server-Side Rendering:** SEO optimization

---

## Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **MariaDB** | Requested by stakeholder, robust, free, excellent MySQL compatibility |
| **JWT Auth** | Stateless, scalable, no external dependencies needed |
| **WebSockets** | Real-time updates essential for collaboration, lower latency than polling |
| **Prisma ORM** | Type-safe, excellent TypeScript support, auto-generates migrations |
| **Phase 1: JSON Storage** | Quick implementation, allows rollout to customers faster |
| **Guest IDs Initially** | No auth barrier in Phase 1, easier adoption |
| **Last-Write-Wins** | Simple conflict resolution, sufficient for initial version |
| **Node.js Backend** | Matches frontend tech stack, team expertise |
| **Docker Compose** | Easy local development, production-ready |

---

## Contact & Questions

For questions about this implementation plan, refer to:
- **Original Investigation:** This document, section "Current State Analysis"
- **Database Schema:** Section "Database Schema (Complete)"
- **API Specification:** Section "API Endpoints (Complete)"
- **Testing Requirements:** Section "Testing Strategy"

---

## Status Tracking

| Phase | Status | Start Date | End Date | Notes |
|-------|--------|------------|----------|-------|
| Planning | ✅ Complete | Feb 1, 2026 | Feb 1, 2026 | This document |
| Phase 1 | 🚧 In Progress | Feb 2026 | - | Backend + cloud save done; cloud load UX pending |
| Phase 2 | 📋 Detailed plan ready | - | - | Authentication — fully elaborated, ready to implement |
| Phase 3 | 📋 Planned | - | - | Collaboration |
| Phase 4 | 📋 Planned | - | - | Real-time sync |

---

**Last Updated:** February 28, 2026  
**Document Version:** 2.0  
**Author:** Development Team  
**Next Review:** Before starting Phase 2 implementation — resolve open questions in §2.14
