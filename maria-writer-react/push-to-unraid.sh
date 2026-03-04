#!/bin/bash
set -e

# Configuration
REGISTRY="memoryalpha:5000"
IMAGE_NAME="maria-writer"
TAG="${1:-latest}"

# Detect if running in Flatpak (Bazzite)
if [ -f /.flatpak-info ]; then
    PODMAN="flatpak-spawn --host podman"
else
    PODMAN="podman"
fi

LOCAL_IMAGE="${IMAGE_NAME}:${TAG}"
REMOTE_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "==================================="
echo "Pushing to Unraid Registry"
echo "==================================="
echo "Local Image:  ${LOCAL_IMAGE}"
echo "Remote Image: ${REMOTE_IMAGE}"
echo "==================================="

# Tag the image for the registry
echo "Tagging image..."
$PODMAN tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}"

# Push to registry
echo "Pushing to ${REGISTRY}..."
$PODMAN push "${REMOTE_IMAGE}" --tls-verify=false

# Also tag and push as 'latest' if a specific tag was provided
if [ "$TAG" != "latest" ]; then
    echo "Also tagging as 'latest'..."
    REMOTE_LATEST="${REGISTRY}/${IMAGE_NAME}:latest"
    $PODMAN tag "${LOCAL_IMAGE}" "${REMOTE_LATEST}"
    $PODMAN push "${REMOTE_LATEST}" --tls-verify=false
fi

echo "==================================="
echo "✓ Successfully pushed to Unraid!"
echo "==================================="
echo ""
echo "To deploy on Unraid, use:"
echo "  Image: ${REMOTE_IMAGE}"
echo "  Port: 8080:80"
