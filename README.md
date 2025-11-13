# Colonies Dashboard

The goal is to provide a graphical interface for ColonyOS infrastructure. There is also limited control of resources.

This was made with Claude code and when ready is intended to be started from colonies CLI.

## TODOs

- Colony visualization
- Follow process after submission (websocket)

## Running

### Prerequisites

- Node.js (v18 or later)
- npm, pnpm, or yarn

### Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with your Colony server configuration. **Note:** All environment variables must be prefixed with `VITE_` to be accessible in the client-side code:

   ```env
   # Colony Server
   VITE_COLONIES_SERVER_HOST=colony-hostname
   VITE_COLONIES_SERVER_PORT=443
   VITE_COLONIES_SERVER_TLS=true
   VITE_COLONIES_SERVER_PRVKEY=server-private-key

   VITE_COLONIES_COLONY_NAME=colony-name
   VITE_COLONIES_COLONY_PRVKEY=colony-private-key

   VITE_COLONIES_PRVKEY=user-private-key

   # Optional: S3 Configuration
   VITE_AWS_S3_ENDPOINT=s3-endpoint
   VITE_AWS_S3_ACCESSKEY=access-key
   VITE_AWS_S3_SECRETKEY=secret-key
   VITE_AWS_S3_REGION=
   VITE_AWS_S3_BUCKET=bucket-name
   VITE_AWS_S3_TLS=true
   VITE_AWS_S3_SKIPVERIFY=false
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Access the dashboard:**
   Open [http://localhost:5173](http://localhost:5173) in your browser
