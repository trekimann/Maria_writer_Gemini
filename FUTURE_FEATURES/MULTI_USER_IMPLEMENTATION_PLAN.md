# Multi-User Implementation Plan for Maria Writer

**Status:** Phase 2 In Progress (Steps 1–11 Complete; next: Step 12 E2E manual testing)  
**Last Updated:** March 2, 2026  
**Decision:** JWT Authentication + WebSockets + MariaDB

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Architecture Decisions](#architecture-decisions)
3. [Phase 1: MariaDB Persistent Storage](#phase-1-mariadb-persistent-storage)
4. [Phase 2: Authentication & User Management](#phase-2-authentication--user-management)
5. [Phase 2.5: Image Storage & Media Management](#phase-25-image-storage--media-management)
6. [Phase 3: Collaboration Features](#phase-3-collaboration-features)
7. [Phase 4: Real-Time Sync](#phase-4-real-time-sync)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Security Considerations](#security-considerations)
11. [Testing Strategy](#testing-strategy)

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
- ✅ "Load from Cloud" button in UI
- ✅ Error handling and user feedback
- 🟡 Documentation (README, API docs)

### Phase 1 Implementation Reality Check (as of Mar 2, 2026)

- ✅ Implemented: Guest-ID based cloud save/list/get/update/delete API (`/api/projects`)
- ✅ Implemented: Frontend cloud-save integration in save settings and auto-save flow
- ✅ Implemented: Health checks, Prisma schema, and Docker Compose stack
- ✅ Implemented: "Load from Cloud" UI — `LoadProjectModal.tsx` has a two-tab interface ("Local File" / "Cloud"). The Cloud tab lists all guest projects via `cloudStorageService.listProjects()`, lets the user select via radio button, validates the loaded state (structure + version compatibility warnings), and dispatches `LOAD_STATE`. Full round-trip complete.
- ✅ Implemented: Encryption wired into guest cloud save/load (`projectService.ts`). AES-256-GCM keyed by `guestId`. Lazy migration — pre-2.3.0 rows fallback to plaintext on load and are re-encrypted on next save. `APP_VERSION` bumped to `2.3.0`; version compatibility warning shown inline in Load modal for older projects.
- ✅ Implemented: Auto-save of current project before cloud load (`LoadProjectModal.tsx`). Saves to localStorage always, pushes to cloud if cloud sync is enabled.
- ✅ Implemented: Help system — `HelpButton` added to `SaveSettingsModal` and `LoadProjectModal`. New help files: `save-settings.md`, `load-project.md`. z-index layering fixed so `HelpModal` renders above custom modals (z-index 1100 > 1000).
- ✅ Implemented: Guest ID recovery — `GuestRecoveryModal` accessible only via a link inside `load-project.md`. Validates UUID format before applying. `cloudStorageService.setGuestId()` persists to localStorage. Browser `window.confirm` shown before replacing current ID.
- 🟡 Partial: WebSocket server initialized but only connection/disconnection placeholder logic.
- ✅ Implemented: Phase 2 auth Steps 1–11 complete. Guest → user migration modal (`ClaimProjectsModal.tsx`), re-encryption under userId key, guestId unlinked after claim, pre-login guest state snapshot saved/restored on logout. All 650 frontend tests passing.
- ❌ Not started: Phase 3 collaboration permissions/invites, Phase 4 real-time sync events

**Phase 1 is fully complete.** All user-facing deliverables are shipped. Remaining 🟡 items (test coverage, docs) are polish, not blockers for Phase 2.

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
**Status:** In Progress — Steps 1–11 complete; next: Step 12 (end-to-end manual testing in Docker)
**Prerequisites:** Phase 1 complete (cloud save working with guestId) ✅  
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

#### 2.3.2 Encryption of User Data at Rest ✅ IMPLEMENTED (v2.3.0)

Novel content is personal/creative data and should be encrypted in the database
so that a database breach does not expose raw manuscript text.

**Strategy: Application-level AES-256-GCM encryption on the `data` JSON column**

```
┌─────────────────────────────────────────────────────────────┐
│  Application Layer                                           │
│                                                              │
│  SAVE:                                                       │
│  JSON.stringify(appState)                                    │
│    ──► AES-256-GCM encrypt with fresh 96-bit IV per row      │
│    ──► base64 encode                                         │
│    ──► store in projects.data_encrypted (LONGTEXT)           │
│    ──► store IV + authTag in projects.encryption_meta (JSON) │
│    ──► projects.data set to NULL                             │
│                                                              │
│  LOAD:                                                       │
│    ◄── read data_encrypted + encryption_meta                 │
│    ◄── base64 decode                                         │
│    ◄── AES-256-GCM decrypt using IV + authTag                │
│    ◄── JSON.parse → AppState                                 │
│    ◄── fallback: read projects.data plaintext if no          │
│        data_encrypted (lazy migration for pre-2.3.0 rows)    │
└─────────────────────────────────────────────────────────────┘
```

**Key management — implemented approach:**

| Option | Pros | Cons | Status |
|--------|------|------|--------|
| **A) Single server key** (`DATA_ENCRYPTION_KEY` env var) | Simple, one key to manage | Key compromise = all data exposed | Skipped |
| **B) Per-user derived key** (HMAC-SHA256 from master key + keyId) | Different key per user, limits blast radius | Slightly more complex | **✅ IMPLEMENTED** |
| **C) User-password-derived key** (PBKDF2 from user password) | True zero-knowledge — server can't read data | Password change = re-encrypt everything. Password reset = data loss. | Not planned for v1 |

**Implemented:** Option **B — per-user derived key** via HMAC-SHA256.

The full implementation lives in `maria-writer-backend/src/services/encryptionService.ts` (42 unit tests, all passing). Key points:

- `getMasterKey()` — reads and validates `DATA_ENCRYPTION_KEY` env var (must be 64 hex chars = 32 bytes); throws if not set or wrong length
- `deriveUserKey(masterKey, keyId)` — `HMAC-SHA256(masterKey, keyId)` → 32-byte Buffer, unique per user
- `encryptData(plaintext, userKey)` — AES-256-GCM, fresh 96-bit IV on every call; returns `{ ciphertext, iv, authTag }` as base64 strings
- `decryptData(payload, userKey)` — verifies GCM auth tag before returning plaintext; throws on tampering
- `encryptForUser(plaintext, keyId)` / `decryptForUser(payload, keyId)` — convenience wrappers that call `getMasterKey()` internally
- `isEncryptedPayload(value)` — type guard to detect encrypted vs legacy plaintext rows
- `safeEquals(a, b)` — timing-safe string comparison for token checks

**Phase 1 key identity:** `keyId = guestId` (UUID stored in browser localStorage).  
**Phase 2 auth key identity:** `keyId` will be replaced by `userId` (from DB) with no code changes to `encryptionService.ts` — only the call-site in `projectService.ts` changes.

**Lazy migration strategy (no one-time migration script):**
- Pre-2.3.0 rows have `data` populated and `data_encrypted = NULL`
- On load: if `data_encrypted` is present → decrypt; otherwise fall back to `data` plaintext
- On next cloud save: row is re-written encrypted (plaintext `data` becomes NULL, `data_encrypted` populated)
- App version check in `versionCompatibility.ts` shows an amber warning on the Load modal for projects saved before v2.3.0

**`DATA_ENCRYPTION_KEY` env var (now live in docker-compose files):**
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
enum UserRole {
  USER
  EDITOR
  ADMIN
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  displayName  String?   @map("display_name") @db.VarChar(255)
  role         UserRole  @default(USER)
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

#### 2.7.5 Login Prompts in Save & Load Modals

When the user is **not authenticated** (guest mode), the Save Settings modal and
Load Project modal both show an unobtrusive inline banner encouraging account
creation. Cloud functionality is gated — the banner replaces (or sits above) the
cloud save/load controls.

**SaveSettingsModal — guest banner (in the cloud sync section):**
```
┌──────────────────────────────────────────────────────┐
│  ☁ Cloud Sync                                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  🔒 Cloud save requires an account.          │    │
│  │  Sign in  or  Create a free account           │    │
│  │  to enable cloud backup across devices.      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  (cloud sync toggle + last saved info hidden)        │
└──────────────────────────────────────────────────────┘
```

**LoadProjectModal — guest banner (in the Cloud tab):**
```
┌──────────────────────────────────────────────────────┐
│  [Local File]  [Cloud ☁]                             │
│  ─────────────────────────────────────────────────   │
│  ┌──────────────────────────────────────────────┐    │
│  │  🔒 Sign in to access your cloud projects.   │    │
│  │  Sign in  or  Create a free account           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  (project list hidden — replaced by banner above)    │
└──────────────────────────────────────────────────────┘
```

**Behaviour:**
- "Sign in" link → navigates to `/login` (closes modal first)
- "Create a free account" link → navigates to `/register`
- Links use React Router navigation (`useNavigate`), not hard page reloads
- Banner styling uses existing modal info/warning colour tokens to stay themed
- After login the user returns to the same modal context (store the intended
  destination in `AuthContext` so post-login redirect reopens the right modal)

#### 2.7.6 Claim Projects Page (Guest → User Migration)

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

Steps are sequenced to reach a **prod-deployable milestone** as early as possible.
The login UI (Steps 6–8) is pulled forward to sit immediately after the backend
auth routes so a working login screen ships before tests and migration tooling.

```
Step 1:  Prisma schema migration (User, RefreshToken, Project changes)     ~ 0.5 day  ✅ DONE (Feb 28, 2026)
Step 2:  Encryption service (encrypt/decrypt/deriveKey)                     ~ 1 day    ✅ DONE (Mar 2, 2026)
Step 2a: Wire encryption into guest cloud save/load (lazy migration)        ~ 0.5 day  ✅ DONE (Mar 2, 2026)
         - APP_VERSION bumped to 2.3.0
         - 2.2.0 → 2.3.0 breaking transition added (migration warning on load)
         - projectService encrypts on write (AES-256-GCM keyed by guestId),
           decrypts on read, stores meta.appVersion in projects.version column
         - LoadProjectModal shows inline warning in cloud tab when a pre-encryption
           project is selected; appVersion preserved in metadata until next save
         - DATA_ENCRYPTION_KEY added to docker-compose.yml, docker-compose.unraid.yml,
           and .env.example
Step 3:  Auth service (register, login, token generation, rotation)         ~ 2 days   ✅ DONE (Mar 2, 2026)
         - authService.ts: register, login, refreshToken, logout handlers
         - bcrypt cost 12, JWT access (15 min) + refresh (7 day) pair
         - Refresh token rotation with replay detection (family-based revocation)
Step 4:  Auth routes + requireAuth middleware (dual-mode: Bearer OR guestId) ~ 1 day   ✅ DONE (Mar 2, 2026)
         - src/middleware/auth.ts: requireAuth (strict Bearer), optionalAuth (dual-mode)
         - src/routes/auth.ts: register, login, refresh, logout, me endpoints
         - requireAuthenticated alias exported for project routes
Step 5:  Frontend AuthContext + authService                                 ~ 1 day    ✅ DONE (Mar 2, 2026)
         - AuthContext.tsx: user, accessToken, isAuthenticated, isLoading state
         - Silent refresh on mount + proactive timer-based rotation
         - returnTo / setReturnTo for post-login redirect
         - hasPendingMigration, pendingMigrationGuestId, clearMigration (Step 10)
Step 6:  LoginPage + RegisterPage components + styles                       ~ 2 days   ✅ DONE (Mar 2, 2026)
         - Includes login prompt banners in SaveSettingsModal + LoadProjectModal
           for unauthenticated users (see §2.7.5)
         - Password strength meter, confirm field, inline error messages
         - saveGuestSnapshot() called before login/register to enable logout restore
Step 7:  Wire up React Router, update App.tsx routing                       ~ 0.5 day  ✅ DONE (Mar 2, 2026)
         - BrowserRouter added; /login, /register routes; ProtectedRoute guard

         ╔══════════════════════════════════════════════════════════╗
         ║  🚀 PROD-DEPLOYABLE MILESTONE after Step 7              ║
         ║  Users can register, log in, and use the app.           ║
         ║  Guests continue working as before (local-only).        ║
         ║  Cloud save/load still uses guestId flow until Step 9.  ║
         ╚══════════════════════════════════════════════════════════╝

Step 8:  Backend tests for auth (unit + integration)                        ~ 1.5 days ✅ DONE (Mar 2, 2026)
         - Unit: authController, authService, encryptionService, adminController
         - Integration: health, projects endpoints
Step 9:  Update cloudStorage.ts to use Bearer tokens (authenticated users)  ~ 0.5 day  ✅ DONE (Mar 2, 2026)
         - authApiService imported into CloudStorageService; authHeaders() + guestParam() helpers
         - All 5 methods (save, list, load, delete, update) send Bearer token when authed, guestId when guest
         - rotateGuestId() added; called in AuthContext.logout() so post-logout session cannot see previous user's projects
         - Delete UI added to LoadProjectModal cloud tab: trash icon per row, inline confirm panel with
           red warning, checkbox gate, and Delete Permanently button; Refresh List + Load Selected disabled during delete
Step 10: ClaimProjectsPage + guest migration API                            ~ 1 day    ✅ DONE (Mar 2, 2026)
         - Backend: GET /api/projects/claim-preview + POST /api/projects/claim
           (both requireAuthenticated; placed before /:id to avoid param clash)
         - projectService: previewGuestProjectsForClaim (metadata only) +
           claimGuestProjects (decrypt with guestId key → re-encrypt with userId key
           → UPDATE SET owner_id=userId, guest_id=NULL)
         - Frontend: ClaimProjectsModal.tsx — auto-opens on hasPendingMigration,
           silently dismisses if no guest projects found, checklist all pre-selected,
           migrate/skip/success/error phases
         - saveGuestSnapshot() / loadGuestSnapshot() in storage.ts (key: maria_guest_snapshot)
         - logout() in UserProfileModal restores snapshot state via LOAD_STATE dispatch
         - AuthContext: hasPendingMigration + pendingMigrationGuestId + clearMigration
Step 11: Frontend tests                                                     ~ 1.5 days ✅ DONE (Mar 2, 2026)
         - 650/650 tests passing across 42 test files
         - New tests: storage.test.ts (7), cloudStorage.test.ts (4),
           AuthContext.test.tsx (migration fields + clearMigration),
           UserProfileModal.test.tsx (snapshot restore), ClaimProjectsModal.test.tsx (15)
Step 12: End-to-end manual testing in Docker                                ~ 1 day    ⬜ TODO
Step 13: Update SETUP_GUIDE.md + README                                     ~ 0.5 day  ⬜ TODO
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

#### 2.15.1 User Roles

The `User` model uses a `UserRole` enum instead of a boolean flag,
allowing future expansion of access levels:

```prisma
enum UserRole {
  USER       // Default — standard user
  EDITOR     // Reserved for future use (e.g., editorial permissions)
  ADMIN      // Full admin access — user management, password resets
}

model User {
  // ...
  role         UserRole  @default(USER)
  // ...
}
```

**Role hierarchy:** `ADMIN` > `EDITOR` > `USER`. Middleware checks use
"minimum role" logic — e.g., `requireRole('ADMIN')` allows ADMIN only,
`requireRole('EDITOR')` allows EDITOR and ADMIN.

**First admin creation:** Seed script or direct SQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

The access token payload includes the `role` field:
```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "displayName": "Admin",
  "role": "ADMIN",
  "type": "access"
}
```

#### 2.15.2 Admin API Endpoints

```
GET    /api/admin/users              # List all users (paginated, searchable)
GET    /api/admin/users/:id          # Get user profile (minimal)
PUT    /api/admin/users/:id/password # Reset user's password
```

All gated by `requireRole('ADMIN')` middleware (checks `req.user.role` meets minimum level).

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
      "role": "USER",
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
                              Only visible when role === 'ADMIN'
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
  src/middleware/requireRole.ts           # Role-based access check middleware
  tests/integration/admin.test.ts        # Admin endpoint tests

Frontend:
  src/components/organisms/AdminUsersModal.tsx   # User management modal
  src/components/organisms/AdminUsersModal.module.scss
  src/services/adminService.ts                   # API calls to /api/admin/*
```

#### 2.15.6 Security Considerations for Admin

- `requireRole('ADMIN')` is a separate middleware, not just a route guard — defense in depth
- Admin actions are logged with admin userId + target userId + timestamp
- Admin cannot delete users in v1 (only reset passwords) — prevents accidental data loss
- Admin cannot change their own role via API — must be done via SQL
- Rate limit admin password resets: 10 per minute per admin (prevent bulk resets)

---

### 2.16 Guest Cloud Limits (Deferred — Implement After Step 7 Prod Deploy)

**Status:** 📋 Planned — Not yet started  
**Goal:** Prevent unbounded cloud storage by unauthenticated guests  
**When to implement:** After the prod-deployable milestone (post Step 7). Can ship as a hotfix to prod once auth is live.

#### 2.16.1 Limits

| Limit | Value | Configurable via env? |
|-------|-------|----------------------|
| Max cloud projects per guest | **2** | `GUEST_MAX_PROJECTS=2` |
| Max project data size (JSON) | **5 MB** | `GUEST_MAX_PROJECT_SIZE_MB=5` |
| Max total cloud storage per guest | 10 MB (2 × 5MB) | derived from above |

Authenticated users have higher (or no) limits — TBD in Phase 3.

#### 2.16.2 Backend Enforcement

**Project count check** — in `projectService.createOrUpdateProject` (guest path only):
```typescript
// Before creating a NEW project (not an upsert to an existing title)
const count = await prisma.project.count({ where: { guestId } });
const max = parseInt(process.env.GUEST_MAX_PROJECTS || '2', 10);
if (count >= max) {
  throw new AppError(
    `Guest accounts are limited to ${max} cloud projects. Sign in for unlimited storage.`,
    403
  );
}
```

**Project size check** — in `projectService` before encryption/storage:
```typescript
const serialised = JSON.stringify(data);
const maxBytes = parseInt(process.env.GUEST_MAX_PROJECT_SIZE_MB || '5', 10) * 1024 * 1024;
if (Buffer.byteLength(serialised, 'utf8') > maxBytes) {
  throw new AppError(
    `Project exceeds the ${process.env.GUEST_MAX_PROJECT_SIZE_MB || 5} MB guest limit. Sign in for larger projects.`,
    413
  );
}
```

Both checks are **guest-path-only** — they live inside the `if (!ownerId)` branch
added in Step 4's dual-mode controller, so authenticated users are unaffected.

#### 2.16.3 Frontend Feedback

- `cloudStorage.ts` catches 403 / 413 responses and surfaces a user-friendly error
- The error toast/message includes a "Sign in for more" link → `/register`
- The Save Settings modal shows current guest project count vs limit when cloud sync is on:
  `"1 of 2 guest projects used — Sign in for unlimited"`

#### 2.16.4 Env Vars to Add

```env
GUEST_MAX_PROJECTS=2
GUEST_MAX_PROJECT_SIZE_MB=5
```

Add to `docker-compose.yml`, `docker-compose.unraid.yml`, and `.env.example`.

---

### 2.17 E2E Test Suite (Playwright)

**Goal:** Automated browser tests that cover critical user journeys — auth flows, navigation routing, and cloud save/load — before the codebase grows more UI complexity.  
**Status:** 📋 Planned — Not yet started  
**Prerequisites:** Login/Register pages live (✅ done), BrowserRouter wired (✅ done)  
**Estimated effort:** 2–3 days initial suite; ongoing additions per feature

#### 2.17.1 Why Playwright (not Selenium)

| | Playwright | Selenium |
|-|------------|----------|
| Install & config | Single `npm install` + `npx playwright install` | WebDriver setup per browser |
| Speed | Runs in the same process; fast by default | Separate WebDriver process |
| Auto-wait | Built-in smart waiting | Manual `WebDriverWait` |
| TypeScript support | First-class | Via wrappers (WebDriverIO etc.) |
| Test isolation | Each test gets a fresh browser context | Shared session by default |
| Verdict | ✅ Use this | ❌ Extra infra for no benefit |

#### 2.17.2 Scope — Initial Suite

**Auth flows (highest priority — new navigation, easy to break):**

| Test | Description |
|------|-------------|
| Guest → editor loads | Visiting `/` while logged out opens the editor without redirect |
| `/login` page renders | Email, password, remember-me, and "Continue as Guest" are all present |
| `/register` page renders | Display name, email, password strength meter, confirm field |
| Successful login → redirect | Login with valid credentials → lands on `/` |
| Failed login shows error | Wrong password → inline error banner appears |
| Successful register → redirect | Register new account → lands on `/` |
| Register with mismatched passwords | Confirm-password mismatch → button stays disabled and field turns red |
| Logout | Clicking logout clears session; revisiting protected cloud feature shows auth banner |
| Silent refresh on reload | Log in, reload page, user stays authenticated (silent refresh cycle) |
| Navigate to `/login` while logged in | Should redirect to `/` (optional UX nicety) |

**Modal auth banners:**

| Test | Description |
|------|-------------|
| Save modal — guest sees lock banner | Open Save Settings as guest → cloud checkbox is replaced by auth banner |
| Load modal — guest sees lock banner | Open Load modal → Cloud tab shows auth banner, not project list |
| Banner "Sign in" link navigates | Clicking "Sign in" in a banner closes modal and goes to `/login` |

**Cloud project CRUD (requires auth — add after Step 7 prod milestone):**

| Test | Description |
|------|-------------|
| Save to cloud | Log in, enable cloud save, Save Now → project appears in Load modal Cloud tab |
| Load from cloud | Select cloud project → editor loads with its data |
| Overwrite existing cloud project | Save twice → only one entry updated, not duplicated |

#### 2.17.3 File Structure

```
maria-writer-react/
  e2e/
    auth/
      login.spec.ts
      register.spec.ts
      logout.spec.ts
      silent-refresh.spec.ts
    modals/
      save-modal-auth-banner.spec.ts
      load-modal-auth-banner.spec.ts
    cloud/
      cloud-save-load.spec.ts       ← gated on Step 7 milestone
    fixtures/
      auth.ts                       ← login helper, createUser helper
      testUser.ts                   ← shared test credentials
  playwright.config.ts
```

#### 2.17.4 playwright.config.ts (draft)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  // Spin up Vite dev server automatically before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    cwd: './',
  },
});
```

#### 2.17.5 Auth Fixture (shared helper)

```typescript
// e2e/fixtures/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL('/');
}
```

#### 2.17.6 CI Integration

Add a GitHub Actions job (or extend the existing one if present):

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps
  working-directory: maria-writer-react

- name: Run E2E tests
  run: npx playwright test
  working-directory: maria-writer-react
  env:
    VITE_API_URL: http://localhost:3000
```

