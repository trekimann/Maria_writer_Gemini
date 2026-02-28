# Maria Writer with Cloud Storage 🚀

A powerful novel writing application with cloud persistence, built with React, TypeScript, Node.js, and MariaDB.

## Overview

Maria Writer is a comprehensive novel writing tool designed specifically for managing novels and their associated information. It includes features for commenting, chapter management, character bios, event tracking, relationship mapping, and much more.

**NEW in v1.0:** Cloud storage with MariaDB backend! Your work is now saved to a persistent database with flexible auto-save options.

### Philosophy

This project is maintained primarily through AI-assisted development, demonstrating that high-quality, maintainable code can be achieved through careful direction and best practices guidance to generative AI systems.

## 🎯 Quick Start

### Using Docker Compose — Local Development

```bash
cd c:\Source\Maria_writer_Gemini
copy .env.example .env
# Edit .env with secure passwords
docker-compose up -d
```

Open http://localhost - you're ready to write!

### Using Docker Compose — Unraid Deployment

See `docker-compose.unraid.yml` for a production-ready compose file that pulls pre-built images from your private registry (`memoryalpha:5000`). Use with Unraid's Docker Compose Manager plugin.

### VS Code Debugging

Pre-configured debug profiles in `.vscode/launch.json`:
- **Debug Backend (local)** — Node.js debugger attached to Express
- **Debug Frontend (Chrome)** — Chrome with source maps for React/TypeScript
- **Full Stack Debug** — Launches both simultaneously

See **[SETUP_GUIDE.md](SETUP_GUIDE.md)** for detailed instructions.

## ✨ Features

### Cloud Storage (Phase 1 - NEW!)
- ☁️ **MariaDB Backend** - Persistent cloud storage for your novels
- 💾 **Flexible Storage** - Choose local, cloud, or both
- ⏱️ **Auto-Save Options:**
  - Save on chapter change
  - Save at regular intervals
  - Save on window focus loss
- 🆔 **Guest IDs** - Simple access without creating accounts
- 📦 **Export/Import** - Backup as `.maria` files

### Core Writing Features
- 📝 **Multiple Editor Modes** - Write, Source, and Preview modes
- 📚 **Chapter Management** - Drag-and-drop reordering, metadata
- 👥 **Character Database** - Detailed bios, relationships, life events
- 📅 **Timeline & Events** - Track story events, link to characters
- 💬 **Commenting System** - Add comments and suggestions to text
- 🎨 **Theme Customization** - Light/dark themes with color customization
- 📊 **Writing Statistics** - Word count, character count, reading time
- 🔗 **Relationship Graph** - Visual character relationships

## 📖 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup, debugging, and deployment
- **[FUTURE_FEATURES/MULTI_USER_IMPLEMENTATION_PLAN.md](FUTURE_FEATURES/MULTI_USER_IMPLEMENTATION_PLAN.md)** - Multi-user roadmap (auth, encryption, admin)
- **[maria-writer-backend/README.md](maria-writer-backend/README.md)** - Backend API docs
- **[LLM_REFERENCE/](LLM_REFERENCE/)** - Developer guides
- **[docker-compose.unraid.yml](docker-compose.unraid.yml)** - Unraid deployment compose file
- **[build-and-push.sh](build-and-push.sh)** - Build & push images to private registry

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18, TypeScript, Vite, SCSS |
| Backend | Node.js, Express, TypeScript |
| Database | MariaDB 11 with Prisma ORM |
| Testing | Vitest, Jest, Supertest |
| Deployment | Docker, Docker Compose, nginx |

## 📋 Roadmap

- ✅ **Phase 1: Cloud Storage** (Current) - MariaDB backend, auto-save
- 📅 **Phase 2: Authentication** - User accounts, JWT auth
- 📅 **Phase 3: Collaboration** - Share projects, permissions
- 📅 **Phase 4: Real-Time Sync** - WebSockets, live collaboration

See [MULTI_USER_IMPLEMENTATION_PLAN.md](FUTURE_FEATURES/MULTI_USER_IMPLEMENTATION_PLAN.md) for details.

## 🎯 Usage

### Saving Your Work

1. Click the **Save icon (💾)** in the toolbar
2. Configure your preferences:
   - Enable cloud storage for cross-device access
   - Set up auto-save options
   - View your Guest ID
3. Click **Save Now** or let auto-save handle it
4. Export to `.maria` files for backups

## Help & Documentation

- [Chapters Sidebar](maria-writer-react/public/help/chapters_sidebar.md)
- [Chapter Metadata](maria-writer-react/public/help/chapter-metadata.md)
- [Detailed Character View](maria-writer-react/public/help/character-detail.md)
- [Character List](maria-writer-react/public/help/character-list.md)
- [Character Creation/Edit](maria-writer-react/public/help/character-modal.md)
- [Comments Sidebar](maria-writer-react/public/help/comments-sidebar.md)
- [Event Detail](maria-writer-react/public/help/event-detail.md)
- [Event List](maria-writer-react/public/help/event-list.md)
- [Event Creation/Edit](maria-writer-react/public/help/event-modal.md)
- [Timeline View](maria-writer-react/public/help/timeline-view.md)
