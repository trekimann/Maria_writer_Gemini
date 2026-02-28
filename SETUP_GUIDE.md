# Maria Writer - Setup Guide

This guide covers local development, VS Code debugging, and Unraid deployment.

---

## Quick Start with Docker Compose (Local Development)

### Prerequisites
- Docker and Docker Compose installed
- Git (to clone the repository)

### Steps

1. **Clone and navigate to the project:**
```bash
cd c:\Source\Maria_writer_Gemini
```

2. **Create environment file:**
```bash
copy .env.example .env
```

3. **Edit `.env` with secure passwords:**
```env
DB_ROOT_PASSWORD=root_password_2026
DB_PASSWORD=maria_password_2026
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

4. **Start all services:**
```bash
docker-compose up -d
```

This will start:
- Frontend (nginx): http://localhost
- Backend (Node.js): http://localhost:3000
- Database (MariaDB): localhost:3306

5. **Check service status:**
```bash
docker-compose ps
docker-compose logs -f
```

6. **Open the application:**
Navigate to http://localhost in your browser.

### Stopping Services
```bash
docker-compose down
```

### Removing All Data
```bash
docker-compose down -v
```

---

## Development Setup (Recommended for Debugging)

Run only the database in Docker; run frontend and backend natively for hot-reload and VS Code debugging.

### 1. Start the Database

```bash
docker-compose up -d db
```

### 2. Backend Setup

```bash
cd maria-writer-backend
npm install
```

The backend `.env` should already exist with:
```env
DATABASE_URL="mysql://maria_user:maria_password_2026@localhost:3306/maria_writer"
NODE_ENV=development
PORT=3000
CORS_ORIGIN="http://localhost:5173"
JWT_SECRET=your_jwt_secret_change_in_production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Run the database migration (first time only — use root for shadow DB permissions):
```bash
$env:DATABASE_URL = 'mysql://root:root_password_2026@localhost:3306/maria_writer'
npx prisma migrate dev --name init
```

Generate the Prisma client:
```bash
npx prisma generate
```

### 3. Frontend Setup

```bash
cd maria-writer-react
npm install
```

Create `.env.local`:
```env
VITE_API_URL=http://localhost:3000
```

Start the dev server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

### 4. VS Code Debugging

Pre-configured debug profiles are in `.vscode/launch.json`:

| Profile | What It Does |
|---------|-------------|
| **Debug Backend (local)** | Launches Express with Node debugger. Set breakpoints in `.ts` files. |
| **Debug Frontend (Chrome)** | Opens Chrome with debugger. Set breakpoints in `.tsx` files. Auto-starts Vite via a pre-launch task. |
| **Full Stack Debug** | Launches both backend + Chrome together. |

**To debug:**
1. Start the database: `docker-compose up -d db`
2. Press **Ctrl+Shift+D** → select **"Full Stack Debug"** → press **F5**
3. Vite dev server starts automatically, backend starts with debugger, Chrome opens
4. Set breakpoints anywhere in the TypeScript source — both frontend and backend

**Note:** The Vite dev server is started via a VS Code task defined in `.vscode/tasks.json`. If Vite is already running in a terminal, the task will detect it and skip re-launching.

---

## Using the Cloud Save Feature

### First Time Setup

1. **Open Maria Writer** in your browser
2. **Click the Save button** (💾 icon) in the top bar
3. **The Save Settings Modal** will open

### Save Settings Modal Options

#### Storage Location
- ☑️ **Save to Browser (Local Storage)** - Keeps data in your browser (default)
- ☐ **Save to Cloud (MariaDB)** - Syncs data to the database server

#### Auto-Save Options
- ☐ **Save when switching chapters** - Automatically saves when you change chapters
- ☐ **Save at regular intervals** - Auto-save every X minutes (configurable)
- ☐ **Save when switching to another window** - Saves when you click away from Maria Writer

#### Actions
- **Save Now** - Manually trigger a save (respects your storage location settings)
- **Export to .maria File** - Download your novel as a `.maria` file for backup

### How Cloud Save Works

1. **Guest ID Generation:**
   - On first use, a unique Guest ID is automatically generated
   - This ID is stored in your browser and identifies your projects
   - Find it in Save Settings modal when Cloud save is enabled

2. **First Cloud Save:**
   - Enable "Save to Cloud" checkbox
   - Click "Save Now"
   - Your novel is uploaded to the MariaDB database

3. **Subsequent Saves:**
   - If project exists with same title, it will be updated
   - A new project is created if the title is different
   - Last sync time is shown in the modal

4. **Working Across Devices:**
   - Copy your Guest ID from one device
   - On another device, paste it in browser localStorage:
     ```javascript
     localStorage.setItem('maria_guest_id', 'your-guest-id-here');
     ```
   - Your projects will be available when you load from cloud

---

## Troubleshooting

### Backend won't start