The backend test database should be seeded with a known test user before the E2E run.

#### 2.17.7 Implementation Steps

1. `npm install -D @playwright/test` in `maria-writer-react`
2. Run `npx playwright install chromium firefox` to download browsers
3. Create `playwright.config.ts`
4. Write auth fixtures (`loginAs`, `registerAs`)
5. Implement the 10 auth-flow specs listed in §2.17.2
6. Implement modal auth-banner specs
7. Add `"test:e2e": "playwright test"` script to `package.json`
8. Wire into CI
9. Cloud CRUD specs added after Step 7 prod milestone

---

## Phase 2.5: Image Storage & Media Management

**Goal:** Move images out of the JSON data blob into dedicated storage; enable images throughout the application  
**Status:** 📋 Planned — Not yet started  
**Prerequisites:** Phase 2 complete (users exist to own images)  
**Estimated effort:** 1.5–2 weeks

### 2.5.0 Current State — The Problem

Images are currently stored as **base64-encoded JPEG strings** inline in the JSON data blob:

| Field | Type | Location | How it gets there |
|-------|------|----------|-------------------|
| `Character.picture` | `string` (base64) | `src/types/index.ts` line 44 | `CharacterModal.tsx` — FileReader → canvas resize → `toDataURL('image/jpeg', 0.8)` |
| `Event.image` | `string` (base64) | `src/types/index.ts` line 56 | `EventModal.tsx` — same pipeline |

