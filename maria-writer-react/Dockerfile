# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Serve stage
FROM nginx:1.27-alpine

# Replace default site with a SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
