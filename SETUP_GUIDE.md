# Maria Writer - Setup Guide for Multi-User Support

This guide will help you set up the Maria Writer application with MariaDB backend and cloud storage support.

## Quick Start with Docker Compose (Recommended)

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
DB_ROOT_PASSWORD=your_secure_root_password
DB_PASSWORD=your_secure_db_password
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

## Manual Setup (Development)

### Backend Setup

1. **Install Node.js dependencies:**
```bash
cd maria-writer-backend
npm install
```

2. **Set up environment variables:**
```bash
copy ..\.env.example .env
```

Edit `.env`:
```env
DATABASE_URL="mysql://maria_user:your_password@localhost:3306/maria_writer"
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost
```

3. **Start MariaDB:**

Option A - Using Docker:
```bash
docker run -d \
  --name maria-writer-db \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=maria_writer \
  -e MYSQL_USER=maria_user \
  -e MYSQL_PASSWORD=your_password \
  -p 3306:3306 \
  mariadb:11
```

Option B - Local MariaDB installation:
- Install MariaDB 11+
- Create database: `CREATE DATABASE maria_writer;`
- Create user: `CREATE USER 'maria_user'@'localhost' IDENTIFIED BY 'your_password';`
- Grant permissions: `GRANT ALL PRIVILEGES ON maria_writer.* TO 'maria_user'@'localhost';`

4. **Run database migrations:**
```bash
npm run prisma:migrate
```

5. **Start backend server:**
```bash
npm run dev
```

Backend will run on http://localhost:3000

### Frontend Setup

1. **Install dependencies:**
```bash
cd maria-writer-react
npm install
```

2. **Create `.env.local`:**
```env
VITE_API_URL=http://localhost:3000
```

3. **Start development server:**
```bash
npm run dev
```

Frontend will run on http://localhost:5173

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

### Production Deployment

1. Build frontend:
```bash
cd maria-writer-react
npm run build
```

2. Build backend:
```bash
cd maria-writer-backend
npm run build
```

3. Use production docker-compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. Set up SSL/TLS (nginx proxy, Let's Encrypt, etc.)

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