**Why this is a problem:**

| Concern | Impact |
|---------|--------|
| **Size bloat** | Base64 encoding adds ~37% overhead. A 500KB JPEG becomes ~685KB of text. 10 character portraits = 5–7MB of JSON. |
| **localStorage quota** | Most browsers cap localStorage at 5–10MB total. A few images can exhaust the quota and break auto-save. |
| **Cloud save performance** | The entire JSON blob (including all images) is sent on every save. A 10MB payload takes noticeably longer and strains the 50MB Express body-parser limit. |
| **Encryption overhead** | In Phase 2, the JSON blob is AES-256-GCM encrypted. Encrypting/decrypting megabytes of base64 image data on every save/load is wasteful. |
| **Export file size** | `.maria` export files balloon with embedded images. |
| **No image reuse** | The same image duplicated across characters/events is stored multiple times. |
| **Blocks new features** | Chapter illustrations, book covers, and codex visuals can't be added without making the problem dramatically worse. |

### 2.5.1 Design Goals

1. **Images stored separately** from the project JSON — project data stays lean
2. **URL references** replace base64 strings in the data model
3. **Backward compatible** — existing base64 images migrated transparently
4. **Works for all image types** — current (character portraits, event images) and future (chapter illustrations, book cover, codex images)
5. **Self-hosted** — no external cloud dependencies (Unraid-friendly)
6. **Supports guests** — guest users can upload images (tied to guestId); images transfer on account claim

