# Colonies Dashboard

A web interface for managing Colonies, built with SvelteKit 2.x and Svelte 5.

This was made with claude code.

## Description

The Colonies Dashboard provides a graphical interface for ColonyOS infrastructure. It enables users to visualize and limited control of resources.

## Features

- **Real-time Monitoring**: Live updates of process states, executor status, and cron job execution
- **Interactive Management**: Click-to-view detailed information with comprehensive modal dialogs
- **Action Support**: Execute actions like running cron jobs, deleting processes, with proper confirmation workflows
- **Advanced Filtering**: Filter processes by state, workflow, with persistent filter preferences
- **Workflow Awareness**: Intelligent handling of workflow dependencies and constraints
- **Responsive Design**: Modern Tailwind CSS-based UI that works across devices
- **State Persistence**: Automatic saving of user preferences and filter states

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
   Create a `.env` file with your Colony server configuration:

   ```env
   COLONIES_HOST=your-colony-host
   COLONIES_PORT=your-colony-port
   COLONIES_TLS=false
   COLONIES_SERVER_PRV_KEY=your-server-private-key
   COLONIES_COLONY_PRV_KEY=your-colony-private-key
   COLONIES_PRV_KEY=your-user-private-key
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Access the dashboard:**
   Open [http://localhost:5173](http://localhost:5173) in your browser

### Docker

1. **Build and run with Docker Compose:**

   ```bash
   # Edit docker-compose.yml with your Colony server details and keys
   docker-compose up --build
   ```

2. **Or build and run manually:**

   ```bash
   # Build the image
   docker build -t colonies-dashboard .

   # Run with environment variables
   docker run -p 8080:8080 \
     -e COLONIES_HOST=your-colony-host \
     -e COLONIES_PORT=50080 \
     -e COLONIES_TLS=false \
     -e COLONIES_SERVER_PRV_KEY=your-server-key \
     -e COLONIES_COLONY_PRV_KEY=your-colony-key \
     -e COLONIES_PRV_KEY=your-user-key \
     colonies-dashboard
   ```

3. **Access the containerized dashboard:**
   Open [http://localhost:8080](http://localhost:8080) in your browser

### Development Tools

- **Type checking:**

  ```bash
  npm run check
  ```

- **Type checking in watch mode:**

  ```bash
  npm run check:watch
  ```

- **Linting:**

  ```bash
  npm run lint
  ```

## Architecture

The dashboard follows a modular architecture with clear separation of concerns:

- **API Layer** (`src/lib/api/`): Colony RPC client with cryptographic authentication
- **Components** (`src/lib/components/`): Reusable UI components including tables and modals
- **Stores** (`src/lib/stores/`): State management with localStorage persistence
- **Types** (`src/lib/types/`): TypeScript interfaces for Colony entities
- **Pages** (`src/routes/`): SvelteKit pages for different dashboard sections

### Key Technologies

- **SvelteKit 2.x**: Full-stack web framework
- **Svelte 5**: Modern reactive UI framework with runes
- **TypeScript**: Type-safe development
- **Tailwind CSS 4.0**: Utility-first styling
- **Vite**: Fast build tool and development server

## Configuration

The dashboard supports configuration through environment variables prefixed with `COLONIES_`:

- `COLONIES_HOST`: Colony server hostname
- `COLONIES_PORT`: Colony server port
- `COLONIES_TLS`: Enable/disable TLS (true/false)
- `COLONIES_SERVER_PRV_KEY`: Server private key for server operations
- `COLONIES_COLONY_PRV_KEY`: Colony private key for colony operations
- `COLONIES_PRV_KEY`: User private key for individual resource access

Additional optional configuration variables:

- `COLONIES_COLONY_NAME`: Default colony name
- `COLONIES_EXECUTOR_ID`: Executor identifier
- `COLONIES_USERNAME`: User name
- `COLONIES_AWS_S3_*`: AWS S3 configuration for file storage
