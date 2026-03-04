#!/bin/bash
# Build and push Maria Writer images to private registry
# Usage: ./build-and-push.sh [--no-cache]

set -e

REGISTRY="192.168.0.189:5000"
FRONTEND_IMAGE="maria-writer"
BACKEND_IMAGE="maria-writer-backend"
TAG="latest"

# Detect container runtime (Docker or Podman with Flatpak support for Bazzite)
if [ -f /.flatpak-info ]; then
    CONTAINER_RUNTIME="flatpak-spawn --host podman"
    echo "Detected Flatpak environment (Bazzite) - using Podman via flatpak-spawn"
elif command -v podman &> /dev/null; then
    CONTAINER_RUNTIME="podman"
    echo "Using Podman"
else
    CONTAINER_RUNTIME="docker"
    echo "Using Docker"
fi

NO_CACHE=""
if [ "$1" == "--no-cache" ]; then
  NO_CACHE="--no-cache"
  echo "Building with --no-cache"
fi

echo "=========================================="
echo "  Maria Writer - Build & Push"
echo "  Registry: ${REGISTRY}"
echo "=========================================="

# Get script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Build Frontend
echo ""
echo "[1/4] Building frontend image..."
$CONTAINER_RUNTIME build $NO_CACHE -t ${FRONTEND_IMAGE}:${TAG} ./maria-writer-react
$CONTAINER_RUNTIME tag ${FRONTEND_IMAGE}:${TAG} ${REGISTRY}/${FRONTEND_IMAGE}:${TAG}

# 2. Build Backend
echo ""
echo "[2/4] Building backend image..."
$CONTAINER_RUNTIME build $NO_CACHE -t ${BACKEND_IMAGE}:${TAG} ./maria-writer-backend
$CONTAINER_RUNTIME tag ${BACKEND_IMAGE}:${TAG} ${REGISTRY}/${BACKEND_IMAGE}:${TAG}

# 3. Push Frontend
echo ""
echo "[3/4] Pushing frontend image..."
$CONTAINER_RUNTIME push ${REGISTRY}/${FRONTEND_IMAGE}:${TAG} --tls-verify=false

# 4. Push Backend
echo ""
echo "[4/4] Pushing backend image..."
$CONTAINER_RUNTIME push ${REGISTRY}/${BACKEND_IMAGE}:${TAG} --tls-verify=false

echo ""
echo "=========================================="
echo "  Done! Images pushed:"
echo "  - ${REGISTRY}/${FRONTEND_IMAGE}:${TAG}"
echo "  - ${REGISTRY}/${BACKEND_IMAGE}:${TAG}"
echo ""
echo "  MariaDB uses the official image:"
echo "  - mariadb:11 (pulled directly on Unraid)"
echo "=========================================="