### 2.5.2 Storage Architecture — Provider Abstraction

The image storage layer is designed around a **provider interface** so that the
underlying storage technology can be swapped without changing any business logic,
API routes, or frontend code. The interface is the contract; implementations are
deploy-time configuration.

#### 2.5.2.1 `IImageStorageProvider` Interface

```typescript
// src/services/imageStorage/IImageStorageProvider.ts

import { Readable } from 'stream';

export interface ImageStorageMetadata {
  mimeType: string;
  sizeBytes: number;
}

export interface IImageStorageProvider {
  /**
   * Persist a processed image buffer.
   * @param buffer  Processed image bytes (already resized/stripped by sharp).
   * @param key     Storage key — typically "{ownerId}/{imageId}.{ext}".
   * @param meta    MIME type and size for storage-level metadata.
   * @returns       The provider-specific storage path/identifier.
   */
  save(buffer: Buffer, key: string, meta: ImageStorageMetadata): Promise<string>;

  /**
   * Retrieve an image as a readable stream + metadata.
   * Used when the backend proxies the file to the client.
   */
  getStream(key: string): Promise<{ stream: Readable; mimeType: string; sizeBytes: number }>;

  /**
   * Return a URL the client can use directly to fetch the image.
   * - Filesystem provider: returns an internal path for nginx X-Accel-Redirect.
   * - S3 provider: returns a pre-signed GET URL (short TTL).
   * - Azure provider: returns a SAS-token URL.
   * If the provider doesn't support direct URLs, return null and the
   * controller falls back to streaming via getStream().
   */
  getDirectUrl(key: string): Promise<string | null>;

  /**
   * Delete an image from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Check whether an image exists in storage.
   */
  exists(key: string): Promise<boolean>;
}
```

