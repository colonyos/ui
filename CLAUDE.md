# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Colony management dashboard built with SvelteKit 2.x and Svelte 5. The application provides a web interface for managing Colony distributed computing resources including executors, functions, processes, cron jobs, and workflows. It communicates with Colony servers via RPC calls using cryptographic authentication.

## Development Commands

- `npm run dev` - Start development server
- `npm run dev -- --open` - Start dev server and open in browser
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run check` - Type checking with svelte-check
- `npm run check:watch` - Type checking in watch mode
- `npm run lint` - Run ESLint

## Architecture

### Colony API Integration
The core architecture centers around the Colony API client (`src/lib/api/colony.ts`):
- **ColonyClient**: Main API client class that handles RPC communication
- **Authentication**: Uses multiple key types (server, colony, executor, user) for different operations
- **RPC Protocol**: Base64-encoded JSON payloads with cryptographic signatures
- **Key Methods**: `getColonies()`, `getExecutors()`, `getExecutor()`, `getFunctionsForExecutor()`, `getProcesses()`, `getProcess()`, `removeProcess()`, `getCrons()`, `getCron()`, `runCron()`, `removeAllProcesses()`, `getGenerators()`, `getProcessGraphs()`

### Configuration and State Management
- **Environment Config** (`src/lib/config/env.ts`): Build-time configuration using `VITE_COLONIES_*` prefixed environment variables from `.env` file (Vite automatically exposes these to the client)
- **App State** (`src/lib/stores/appState.ts`): Runtime state management with localStorage persistence and connection status tracking
- **Crypto Integration** (`src/lib/crypto/crypto.js`): Handles cryptographic signing for RPC authentication

### Data Flow Patterns
Each page follows a consistent pattern:
1. **Initialization**: Load crypto, configure clients with appropriate keys
2. **Data Loading**: Call Colony APIs with proper authentication (server key for getColonies, colony key for getExecutors/getFunctions)
3. **Data Conversion**: Transform API responses to match UI component interfaces
4. **Reactive Display**: Use Svelte 5 `$state()` for reactive state management

### Component Architecture
- **Table Components**: Reusable tables (CronTable, ExecutorTable, FunctionTable, ProcessTable) with optional click handlers and action callbacks
- **Modal Components**: Detail views (CronDetailsModal, ExecutorDetailsModal, ProcessDetailsModal) triggered from table clicks with comprehensive data display and action capabilities
- **Data Components**: Convert between API response formats and component interfaces
- **Sample Data**: Fallback data structure for development/testing (`src/lib/data/sample*.ts`)

### Svelte 5 Patterns
- Use `$state()` for reactive variables instead of `let`
- Use `$effect()` for side effects instead of `$:`
- Use `$props()` for component props with TypeScript interfaces
- Modal backdrop click handling with event propagation

### Authentication Flow
Different operations require different private keys:
- **Server operations** (getColonies, getStatistics, getServerStatus): server private key
- **Colony operations** (getExecutors, getExecutor, getFunctionsForExecutor, getFunctions, getCrons, getCron, runCron, getGenerators, getProcessGraphs): colony private key
- **Process operations** (getProcesses, removeAllProcesses, removeProcess): colony private key
- **Individual process details** (getProcess): general private key (user key)
- Key types are tracked in ColonyClient for debugging and proper authentication

### Connection Management  
- **Connection Testing**: Automatic connection validation on app startup
- **Error Handling**: Connection error page with retry functionality
- **Status Tracking**: 'idle' | 'connecting' | 'connected' | 'error' states
- **Fallback Behavior**: Graceful degradation when API calls fail

### Data Transformation
API responses often need conversion:
- **Field Name Mapping**: API uses camelCase, UI may expect different formats
- **Legacy Format Conversion**: Transform modern API responses to expected UI interfaces
- **JSON Parsing**: Some fields (like workflowspec) contain JSON strings that need parsing
- **Default Value Handling**: Provide sensible defaults for missing API fields

### State Persistence
- **Process Filter State**: Processes page saves filter selections (state, workflow, grouping) to localStorage
- **App State**: Connection settings and keys are persisted via appState store

### Modal Patterns and Actions
- **Detail Modals**: Support comprehensive data display with sections for timing, specifications, requirements, attributes, environment variables
- **Action Integration**: Modals support actions like running crons, deleting processes with proper confirmation dialogs
- **Workflow Awareness**: Process deletion handles workflow dependencies with appropriate warnings and error messages
- **Real-time Updates**: Actions trigger data refreshes to reflect changes immediately

### Error Handling Patterns
- **Specific Error Messages**: API errors are categorized and presented with user-friendly explanations
- **Loading States**: All async operations show loading indicators and disable actions during execution
- **Fallback Behavior**: Components gracefully handle missing data with appropriate fallback displays
- **Console Logging**: Comprehensive logging for debugging API calls and responses

### Important Notes
- Always check field names in API responses - they may differ from expected formats
- Use appropriate authentication keys for different operation types (see Authentication Flow above)
- Implement loading states and error handling for all API calls
- Fallback gracefully when real data is unavailable
- Test connection status before making API calls
- Use `$state()` for all reactive variables in Svelte 5 components to avoid reactivity warnings
- Process deletion may fail for workflow processes - UI should handle this gracefully with warnings and specific error messages