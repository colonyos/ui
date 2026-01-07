# Stage 1: Build the SvelteKit application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies (use ci for clean, reproducible builds)
RUN npm ci

# Copy application source code
COPY . .

# Build arguments with placeholder values for runtime injection
# Server host/port are empty to enable nginx proxy with relative URLs
ARG VITE_COLONIES_SERVER_HOST=
ARG VITE_COLONIES_SERVER_PORT=
ARG VITE_COLONIES_SERVER_TLS=false
ARG VITE_COLONIES_SERVER_PRVKEY=__VITE_COLONIES_SERVER_PRVKEY__
ARG VITE_COLONIES_COLONY_NAME=__VITE_COLONIES_COLONY_NAME__
ARG VITE_COLONIES_COLONY_PRVKEY=__VITE_COLONIES_COLONY_PRVKEY__
ARG VITE_COLONIES_PRVKEY=__VITE_COLONIES_PRVKEY__
ARG VITE_AWS_S3_ENDPOINT=__VITE_AWS_S3_ENDPOINT__
ARG VITE_AWS_S3_ACCESSKEY=__VITE_AWS_S3_ACCESSKEY__
ARG VITE_AWS_S3_SECRETKEY=__VITE_AWS_S3_SECRETKEY__
ARG VITE_AWS_S3_REGION=__VITE_AWS_S3_REGION__
ARG VITE_AWS_S3_BUCKET=__VITE_AWS_S3_BUCKET__
ARG VITE_AWS_S3_TLS=__VITE_AWS_S3_TLS__
ARG VITE_AWS_S3_SKIPVERIFY=__VITE_AWS_S3_SKIPVERIFY__

# Build the application with placeholder environment variables
ENV VITE_COLONIES_SERVER_HOST=$VITE_COLONIES_SERVER_HOST \
    VITE_COLONIES_SERVER_PORT=$VITE_COLONIES_SERVER_PORT \
    VITE_COLONIES_SERVER_TLS=$VITE_COLONIES_SERVER_TLS \
    VITE_COLONIES_SERVER_PRVKEY=$VITE_COLONIES_SERVER_PRVKEY \
    VITE_COLONIES_COLONY_NAME=$VITE_COLONIES_COLONY_NAME \
    VITE_COLONIES_COLONY_PRVKEY=$VITE_COLONIES_COLONY_PRVKEY \
    VITE_COLONIES_PRVKEY=$VITE_COLONIES_PRVKEY \
    VITE_AWS_S3_ENDPOINT=$VITE_AWS_S3_ENDPOINT \
    VITE_AWS_S3_ACCESSKEY=$VITE_AWS_S3_ACCESSKEY \
    VITE_AWS_S3_SECRETKEY=$VITE_AWS_S3_SECRETKEY \
    VITE_AWS_S3_REGION=$VITE_AWS_S3_REGION \
    VITE_AWS_S3_BUCKET=$VITE_AWS_S3_BUCKET \
    VITE_AWS_S3_TLS=$VITE_AWS_S3_TLS \
    VITE_AWS_S3_SKIPVERIFY=$VITE_AWS_S3_SKIPVERIFY

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy entrypoint script and make it executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use custom entrypoint for runtime env var injection and nginx proxy configuration
ENTRYPOINT ["/docker-entrypoint.sh"]