#### 2.5.2.2 Provider Implementations

| Provider | Class | When to use | Env selector |
|----------|-------|-------------|--------------|
| **Filesystem** | `FilesystemStorageProvider` | Self-hosted (Unraid, bare-metal, single-node Docker) | `IMAGE_STORAGE_PROVIDER=filesystem` |
| **S3 / MinIO** | `S3StorageProvider` | AWS, any S3-compatible store (MinIO, DigitalOcean Spaces, Backblaze B2) | `IMAGE_STORAGE_PROVIDER=s3` |
| **Azure Blob** | `AzureBlobStorageProvider` | Azure deployments | `IMAGE_STORAGE_PROVIDER=azure` |

Selected at startup via env var. Factory pattern:

```typescript
// src/services/imageStorage/index.ts

import { IImageStorageProvider } from './IImageStorageProvider';
import { FilesystemStorageProvider } from './FilesystemStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';
import { AzureBlobStorageProvider } from './AzureBlobStorageProvider';

export function createImageStorageProvider(): IImageStorageProvider {
  const provider = process.env.IMAGE_STORAGE_PROVIDER || 'filesystem';

  switch (provider) {
    case 'filesystem':
      return new FilesystemStorageProvider(process.env.UPLOAD_DIR || '/uploads');
    case 's3':
      return new S3StorageProvider({
        bucket:    process.env.S3_BUCKET!,
        region:    process.env.S3_REGION || 'us-east-1',
        endpoint:  process.env.S3_ENDPOINT,        // for MinIO / non-AWS
        accessKey: process.env.S3_ACCESS_KEY!,
        secretKey: process.env.S3_SECRET_KEY!,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',  // MinIO needs this
        signedUrlTtl: parseInt(process.env.S3_SIGNED_URL_TTL || '3600'),
      });
    case 'azure':
      return new AzureBlobStorageProvider({
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        container:        process.env.AZURE_STORAGE_CONTAINER || 'maria-images',
        signedUrlTtl:     parseInt(process.env.AZURE_SIGNED_URL_TTL || '3600'),
      });
    default:
      throw new Error(`Unknown IMAGE_STORAGE_PROVIDER: ${provider}`);
  }
}
```

**v1 ships with `FilesystemStorageProvider` only.** The S3 and Azure providers
are stubbed out as classes that throw "Not implemented" — they'll be filled in
when a cloud deployment is needed. The key point is that the interface exists
from day one, so no refactoring is required later.

#### 2.5.2.3 Filesystem Provider Detail

```typescript
// src/services/imageStorage/FilesystemStorageProvider.ts

export class FilesystemStorageProvider implements IImageStorageProvider {
  constructor(private readonly basePath: string) {}

  async save(buffer: Buffer, key: string, meta: ImageStorageMetadata): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return key;  // relative path is the storage identifier
  }

  async getStream(key: string) {
    const fullPath = path.join(this.basePath, key);
    const stat = await fs.stat(fullPath);
    return {
      stream: createReadStream(fullPath),
      mimeType: mime.lookup(fullPath) || 'application/octet-stream',
      sizeBytes: stat.size,
    };
  }

  async getDirectUrl(key: string): Promise<string | null> {
    // Returns an nginx X-Accel-Redirect path (not a public URL)
    return `/internal-uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.basePath, key));
  }

  async exists(key: string): Promise<boolean> {
    try { await fs.access(path.join(this.basePath, key)); return true; }
    catch { return false; }
  }
}
```

#### 2.5.2.4 S3 Provider Detail (Stub — Implement When Needed)

```typescript
// src/services/imageStorage/S3StorageProvider.ts

export class S3StorageProvider implements IImageStorageProvider {
  // Uses @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner
  // save()       → PutObjectCommand
  // getStream()  → GetObjectCommand → Body as Readable
  // getDirectUrl() → getSignedUrl(GetObjectCommand, { expiresIn: ttl })
  // delete()     → DeleteObjectCommand
  // exists()     → HeadObjectCommand (catch 404)
}
```

Works with AWS S3, MinIO (set `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE=true`),
DigitalOcean Spaces, Backblaze B2, and any S3-compatible API.

#### 2.5.2.5 Azure Blob Provider Detail (Stub — Implement When Needed)

```typescript
// src/services/imageStorage/AzureBlobStorageProvider.ts

export class AzureBlobStorageProvider implements IImageStorageProvider {
  // Uses @azure/storage-blob
  // save()         → blockBlobClient.uploadData(buffer)
  // getStream()    → blockBlobClient.download() → readableStreamBody
  // getDirectUrl() → generateBlobSASQueryParameters() → SAS URL
  // delete()       → blockBlobClient.delete()
  // exists()       → blockBlobClient.exists()
}
```

#### 2.5.2.6 How the Provider Plugs Into the API

The image controller receives the provider via dependency injection at startup:

```typescript
// src/controllers/imageController.ts

const storageProvider = createImageStorageProvider();

