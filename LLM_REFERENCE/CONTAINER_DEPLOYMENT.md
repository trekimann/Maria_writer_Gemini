# Maria Writer - Container Deployment Guide

This guide covers deploying the Maria Writer application using containers with Podman or Docker.

## Prerequisites

- **Podman** (or Docker) installed on your system
- **podman-compose** (optional, for using docker-compose with Podman)

## Quick Start with Podman

### 1. Build the Image

```bash
cd maria-writer-react
podman build -t maria-writer:latest .
```

### 2. Run the Container

```bash
podman run -d \
  --name maria-writer \
  -p 8080:80 \
  maria-writer:latest
```

Access the application at: `http://localhost:8080`

### 3. Stop and Remove

```bash
podman stop maria-writer
podman rm maria-writer
```

## Using Docker Compose with Podman

### Install podman-compose

```bash
sudo pacman -S podman-compose
```

### Configuration

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Edit `.env` to configure your registry and port:
```env
REGISTRY=localhost:5000
TAG=latest
PORT=8080
```

### Run with docker-compose

```bash
# Start the application
podman-compose up -d

# View logs
podman-compose logs -f

# Stop the application
podman-compose down
```

## Pushing to Local Registry

### Option 1: Simple Registry (For Unraid)

1. **Tag the image for your registry:**
```bash
# Replace <your-unraid-ip> with your Unraid server IP
podman tag maria-writer:latest <your-unraid-ip>:5000/maria-writer:latest
```

2. **Push to registry:**
```bash
podman push <your-unraid-ip>:5000/maria-writer:latest --tls-verify=false
```

### Option 2: Using Environment Variables

1. **Set your registry in .env:**
```env
REGISTRY=192.168.1.100:5000
TAG=latest
```

2. **Build and push:**
```bash
# Build with the registry tag
podman-compose build

# Push to registry
podman push ${REGISTRY}/maria-writer:${TAG} --tls-verify=false
```

## Running on Unraid

### Method 1: Using Docker Compose on Unraid

1. Copy the `docker-compose.yml` to your Unraid server
2. Create a `.env` file with your configuration
3. Run via Unraid's Docker Compose plugin or terminal:
```bash
docker-compose up -d
```

### Method 2: Using Unraid's Docker GUI

1. Go to Docker tab in Unraid
2. Click "Add Container"
3. Configure:
   - **Repository:** `<your-unraid-ip>:5000/maria-writer:latest`
   - **Name:** maria-writer
   - **Port:** Host Port: 8080, Container Port: 80
   - **Network Type:** Bridge

## Development Workflow

### Local Development with Hot Reload

```bash
# Run development server (not in container)
npm run dev
```

### Build and Test Container Locally

```bash
# Build
podman build -t maria-writer:dev .

# Run
podman run -d -p 8080:80 --name maria-writer-dev maria-writer:dev

# Test
curl http://localhost:8080

# Clean up
podman stop maria-writer-dev && podman rm maria-writer-dev
```

### Complete Workflow: Build, Test, Push

```bash
# 1. Build the image
podman-compose build

# 2. Test locally
podman-compose up -d
# Visit http://localhost:8080 and test the app

# 3. Push to your registry
export REGISTRY="192.168.1.100:5000"
export TAG="v1.0.0"
podman push ${REGISTRY}/maria-writer:${TAG} --tls-verify=false

# 4. Also tag as latest
podman tag ${REGISTRY}/maria-writer:${TAG} ${REGISTRY}/maria-writer:latest
podman push ${REGISTRY}/maria-writer:latest --tls-verify=false

# 5. Clean up local test
podman-compose down
```

## Troubleshooting

### Podman vs Docker Commands

Podman is CLI-compatible with Docker. Simply replace `docker` with `podman`:
```bash
docker build -t maria-writer .    →  podman build -t maria-writer .
docker run -p 8080:80 maria-writer →  podman run -p 8080:80 maria-writer
```

### Registry Connection Issues

If you get TLS errors when pushing to your local registry:
```bash
# Use --tls-verify=false for local registries without HTTPS
podman push <registry>/maria-writer:latest --tls-verify=false
```

Or configure Podman to trust your registry:
```bash
# Edit /etc/containers/registries.conf
sudo nano /etc/containers/registries.conf

# Add:
[[registry]]
location = "<your-unraid-ip>:5000"
insecure = true
```

### Port Already in Use

```bash
# Check what's using the port
sudo ss -tulpn | grep :8080

# Use a different port
podman run -d -p 8081:80 --name maria-writer maria-writer:latest
```

### View Container Logs

```bash
# Podman
podman logs maria-writer

# Docker Compose
podman-compose logs maria-writer
```

### Health Check Failed

```bash
# Check container status
podman ps -a

# Inspect health
podman inspect maria-writer | grep -A 10 Health

# Enter container to debug
podman exec -it maria-writer sh
```

## Notes

- The application is a static SPA served by nginx
- All data is stored in browser localStorage
- No backend database is required
- The container is stateless and can be easily redeployed
- Default port inside container: 80
- Configure host port via PORT environment variable or docker-compose

## Security Considerations for Production

If deploying publicly:

1. Add HTTPS support (use a reverse proxy like Traefik or nginx-proxy)
2. Configure proper security headers
3. Use a secure registry with authentication
4. Regular updates of base images for security patches

```bash
# Update base images and rebuild
podman pull node:20-bookworm-slim
podman pull nginx:1.27-alpine
podman build --no-cache -t maria-writer:latest .
```
