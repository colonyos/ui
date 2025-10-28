# Colonies Dashboard

The goal is to provide a graphical interface for ColonyOS infrastructure. There is also limited control of resources.

This was made with Claude code and when ready is intended to be started from colonies CLI.

## TODOs

- Colony visualization
- Deployment of resources
- Improve S3 integration
- Submit and delete all types of resources
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
   # Colony Server Configuration (Required)
   VITE_COLONIES_SERVER_HOST=your-colony-host
   VITE_COLONIES_SERVER_PORT=50080
   VITE_COLONIES_SERVER_TLS=false
   VITE_COLONIES_SERVER_PRVKEY=your-server-private-key
   VITE_COLONIES_PRVKEY=your-colony-and-user-private-key

   # Optional: Colony Configuration
   VITE_COLONIES_COLONY_NAME=your-colony-name
   VITE_COLONIES_EXECUTOR_ID=your-executor-id
   VITE_COLONIES_USERNAME=your-username

   # Optional: AWS S3 Configuration (for S3 browser feature)
   VITE_AWS_S3_ENDPOINT=https://s3.amazonaws.com
   VITE_AWS_S3_ACCESSKEY=your-access-key
   VITE_AWS_S3_SECRETKEY=your-secret-key
   VITE_AWS_S3_REGION=
   VITE_AWS_S3_BUCKET=your-bucket-name
   VITE_AWS_S3_TLS=true
   VITE_AWS_S3_SKIPVERIFY=false
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Access the dashboard:**
   Open [http://localhost:5173](http://localhost:5173) in your browser