async function uploadImage(req, res) {
  // 1. Validate, process with sharp (same regardless of provider)
  const processed = await sharp(req.file.buffer).resize(...).jpeg(...).toBuffer();

  // 2. Delegate storage to the provider
  const key = `${req.user.id}/${imageId}.jpg`;
  const storagePath = await storageProvider.save(processed, key, { mimeType: 'image/jpeg', sizeBytes: processed.length });

  // 3. Save metadata to DB (storagePath is provider-agnostic key)
  await prisma.image.create({ data: { id: imageId, storagePath, ... } });

  // 4. Return URL (always /api/images/{id} — resolved server-side)
  res.status(201).json({ id: imageId, url: `/api/images/${imageId}` });
}

async function serveImage(req, res) {
  const image = await prisma.image.findUnique({ where: { id: req.params.id } });
  // Auth check...

  // Try direct URL first (S3 signed URL, nginx X-Accel, etc.)
  const directUrl = await storageProvider.getDirectUrl(image.storagePath);
  if (directUrl) {
    if (directUrl.startsWith('/internal-')) {
      // nginx X-Accel-Redirect (filesystem provider)
      res.set('X-Accel-Redirect', directUrl);
      res.set('Content-Type', image.mimeType);
      return res.end();
    }
    // Pre-signed URL (S3/Azure) — redirect client
    return res.redirect(302, directUrl);
  }

  // Fallback: stream through Express
  const { stream, mimeType, sizeBytes } = await storageProvider.getStream(image.storagePath);
  res.set('Content-Type', mimeType);
  res.set('Content-Length', String(sizeBytes));
  stream.pipe(res);
}
```

**Key design principle:** The frontend always references `/api/images/{id}`. It
never sees S3 URLs, Azure SAS tokens, or filesystem paths. The backend resolves
the right serving strategy at runtime. This means zero frontend changes when
switching storage providers.

#### 2.5.2.7 Storage Backend Comparison Matrix

| Capability | Filesystem | S3 / MinIO | Azure Blob |
|------------|-----------|------------|------------|
| Self-hosted (Unraid) | ✅ Native | ✅ via MinIO container | ❌ |
| AWS deployment | ❌ Needs EFS | ✅ Native | ❌ |
| Azure deployment | ❌ Needs Azure Files | ❌ | ✅ Native |
| CDN integration | Via nginx | CloudFront / CDN | Azure CDN |
| Pre-signed URLs | ❌ (X-Accel only) | ✅ | ✅ (SAS tokens) |
| Multi-instance backends | ❌ (shared vol required) | ✅ | ✅ |
| Cost | Free | S3 pricing / free (MinIO) | Blob pricing |
| Backup | Volume snapshot | S3 versioning | Blob snapshots |
| Setup complexity | Lowest | Medium | Medium |

#### 2.5.2.8 Storage Layout (Filesystem Provider)

```
/uploads/                              # Docker volume: /mnt/user/appdata/maria-writer/uploads
├── {ownerId|guestId}/                 # Scoped per user/guest
│   ├── {imageId}.jpg                  # Processed image file
│   └── {imageId}.jpg                  # ...
└── orphan-cleanup.log                 # Periodic cleanup log
```

**File naming:** `{uuid}.{ext}` — image ID is a UUIDv4 generated at upload time. Original filename is stored in DB metadata but not used on disk (prevents path traversal, collisions).

**S3/Azure key format:** Same `{ownerId}/{imageId}.{ext}` structure — the key
is identical across all providers. Only the storage backend differs.

### 2.5.3 Database Schema

```prisma
model Image {
  id           String   @id @default(uuid())
  ownerId      String?  @map("owner_id") @db.VarChar(36)   // FK to User (after auth)
  guestId      String?  @map("guest_id") @db.VarChar(36)   // for pre-auth uploads
  projectId    String?  @map("project_id") @db.VarChar(36)  // which project this belongs to
  filename     String   @db.VarChar(255)                    // original upload filename
  mimeType     String   @map("mime_type") @db.VarChar(50)   // image/jpeg, image/png, image/webp
  sizeBytes    Int      @map("size_bytes")                  // file size for quota tracking
  width        Int?                                          // pixel dimensions (from processing)
  height       Int?
  purpose      String   @db.VarChar(50)                     // 'character-portrait', 'event-image', 'chapter-cover', 'book-cover', 'codex-image'
  entityId     String?  @map("entity_id") @db.VarChar(36)   // ID of character/event/chapter this is linked to
  storagePath  String   @map("storage_path") @db.VarChar(500) // relative path on disk
  createdAt    DateTime @default(now()) @map("created_at")

  owner   User?    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@index([guestId])
  @@index([projectId])
  @@index([entityId])
  @@map("images")
}
```

### 2.5.4 API Endpoints

```
POST   /api/images/upload          # Upload image (multipart/form-data)
GET    /api/images/:id             # Serve image file (nginx X-Accel-Redirect or Express stream)
GET    /api/images/:id/meta        # Get image metadata (dimensions, size, purpose)
DELETE /api/images/:id             # Delete image + file
```

#### Upload Endpoint

```
POST /api/images/upload
Content-Type: multipart/form-data

Fields:
  file:      <binary>                          # The image file
  purpose:   'character-portrait' | 'event-image' | 'chapter-cover' | 'book-cover' | 'codex-image'
  projectId: 'uuid'                            # Which project this belongs to
  entityId:  'uuid' (optional)                 # Character/event/chapter ID to link to