**Error:** `Database connection failed`
- Check MariaDB is running: `docker ps` or check local service
- Verify DATABASE_URL in `.env`
- Test connection: `npm run prisma:studio`

**Error:** `Port 3000 already in use`
- Change PORT in `.env`
- Or kill the process: `npx kill-port 3000`

### Frontend can't connect to backend

**Error:** `Failed to save to cloud`
- Check backend is running at http://localhost:3000
- Test: `curl http://localhost:3000/api/health`
- Verify VITE_API_URL in frontend `.env.local`
- Check browser console for CORS errors

### Database errors

**Error:** `P1001: Can't reach database server`
- Ensure MariaDB is running
- Check firewall settings
- Verify DATABASE_URL credentials

**Error:** `P1003: Database does not exist`
- Create database: `CREATE DATABASE maria_writer;`
- Run migrations: `npm run prisma:migrate`

### Can't find my projects

- Check you're using the same Guest ID
- View Guest ID in Save Settings modal
- Check backend logs: `docker-compose logs backend`
- Verify data in database: `npm run prisma:studio`

---

## Advanced Configuration

### Changing Database

Edit `docker-compose.yml`:
```yaml
db:
  environment:
    - MYSQL_DATABASE=your_db_name
    - MYSQL_USER=your_username
    - MYSQL_PASSWORD=your_password
```

Update `.env` to match.

### Custom Port

Edit `docker-compose.yml`:
```yaml
backend:
  ports:
    - "8080:3000"  # Change 8080 to your preferred port
```

### Building & Pushing Images

A build script is provided to build both frontend and backend images and push them to the private registry:

```bash
./build-and-push.sh           # Build and push both images
./build-and-push.sh --no-cache  # Force full rebuild
```

This pushes:
- `memoryalpha:5000/maria-writer:latest` (frontend)
- `memoryalpha:5000/maria-writer-backend:latest` (backend)

MariaDB uses the official `mariadb:11` image from Docker Hub (no build needed).

### Unraid Deployment

Maria Writer is deployed on Unraid using the Docker Compose Manager plugin.

1. **Build and push images** from your dev machine:
   ```bash
   ./build-and-push.sh
   ```

2. **On Unraid:** Go to Docker → Compose → **ADD NEW STACK**

3. **Name:** `maria-writer`

4. **Paste** the contents of `docker-compose.unraid.yml` into the compose editor

5. **Edit environment values** before deploying:
   - `CORS_ORIGIN` — must match how you access the frontend (e.g. `http://192.168.1.x:8084`)
   - `JWT_SECRET` — change to a real random string (32+ characters)
   - Database passwords — change from defaults if desired

6. Click **Compose Up**

The backend automatically runs `prisma migrate deploy` on startup, creating all database tables on first boot.

**Unraid compose file differences from development:**

| Setting | Dev (`docker-compose.yml`) | Unraid (`docker-compose.unraid.yml`) |
|---------|---------------------------|--------------------------------------|
| Images | Built locally (`build:`) | Pulled from registry (`image:`) |
| Frontend port | 80 | 8084 (avoids conflicts) |
| DB port | 3306 | 3307 (avoids conflicts) |
| DB volume | Docker named volume | `/mnt/user/appdata/maria-writer/db` |
| Env vars | `.env` file references | Inline in compose file |

### Other Production Deployment

1. Build and push images using `build-and-push.sh`
2. Deploy with `docker-compose.yml` or `docker-compose.unraid.yml`
3. Set up SSL/TLS (nginx reverse proxy, Let's Encrypt, etc.)

---

## Data Management

### Backup Database

Using Docker:
```bash
docker exec maria-writer-db mysqldump -u maria_user -p maria_writer > backup.sql
```

### Restore Database

```bash
docker exec -i maria-writer-db mysql -u maria_user -p maria_writer < backup.sql
```

### View Database

Option 1 - Prisma Studio:
```bash
cd maria-writer-backend
npm run prisma:studio
```

Option 2 - MySQL Client:
```bash
docker exec -it maria-writer-db mysql -u maria_user -p
USE maria_writer;
SHOW TABLES;
SELECT * FROM projects;
```

---

## Next Steps

- Enable auto-save features to never lose work
- Export `.maria` files regularly for additional backups
- Keep your Guest ID safe if you want to access projects from multiple devices
- Watch the logs during development: `docker-compose logs -f`

## Getting Help

- Check logs: `docker-compose logs -f backend`
- View frontend console in browser DevTools
- Check API health: http://localhost:3000/api/health
- Review backend README: `maria-writer-backend/README.md`

---

**Important Notes:**

1. **Guest IDs are temporary** - Phase 2 will add proper user accounts
2. **Keep your Guest ID** - It's your only way to access cloud projects
3. **Regular exports** - Always keep `.maria` file backups
4. **Local storage first** - Keep "Save to Browser" enabled as a safety net
