# Multi-User Implementation Plan for Maria Writer

**Status:** Planning Phase  
**Last Updated:** February 1, 2026  
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
- ✅ Comprehensive test suite (>80% coverage)
- ✅ "Save to Cloud" button in UI
- ✅ "Load from Cloud" button in UI
- ✅ Error handling and user feedback
- ✅ Documentation (README, API docs)

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

### Features
- User registration (email + password)
- Email verification (optional for v1)
- Login with JWT tokens
- Password reset flow
- User profile management
- Session management

### Database Changes

**New Tables:**
```sql
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

-- Update projects table
ALTER TABLE projects 
  DROP COLUMN guest_id,
  ADD COLUMN owner_id VARCHAR(36) NOT NULL,
  ADD FOREIGN KEY (owner_id) REFERENCES users(id);
```

### JWT Structure

**Access Token** (15 min expiry):
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token** (7 days expiry):
```json
{
  "userId": "uuid",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690
}
```

### New API Endpoints

```typescript
POST   /api/auth/register          # Create account
POST   /api/auth/login             # Get tokens
POST   /api/auth/logout            # Invalidate refresh token
POST   /api/auth/refresh           # Get new access token
POST   /api/auth/forgot-password   # Request reset
POST   /api/auth/reset-password    # Reset with token
GET    /api/auth/me                # Get current user
PUT    /api/auth/profile           # Update profile
DELETE /api/auth/account           # Delete account
```

### Frontend Changes
- Add login/register screens
- Store tokens in httpOnly cookies (refresh) + memory (access)
- Add auth context/provider
- Protected routes
- Auto-refresh tokens before expiry
- Logout on 401 responses

### Migration Strategy
- Keep guest projects accessible (read-only)
- Offer "Claim Projects" feature on first login
- Migrate guest projects to user account

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
| Phase 1 | 📋 Planned | - | - | MariaDB backend |
| Phase 2 | 📋 Planned | - | - | Authentication |
| Phase 3 | 📋 Planned | - | - | Collaboration |
| Phase 4 | 📋 Planned | - | - | Real-time sync |

---

**Last Updated:** February 1, 2026  
**Document Version:** 1.0  
**Author:** Development Team  
**Next Review:** After Phase 1 completion