Response 201:
{
  "id": "img-uuid",
  "url": "/api/images/img-uuid",
  "width": 800,
  "height": 600,
  "sizeBytes": 245760
}
```

**Server-side processing on upload:**
1. Validate file type (JPEG, PNG, WebP only) — check magic bytes, not just extension
2. Validate file size (max 5MB per image, configurable via env `MAX_IMAGE_SIZE_MB`)
3. Resize/compress using `sharp` (already runs on Node):
   - Character portraits: max 512×512, JPEG quality 85
   - Event images: max 1200×800, JPEG quality 85
   - Chapter covers: max 1600×1200, JPEG quality 85
   - Book cover: max 1200×1800, JPEG quality 90
   - Codex images: max 1200×800, JPEG quality 85
4. Strip EXIF metadata (privacy — GPS coords, camera info)
5. Write processed file to disk
6. Create `Image` row in DB
7. Return image URL

**Quota enforcement:**
- Per-project limit: 100 images (configurable via env `MAX_IMAGES_PER_PROJECT`)
- Per-project total size: 200MB (configurable via env `MAX_IMAGE_STORAGE_MB`)
- Checked before accepting upload

#### Serving Images

Serving is handled transparently by the storage provider via `serveImage()` in
§2.5.2.6. The controller tries `getDirectUrl()` first, then falls back to
`getStream()`. The behaviour per provider:

| Provider | `getDirectUrl()` returns | Client receives |
|----------|-------------------------|----------------|
| Filesystem (dev) | `null` | Express streams the file via `getStream()` |
| Filesystem (prod) | `/internal-uploads/{key}` | nginx serves via `X-Accel-Redirect` (see below) |
| S3 / MinIO | Pre-signed GET URL (1h TTL) | 302 redirect → client fetches directly from S3 |
| Azure Blob | SAS-token URL (1h TTL) | 302 redirect → client fetches directly from Blob |

**nginx config for filesystem provider (production):**

```nginx
# nginx.conf addition for image serving
location /internal-uploads/ {
    internal;
    alias /uploads/;
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

**Toggle:** `IMAGE_SERVE_MODE=proxy|x-accel` env var controls whether the
filesystem provider returns `null` (stream through Express) or an X-Accel path.
Defaults to `proxy` in development, `x-accel` in production.

### 2.5.5 Data Model Changes (Frontend)

Replace base64 strings with image URLs:

```typescript
// BEFORE
interface Character {
  // ...
  picture?: string;  // base64 data URI: "data:image/jpeg;base64,/9j/4AAQ..."
}

interface Event {
  // ...
  image?: string;    // base64 data URI
}

// AFTER
interface Character {
  // ...
  picture?: string;  // URL: "/api/images/img-uuid" (or base64 for legacy/guest-local)
}

interface Event {
  // ...
  image?: string;    // URL: "/api/images/img-uuid"
}

// NEW: Additional image fields
interface Chapter {
  // ...existing fields
  coverImage?: string;  // URL: "/api/images/img-uuid"
}

interface BookMetadata {
  // ...existing fields
  coverImage?: string;  // URL: "/api/images/img-uuid"  — book title page / cover
}
```

**No type changes needed for `picture` and `image`** — they remain `string`. The value just changes from a base64 data URI to a relative URL. Both `<img src="data:image/jpeg;base64,...">` and `<img src="/api/images/uuid">` work in `<img>` tags, so the rendering components (CharacterDetail, TimelineView, RelationshipGraph, EventDetail) need **zero changes** for existing fields.

### 2.5.6 New Image Features Unlocked

Once image storage is external, the following features become viable:

| Feature | Image purpose | Where it appears | UI location |
|---------|--------------|-------------------|-------------|
| **Character portrait** | `character-portrait` | Character detail, timeline lanes, relationship graph | CharacterModal (already exists — migrate from base64) |
| **Event image** | `event-image` | Event detail view | EventModal (already exists — migrate from base64) |
| **Chapter cover** | `chapter-cover` | Chapter list sidebar, chapter header in editor | ChapterSidebar item + editor header — NEW UI |
| **Book cover** | `book-cover` | Metadata modal, export title page, project list | MetadataModal — NEW field + image upload |
| **Codex image** | `codex-image` | Inline in chapter editor via special embed syntax | Editor toolbar button — NEW feature |

#### Chapter Cover Images
- Optional image per chapter shown as a thumbnail in the chapter sidebar
- Displayed as a header/banner when viewing the chapter in the editor
- Included in export

#### Book Cover Image
- Added to `BookMetadata` — uploaded in the Metadata modal
- Shown as thumbnail in the Load Project modal's project list
- Used as title page in future ePub/PDF export
- Displayed in the TopBar or a dedicated "Book Info" view

#### Codex Images (Editor Embeds)
- Toolbar button or drag-and-drop to insert images into chapter content
- Stored as markdown-style references: `![alt text](/api/images/img-uuid)`
- Rendered inline in write/preview mode
- Requires TipTap extension for image node handling

### 2.5.7 Frontend Upload Flow Changes

Replace the current `FileReader → canvas → toDataURL → setState(base64)` pipeline:

```
BEFORE (current):
  User selects file
    → FileReader reads as DataURL
    → Draw on canvas (resize)
    → canvas.toDataURL('image/jpeg', 0.8)
    → Store base64 string in state
    → base64 saved in project JSON

AFTER:
  User selects file
    → POST /api/images/upload (multipart/form-data)
    → Server processes (resize, strip EXIF, save to disk)
    → Response: { id, url, width, height }
    → Store URL string in state (e.g., "/api/images/img-uuid")
    → URL saved in project JSON (tiny string instead of huge base64)
```

**Files to modify:**
- `CharacterModal.tsx` — replace canvas pipeline with upload API call
- `EventModal.tsx` — same
- New: upload component/hook `useImageUpload.ts` — shared upload logic, progress indicator, error handling

**Guest mode consideration:**
- Guest users (no auth) can still upload images — tied to `guestId` instead of `ownerId`
- On account claim (Phase 2 → ClaimProjectsPage), images are reassigned: `UPDATE images SET owner_id = :userId WHERE guest_id = :guestId`
- For pure local-only guests (no cloud), images remain as base64 in localStorage (no server to upload to). The upload path gracefully falls back to the current base64 approach.

### 2.5.8 Export / Import with Images

#### Export (`.maria` file)

When exporting, images must be bundled into the file. Two approaches:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **A) Re-embed as base64** | Simple, single JSON file | File gets big again, defeats purpose during export | Acceptable — export is one-time |
| **B) ZIP archive** | Clean separation, smaller on disk (binary images not base64-inflated) | More complex, `.maria` format changes from JSON to ZIP | Better long-term |

**Decision: Option B — ZIP archive for v2 of the export format.**

```
my-novel.maria (ZIP archive):
├── project.json           # All state data (with image URLs replaced by relative paths)
├── images/
│   ├── img-uuid-1.jpg     # Character portrait
│   ├── img-uuid-2.jpg     # Event image
│   └── img-uuid-3.jpg     # Chapter cover
└── manifest.json          # { version: "3.0", imageCount: 3, format: "zip" }
```

**Backward compatibility:**
- Import detects whether `.maria` file is raw JSON (legacy) or ZIP (new format) by checking first bytes
- Legacy JSON files with base64 images still import correctly
- On import of ZIP: extract images → upload to storage → replace paths with new URLs

### 2.5.9 Migration Strategy (base64 → URL)

**For cloud-synced projects:**
1. Backend migration script: iterate all projects, scan JSON for base64 data URIs
2. For each base64 string found: decode → write to disk → create Image row → replace base64 with URL
3. Re-save project JSON (now much smaller)
4. Run during Phase 2.5 deployment as a one-time migration

**For localStorage-only projects:**
1. On next cloud save or export: frontend detects base64 strings (starts with `data:image/`)
2. Uploads each to `/api/images/upload`
3. Replaces base64 with returned URL in state
4. Saves updated state

