#!/bin/sh
set -e

echo "Starting Colony Dashboard entrypoint script..."

# Define the directory where built files are located
HTML_DIR="/usr/share/nginx/html"

# Function to escape special characters for sed
escape_sed() {
    echo "$1" | sed -e 's/[\/&]/\\&/g'
}

# Function to replace placeholder with environment variable value
replace_placeholder() {
    local placeholder=$1
    local env_var_name=$2
    local env_var_value=$(eval echo \$$env_var_name)

    if [ -n "$env_var_value" ]; then
        echo "Replacing $placeholder with value from $env_var_name"
        local escaped_value=$(escape_sed "$env_var_value")
        find "$HTML_DIR" -type f -name "*.js" -exec sed -i "s/$placeholder/$escaped_value/g" {} \;
    else
        echo "Warning: $env_var_name not set, keeping placeholder $placeholder"
    fi
}

# Replace all environment variable placeholders (for credentials and keys)
echo "Injecting runtime environment variables..."

replace_placeholder "__VITE_COLONIES_SERVER_PRVKEY__" "COLONIES_SERVER_PRVKEY"
replace_placeholder "__VITE_COLONIES_COLONY_NAME__" "COLONIES_COLONY_NAME"
replace_placeholder "__VITE_COLONIES_COLONY_PRVKEY__" "COLONIES_COLONY_PRVKEY"
replace_placeholder "__VITE_COLONIES_PRVKEY__" "COLONIES_PRVKEY"
replace_placeholder "__VITE_AWS_S3_ENDPOINT__" "AWS_S3_ENDPOINT"
replace_placeholder "__VITE_AWS_S3_ACCESSKEY__" "AWS_S3_ACCESSKEY"
replace_placeholder "__VITE_AWS_S3_SECRETKEY__" "AWS_S3_SECRETKEY"
replace_placeholder "__VITE_AWS_S3_REGION__" "AWS_S3_REGION"
replace_placeholder "__VITE_AWS_S3_BUCKET__" "AWS_S3_BUCKET"
replace_placeholder "__VITE_AWS_S3_TLS__" "AWS_S3_TLS"
replace_placeholder "__VITE_AWS_S3_SKIPVERIFY__" "AWS_S3_SKIPVERIFY"

echo "Environment variable injection complete."

# Configure nginx with proxy to Colony backend server
echo "Configuring nginx proxy..."

# Backend configuration (from runtime environment variables)
BACKEND_HOST="${COLONY_BACKEND_HOST:-localhost}"
BACKEND_PORT="${COLONY_BACKEND_PORT:-50080}"
BACKEND_TLS="${COLONY_BACKEND_TLS:-false}"

# Determine backend protocol
if [ "$BACKEND_TLS" = "true" ]; then
    BACKEND_PROTOCOL="https"
else
    BACKEND_PROTOCOL="http"
fi

BACKEND_URL="${BACKEND_PROTOCOL}://${BACKEND_HOST}:${BACKEND_PORT}"

echo "Backend URL: $BACKEND_URL"

# Generate nginx configuration
cat > /etc/nginx/conf.d/default.conf <<EOF
# Custom log format with timing information
log_format timing '\$remote_addr - \$remote_user [\$time_local] '
                  '"\$request" \$status \$body_bytes_sent '
                  '"\$http_referer" "\$http_user_agent" '
                  'rt=\$request_time uct=\$upstream_connect_time '
                  'uht=\$upstream_header_time urt=\$upstream_response_time';

server {
    listen 80;
    server_name _;
    server_tokens off;

    root /usr/share/nginx/html;
    index 200.html;

    # Use timing log format for access logs
    access_log /var/log/nginx/access.log timing;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm;

    # Proxy API requests to Colony backend
    location /api {
        proxy_pass ${BACKEND_URL}/api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Disable buffering for streaming responses
        proxy_buffering off;
    }

    # SPA routing - try files, fallback to 200.html
    location / {
        try_files \$uri \$uri/ /200.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

echo "Nginx configuration complete."
echo "Starting nginx..."

# Start nginx in foreground mode
exec nginx -g 'daemon off;'
