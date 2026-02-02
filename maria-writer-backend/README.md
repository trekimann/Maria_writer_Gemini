# Maria Writer Backend

Backend API server for Maria Writer with MariaDB persistence and WebSocket support.

## Features

- RESTful API for project management
- MariaDB database with Prisma ORM
- Guest-based authentication (Phase 1)
- WebSocket support for real-time collaboration (Phase 4)
- Rate limiting and security middleware
- Comprehensive error handling
- TypeScript throughout

## Prerequisites

- Node.js 20+
- MariaDB 11+ (or use Docker Compose)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp ../.env.example .env
```

3. Update `.env` with your database credentials:
```env
DATABASE_URL="mysql://maria_user:your_password@localhost:3306/maria_writer"
JWT_SECRET="your-secret-key-at-least-32-characters"
```

## Development

### Using Docker Compose (Recommended)

From the project root:

```bash
# Start all services (frontend, backend, database)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Local Development

1. Start MariaDB (via Docker or locally)

2. Run database migrations:
```bash
npm run prisma:migrate
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Start development server:
```bash
npm run dev
```

Server will run on http://localhost:3000

## API Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/health/db` - Database connectivity check

### Projects
- `GET /api/projects?guestId={uuid}` - List all projects for a guest
- `POST /api/projects` - Create or update project
- `GET /api/projects/:id` - Get specific project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Request Examples

**Create/Update Project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "guestId": "your-guest-uuid",
    "title": "My Novel",
    "data": { ... entire AppState ... }
  }'
```

**List Projects:**
```bash
curl "http://localhost:3000/api/projects?guestId=your-guest-uuid"
```

## Database Management

### Prisma Studio
View and edit database in browser:
```bash
npm run prisma:studio
```

### Migrations
Create new migration:
```bash
npm run prisma:migrate
```

Deploy migrations (production):
```bash
npm run prisma:deploy
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

## Project Structure

```
src/
├── server.ts              # Entry point
├── config/
│   └── database.ts        # Prisma client
├── controllers/
│   └── projectController.ts
├── middleware/
│   ├── errorHandler.ts
│   ├── validator.ts
│   └── rateLimit.ts
├── routes/
│   ├── health.ts
│   └── projects.ts
├── services/
│   └── projectService.ts
└── utils/
    ├── logger.ts
    └── validation.ts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MariaDB connection string | - |
| `JWT_SECRET` | Secret for JWT tokens (Phase 2) | - |
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost |

## Rate Limits

- General API: 100 requests per 15 minutes
- Write operations: 30 requests per minute

## Security

- Input validation with Zod
- SQL injection prevention via Prisma ORM
- Rate limiting on all endpoints
- CORS configuration
- Error sanitization in production

## Deployment

### Docker

Build and run:
```bash
docker build -t maria-writer-backend .
docker run -p 3000:3000 --env-file .env maria-writer-backend
```

### Production

1. Build:
```bash
npm run build
```

2. Deploy migrations:
```bash
npm run prisma:deploy
```

3. Start:
```bash
npm start
```

## Troubleshooting

### Database connection failed
- Check MariaDB is running
- Verify DATABASE_URL is correct
- Ensure database and user exist

### Port already in use
- Change PORT in .env
- Kill process using port 3000: `npx kill-port 3000`

### Migrations fail
- Check database permissions
- Ensure MariaDB version 11+
- Try: `npm run prisma:migrate -- --name init`

## Future Phases

This is Phase 1 (Persistent Storage). Future phases will add:
- Phase 2: JWT Authentication & User Management
- Phase 3: Collaboration & Permissions
- Phase 4: Real-time WebSocket Sync

## License

MIT
