#!/bin/sh
set -e

echo "🚀 Colonies Dashboard starting..."

# Inject runtime environment variables into the built JavaScript files
echo "📝 Injecting environment variables..."
node /app/inject-env.js

echo "✅ Environment variables injected successfully"
echo "🌐 Starting nginx server on port 8080..."

# Execute the command passed to the script (nginx)
exec "$@"