**Detection logic:**
```typescript
function isBase64Image(value: string): boolean {
  return value.startsWith('data:image/');
}

function isImageUrl(value: string): boolean {
  return value.startsWith('/api/images/');
}
```

### 2.5.10 Docker / Infrastructure Changes

#### Filesystem Provider (Unraid / Self-Hosted)

```yaml
# docker-compose.unraid.yml additions
services:
  backend:
    volumes:
      - ${UPLOAD_PATH:-/mnt/user/appdata/maria-writer/uploads}:/uploads
    environment:
      - IMAGE_STORAGE_PROVIDER=filesystem
      - UPLOAD_DIR=/uploads
      - IMAGE_SERVE_MODE=x-accel
      - MAX_IMAGE_SIZE_MB=5
      - MAX_IMAGES_PER_PROJECT=100
      - MAX_IMAGE_STORAGE_MB=200

  frontend:
    volumes:
      - ${UPLOAD_PATH:-/mnt/user/appdata/maria-writer/uploads}:/uploads:ro  # read-only for nginx X-Accel
```

#### S3 / MinIO Provider (AWS / Cloud)

```yaml
# docker-compose.cloud.yml example (or ECS task definition env)
services:
  backend:
    environment:
      - IMAGE_STORAGE_PROVIDER=s3
      - S3_BUCKET=maria-writer-images
      - S3_REGION=us-east-1
      # - S3_ENDPOINT=http://minio:9000    # uncomment for MinIO
      # - S3_FORCE_PATH_STYLE=true          # uncomment for MinIO
      - S3_ACCESS_KEY=${AWS_ACCESS_KEY_ID}
      - S3_SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_SIGNED_URL_TTL=3600
      - MAX_IMAGE_SIZE_MB=5
      - MAX_IMAGES_PER_PROJECT=100
      - MAX_IMAGE_STORAGE_MB=200
```

#### Azure Blob Provider

```yaml
services:
  backend:
    environment:
      - IMAGE_STORAGE_PROVIDER=azure
      - AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONN}
      - AZURE_STORAGE_CONTAINER=maria-images
      - AZURE_SIGNED_URL_TTL=3600
      - MAX_IMAGE_SIZE_MB=5
      - MAX_IMAGES_PER_PROJECT=100
      - MAX_IMAGE_STORAGE_MB=200
```

Note: S3/Azure providers need additional npm packages installed only when used:
- S3: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Azure: `@azure/storage-blob`

These are listed as optional peer dependencies and only imported dynamically by
their respective provider classes. The Dockerfile and `package.json` for
self-hosted deployments do not need them.

**Core backend dependencies (always required):**

```bash
cd maria-writer-backend
npm install sharp multer
npm install -D @types/multer
```

### 2.5.11 Cleanup & Orphan Prevention

Images can become orphaned when:
- A character/event is deleted but the image remains on disk
- An upload succeeds but the user never saves the project (abandoned upload)

**Strategy:**
- **On entity delete:** Backend middleware on character/event delete → also delete linked images (DB row + file)
- **Periodic cleanup cron:** Scan `images` table for rows with no matching `entityId` in any model, older than 24 hours → delete
- **Simple implementation:** A `/api/admin/images/cleanup` endpoint that admins can trigger, or a `setInterval` in the backend process

### 2.5.12 Implementation Order

```
Step 1:  IImageStorageProvider interface + FilesystemStorageProvider              ~ 0.5 day
Step 2:  Provider factory (createImageStorageProvider) + env-based selection      ~ 0.25 day
Step 3:  Install sharp + multer, add Image model to Prisma, migrate DB           ~ 0.5 day
Step 4:  Image upload endpoint (POST /api/images/upload) using provider          ~ 1 day
Step 5:  Image serve endpoint (GET /api/images/:id) with provider fallback       ~ 0.5 day
         (getDirectUrl → redirect/X-Accel, else getStream → pipe)
Step 6:  Image delete endpoint + cascade on entity delete via provider           ~ 0.5 day
Step 7:  Frontend useImageUpload hook (shared upload logic, progress, errors)    ~ 0.5 day
Step 8:  Update CharacterModal + EventModal to use upload API instead of base64  ~ 1 day
Step 9:  Add book cover image field to MetadataModal                             ~ 0.5 day
Step 10: Add chapter cover image field to chapter sidebar + editor               ~ 1 day
Step 11: Migration script: extract existing base64 images via provider           ~ 1 day
Step 12: Update export/import to ZIP format with bundled images                  ~ 1.5 days
Step 13: Backend + frontend tests (incl. provider unit tests with mock FS)       ~ 1.5 days
Step 14: S3StorageProvider stub + AzureBlobStorageProvider stub                  ~ 0.25 day
         (throw 'Not implemented' — ready for future PRs)
Step 15: Docker volume config, .env vars, update SETUP_GUIDE                     ~ 0.5 day
                                                                        Total: ~10.5 days
```

### 2.5.13 Security Considerations

- **File type validation:** Check magic bytes (not just Content-Type header or extension) — prevent uploading disguised executables
- **Path traversal:** Image files named as UUIDs on disk, never user-supplied filenames
- **Access control:** Image serve endpoint checks that the requesting user owns (or collaborates on) the project the image belongs to
- **Size limits:** Per-file and per-project limits enforced server-side
- **EXIF stripping:** Remove GPS coordinates, camera serial numbers, timestamps — privacy protection
- **No directory listing:** Upload directory is not served as a static directory
- **Content-Security-Policy:** Images served with `Content-Disposition: inline` + correct `Content-Type` — prevents browser from executing uploaded files

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
| Phase 1 | ✅ Complete | Feb 2026 | Mar 2, 2026 | Backend + frontend fully shipped; encryption, help system, guest ID recovery all live |
| Phase 2 | 🚧 In Progress | Feb 28, 2026 | - | Steps 1–9 complete. Step 9: cloudStorage.ts now auth-aware (Bearer token when logged in, guestId when guest); rotateGuestId on logout; delete UI in LoadProjectModal. Next: Step 10 (ClaimProjectsPage). |
| Phase 2.5 | 📋 Detailed plan ready | - | - | Image storage & media management — move images out of JSON blob |
| Phase 3 | 📋 Planned | - | - | Collaboration |
| Phase 4 | 📋 Planned | - | - | Real-time sync |

---

**Last Updated:** March 2, 2026  
**Document Version:** 2.3  
**Author:** Development Team  
**Next Review:** After completing Phase 2 Step 10 (ClaimProjectsPage) — validate guest-to-user project migration flow
