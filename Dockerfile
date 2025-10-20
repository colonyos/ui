# Multi-stage Dockerfile for Colonies Dashboard
# Supports runtime environment variable injection

# ===== BUILD STAGE =====
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application with placeholder environment variables
# These will be replaced at runtime
ENV COLONIES_HOST=__COLONIES_HOST__
ENV COLONIES_PORT=__COLONIES_PORT__
ENV COLONIES_TLS=__COLONIES_TLS__
ENV COLONIES_SERVER_PRV_KEY=__COLONIES_SERVER_PRV_KEY__
ENV COLONIES_COLONY_PRV_KEY=__COLONIES_COLONY_PRV_KEY__
ENV COLONIES_PRV_KEY=__COLONIES_PRV_KEY__
ENV COLONIES_COLONY_NAME=__COLONIES_COLONY_NAME__
ENV COLONIES_EXECUTOR_ID=__COLONIES_EXECUTOR_ID__
ENV COLONIES_EXECUTOR_PRV_KEY=__COLONIES_EXECUTOR_PRV_KEY__
ENV COLONIES_SERVER_ID=__COLONIES_SERVER_ID__
ENV COLONIES_USERNAME=__COLONIES_USERNAME__
ENV COLONIES_FIRSTNAME=__COLONIES_FIRSTNAME__
ENV COLONIES_LASTNAME=__COLONIES_LASTNAME__
ENV COLONIES_EMAIL=__COLONIES_EMAIL__
ENV COLONIES_AWS_S3_ENDPOINT=__COLONIES_AWS_S3_ENDPOINT__
ENV COLONIES_AWS_S3_ACCESSKEY=__COLONIES_AWS_S3_ACCESSKEY__
ENV COLONIES_AWS_S3_SECRETKEY=__COLONIES_AWS_S3_SECRETKEY__
ENV COLONIES_AWS_S3_REGION=__COLONIES_AWS_S3_REGION__
ENV COLONIES_AWS_S3_BUCKET=__COLONIES_AWS_S3_BUCKET__
ENV COLONIES_AWS_S3_TLS=__COLONIES_AWS_S3_TLS__

RUN npm run build

# ===== RUNTIME STAGE =====
FROM nginx:1.27-alpine AS runtime

# Install Node.js and dumb-init for environment processing and signal handling
RUN apk add --no-cache nodejs npm dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S sveltekit && \
    adduser -S sveltekit -u 1001

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create app directory and copy environment injection script
RUN mkdir -p /app
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY inject-env.js /app/inject-env.js

# Make scripts executable
RUN chmod +x /app/docker-entrypoint.sh

# Fix permissions
RUN chown -R sveltekit:sveltekit /usr/share/nginx/html && \
    chown -R sveltekit:sveltekit /var/cache/nginx && \
    chown -R sveltekit:sveltekit /var/log/nginx && \
    chown -R sveltekit:sveltekit /etc/nginx/conf.d && \
    chown -R sveltekit:sveltekit /app && \
    touch /var/run/nginx.pid && \
    chown -R sveltekit:sveltekit /var/run/nginx.pid

# Switch to non-root user
USER sveltekit

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly and custom entrypoint for env injection
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]