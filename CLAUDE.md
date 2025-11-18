# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Colony management dashboard built with SvelteKit 2.x and Svelte 5. The application provides a web interface for managing Colony distributed computing resources including executors, functions, processes, cron jobs, and workflows. It communicates with Colony servers via RPC calls using cryptographic authentication.

**Build Configuration**: Uses `@sveltejs/adapter-static` to generate a fully static SPA with fallback routing (`200.html`). The application runs entirely client-side after the initial load.

## Development Commands

- `npm run dev` - Start development server
- `npm run dev -- --open` - Start dev server and open in browser
- `npm run build` - Create production build (outputs to `build/` directory)
- `npm run preview` - Preview production build locally
- `npm run check` - Type checking with svelte-check
- `npm run check:watch` - Type checking in watch mode
- `npm run lint` - Run ESLint

## Environment Configuration

The application requires a `.env` file in the project root with `VITE_` prefixed environment variables. These are exposed to the client at build time by Vite:

```env
# Colony Server
VITE_COLONIES_SERVER_HOST=colony-hostname
VITE_COLONIES_SERVER_PORT=443
VITE_COLONIES_SERVER_TLS=true
VITE_COLONIES_SERVER_PRVKEY=server-private-key

# Colony Configuration
VITE_COLONIES_COLONY_NAME=colony-name
VITE_COLONIES_COLONY_PRVKEY=colony-private-key

# User/General Key
VITE_COLONIES_PRVKEY=user-private-key

# Optional: S3 Configuration (for filesystem features)
VITE_AWS_S3_ENDPOINT=s3-endpoint
VITE_AWS_S3_ACCESSKEY=access-key
VITE_AWS_S3_SECRETKEY=secret-key
VITE_AWS_S3_REGION=us-east-1
VITE_AWS_S3_BUCKET=bucket-name
VITE_AWS_S3_TLS=true
VITE_AWS_S3_SKIPVERIFY=false
```

Configuration is loaded via `src/lib/config/env.ts` which reads from `import.meta.env.VITE_*` variables.

## Project Structure

```
src/
├── lib/
│   ├── api/
│   │   └── colony.ts              # ColonyClient - main API client with RPC communication
│   ├── components/                # Reusable Svelte components
│   │   ├── *Table.svelte         # Table components (Cron, Executor, Function, Process, Workflow, Generator)
│   │   ├── *DetailsModal.svelte  # Detail view modals
│   │   ├── Add*.svelte           # Form modals for creating resources
│   │   └── Submit*.svelte        # Form modals for submitting resources
│   ├── config/
│   │   └── env.ts                # Environment configuration from VITE_* variables
│   ├── crypto/
│   │   └── crypto.js             # WebAssembly crypto wrapper (Go-generated, do not modify)
│   ├── stores/
│   │   ├── appState.ts           # Runtime application state with localStorage persistence
│   │   └── themeStore.ts         # Dark/light theme management
│   ├── types/                    # TypeScript type definitions for all entities
│   ├── utils/
│   │   ├── clientFactory.ts      # Singleton factory for ColonyClient instances
│   │   ├── cryptoSingleton.ts    # WASM singleton manager
│   │   └── colony-data-transformer.ts  # API response transformation utilities
│   └── app.css                   # Tailwind CSS with common component classes
├── routes/
│   ├── +layout.svelte            # Root layout with sidebar and theme management
│   ├── +page.svelte              # Home/landing page
│   ├── overview/                 # Colony overview and visualization
│   ├── blueprints/               # Blueprint definitions (CRDs) management page
│   ├── processes/                # Process management page
│   ├── executors/                # Executor management page
│   ├── functions/                # Function listing page
│   ├── workflows/                # Workflow management page
│   ├── cron/                     # Cron job management page
│   ├── generators/               # Generator management page
│   ├── filesystem/               # S3 file browser page
│   ├── server/                   # Server info and user management page
│   └── deployment/               # Deployment visualization page
└── app.d.ts                      # Global TypeScript declarations

static/
└── cryptolib.wasm                # Go-compiled WebAssembly cryptography module
```

## Styling and Theming

### Tailwind CSS v3 Configuration
The application uses **Tailwind CSS v3** (not v4) for **RISC-V compatibility**. Tailwind v4's native dependencies are not compatible with RISC-V architecture.

Key configuration:
- **Version**: Tailwind CSS v3.4.x with PostCSS and Autoprefixer
- **Dark Mode**: Uses class-based dark mode with `.dark` class on document root (`darkMode: 'class'` in `tailwind.config.js`)
- **PostCSS**: Configured via `postcss.config.js` with `tailwindcss` and `autoprefixer` plugins
- **CSS Directives**: Uses v3 syntax in `src/app.css`: `@tailwind base/components/utilities`
- **Color Palette**: Consistent use of slate colors (slate-700, slate-800, slate-100, etc.) for dark mode
- **Theme Toggle**: Located in bottom left of sidebar, persists preference to localStorage

**Important**: Do NOT upgrade to Tailwind v4 - it breaks RISC-V compatibility

### Common CSS Classes
Centralized styling system defined in `src/app.css` under `@layer components`:

**Page Structure:**
- `.page-header` - Page header container with bottom margin
- `.page-title` - Page title with consistent sizing and dark mode support
- `.page-description` - Page description text (currently unused, reserved for future use)

**Table Components:**
- `.table-container` - Table wrapper with background, shadow, and rounded corners
- `.table-base` - Base table element with dividers
- `.table-header` - Table header with background color
- `.table-header-cell` - Header cell text styling
- `.table-body` - Table body with background and dividers
- `.table-row` - Table row with hover effects
- `.table-empty` - Empty state message styling

**Button Styling:**
Standardized button patterns across all pages:
- **Create/Add actions** (green plus icon): `bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors`
- **Delete/Remove actions** (red trash icon): `bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-2 rounded transition-colors`
- **Refresh actions** (blue circular arrow): `bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors`
- All action buttons use icon-only design with `w-5 h-5` SVG icons and `title` attribute for tooltips

### Dark Mode Color Patterns
- **Backgrounds**: `dark:bg-slate-700` for main containers, `dark:bg-slate-600` for headers
- **Borders**: `dark:border-slate-600` for dividers and borders
- **Text**: `dark:text-white` for headings, `dark:text-slate-100` for primary text, `dark:text-slate-300` for secondary text
- **Hover States**: `dark:hover:bg-slate-600` for interactive elements
- **Status Colors**: Adjusted for dark mode readability (e.g., `dark:text-green-400` instead of `dark:text-green-600`)

### Component Consistency Guidelines
- All table components use the common CSS classes from `app.css`
- Action buttons follow the color/icon pattern: green (create), red (delete), blue (refresh)
- Button placement: Create/delete actions on left, refresh button on right
- No colony selection dropdowns (data from all colonies shown together)
- Process page uses status filter buttons instead of dropdown
- Theme toggle is icon-only in bottom left corner of sidebar
- Form modals use large textareas for JSON input with example documentation

## Architecture

### Colony API Integration
The core architecture centers around the Colony API client (`src/lib/api/colony.ts`):
- **ColonyClient**: Main API client class that handles RPC communication
- **Authentication**: Uses multiple key types (server, colony, executor, user) for different operations
- **RPC Protocol**: Base64-encoded JSON payloads with cryptographic signatures
- **Key Methods**:
  - Colony: `getColonies()`, `getStatistics()`, `getUsers()`, `addUser()`
  - Executors: `getExecutors()`, `getExecutor()`, `getFunctionsForExecutor()`
  - Processes: `getProcesses()`, `getProcess()`, `removeProcess()`, `removeAllProcesses()`, `submitProcess()`
  - Workflows: `getProcessGraphs()`, `getProcessGraph()`, `submitWorkflowSpec()`, `removeProcessGraph()`
  - Crons: `getCrons()`, `getCron()`, `addCron()`, `runCron()`
  - Generators: `getGenerators()`, `getGenerator()`, `addGenerator()`
  - Functions: `getFunctions()`
  - Blueprint Definitions (CRDs): `getBlueprintDefinitions()`, `getBlueprintDefinition()`, `addBlueprintDefinition()`, `removeBlueprintDefinition()`
  - Blueprints (Instances): `getBlueprints()`, `getAllBlueprints()`, `getBlueprintsByNamespace()`, `getBlueprintsByKind()`, `getBlueprint()`, `getBlueprintByName()`, `addBlueprint()`, `removeBlueprint()`, `getBlueprintHistory()`

### Configuration and State Management
- **Environment Config** (`src/lib/config/env.ts`): Build-time configuration using `VITE_COLONIES_*` prefixed environment variables from `.env` file (Vite automatically exposes these to the client)
- **App State** (`src/lib/stores/appState.ts`): Runtime state management with localStorage persistence (debounced 100ms) and connection status tracking
- **Theme Store** (`src/lib/stores/themeStore.ts`): Dark/light mode preference with system detection fallback
- **Crypto Integration** (`src/lib/crypto/crypto.js`): Handles cryptographic signing for RPC authentication via WebAssembly
- **CryptoSingleton** (`src/lib/utils/cryptoSingleton.ts`): Ensures WASM module loads only once, returns shared instance
- **ClientFactory** (`src/lib/utils/clientFactory.ts`): Singleton pattern that caches three client types (ServerClient, ColonyClient, GeneralClient) with proper key configuration

### Data Flow Patterns
Each page follows a consistent pattern:
1. **Initialization**: Get clients via `ClientFactory.getServerClient()` / `getColonyClient()` / `getGeneralClient()`
2. **Data Loading**: Call Colony APIs with proper authentication (ClientFactory handles key assignment automatically)
3. **Data Conversion**: Transform API responses to match UI component interfaces (field mapping, JSON parsing, defaults)
4. **Reactive Display**: Use Svelte 5 `$state()` for reactive state management
5. **User Actions**: Modal interactions trigger mutations, followed by data refresh

### Component Architecture
- **Table Components**: Reusable tables (BlueprintTable, CronTable, ExecutorTable, FunctionTable, ProcessTable, WorkflowTable, GeneratorTable) with optional click handlers and action callbacks
- **Modal Components**:
  - Detail views (BlueprintDetailsModal, CronDetailsModal, ExecutorDetailsModal, ProcessDetailsModal, GeneratorDetailsModal) triggered from table clicks
  - Form modals (DeployBlueprintModal, SubmitProcessModal, SubmitWorkflowModal, AddBlueprintModal, AddCronModal, AddGeneratorModal) for creating resources
  - DeployBlueprintModal: Dynamic form generation from CRD schemas for deploying blueprint instances
  - User management (AddUser modal on Server tab with key pair generation)
- **DAG Visualization**: WorkflowDAG component using `@xyflow/svelte` for process graph rendering
- **S3 Browser**: File/folder navigation with upload/download capabilities using AWS SDK v3

### Svelte 5 Patterns
- Use `$state()` for reactive variables instead of `let`
- Use `$effect()` for side effects instead of `$:`
- Use `$props()` for component props with TypeScript interfaces
- Modal backdrop click handling with event propagation

### Authentication Flow
Different operations require different private keys (automatically assigned by ClientFactory):
- **Server operations** (getColonies, getStatistics): server private key via `ServerClient`
- **Colony operations** (getExecutors, getExecutor, getFunctionsForExecutor, getFunctions, getCrons, getCron, runCron, addCron, getGenerators, addGenerator, getProcessGraphs, getUsers, submitWorkflowSpec): colony private key via `ColonyClient`
- **Process operations** (getProcesses, removeAllProcesses, removeProcess, submitProcess): colony private key via `ColonyClient`
- **User operations** (addUser): user private key (VITE_COLONIES_PRVKEY) via `GeneralClient`
- **Individual process details** (getProcess): user private key (VITE_COLONIES_PRVKEY) via `GeneralClient`
- Key types are tracked in ColonyClient for debugging and proper authentication
- Use appropriate client from ClientFactory - it handles key assignment automatically

**Important**: Always use `await ClientFactory.getXClient()` rather than creating clients directly

### Connection Management  
- **Connection Testing**: Automatic connection validation on app startup
- **Error Handling**: Connection error page with retry functionality
- **Status Tracking**: 'idle' | 'connecting' | 'connected' | 'error' states
- **Fallback Behavior**: Graceful degradation when API calls fail

### Blueprint Definitions vs Blueprints
The system distinguishes between two types of blueprint entities:

**Blueprint Definitions (CRDs/Templates)**:
- Define **what can be created** (like Kubernetes CustomResourceDefinitions)
- Stored per colony with `namespace` field (not `colonyname`)
- Have `blueprintdefinitionid` field (not `blueprintid`)
- Contain `spec.schema` defining properties, `spec.handler` for reconciliation
- Display in the Blueprints tab with columns: Name, Kind, Colony, Group, Version, Scope
- Can be deployed via DeployBlueprintModal which generates dynamic forms from schema

**Blueprint Instances**:
- Actual deployed resources created from definitions
- Have `blueprintid` field
- Contain `spec` with values matching the definition's schema
- Created via `addBlueprint()` RPC call

**RPC Message Patterns**:
- `getblueprintdefinitionsmsg`: Requires `colonyname` field, returns array of definitions
- `getblueprintsmsg`: Requires `namespace` and optional `kind` fields, returns array of instances
- Blueprint definition modal shows: CRD info, handler, schema properties (with types/descriptions/required badges), auto-generated example, collapsible full spec

### Data Transformation
API responses often need conversion:
- **Field Name Mapping**: API uses camelCase, UI may expect different formats
- **Blueprint Definition Fields**: Use `blueprintdefinitionid` not `blueprintid`, `namespace` not `colonyname` in getBlueprints RPC
- **Legacy Format Conversion**: Transform modern API responses to expected UI interfaces
- **JSON Parsing**: Some fields (like workflowspec) contain JSON strings that need parsing
- **Default Value Handling**: Provide sensible defaults for missing API fields

### State Persistence
- **Process Filter State**: Processes page saves filter selections (state, grouping) to localStorage
- **Theme State**: Dark/light mode preference persisted via themeStore with localStorage
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

### Important Notes and Common Pitfalls
- **Field Name Mapping**: Always check field names in API responses - they may differ from expected formats (API uses camelCase consistently)
- **Authentication Keys**: Use appropriate client from ClientFactory for different operation types (see Authentication Flow above) - using the wrong key will result in authentication errors
- **WASM Loading**: Never create ColonyClient directly - always use ClientFactory to ensure WASM is loaded first
- **Loading States**: Implement loading states and error handling for all API calls
- **Fallback Behavior**: Fallback gracefully when real data is unavailable
- **Connection Status**: Test connection status before making API calls
- **Svelte 5 Reactivity**: Use `$state()` for all reactive variables in Svelte 5 components to avoid reactivity warnings
- **Process Deletion**: Process deletion may fail for workflow processes - UI should handle this gracefully with warnings and specific error messages
- **localStorage Persistence**: Process filter state and theme preferences are persisted to localStorage - changes survive page reloads
- **Environment Variables**: All client-side environment variables must be prefixed with `VITE_` to be accessible

### Styling Best Practices
- **Use Common Classes**: Prefer the centralized CSS classes from `app.css` for tables and page structure
- **Dark Mode**: Always include dark mode variants for colors (backgrounds, text, borders)
- **Slate Palette**: Use slate colors for consistency in dark mode (not gray)
- **Button Consistency**: Follow the standard pattern - green plus (create), red trash (delete), blue refresh
- **Button Layout**: Action buttons (create/delete) on left side, refresh button on right side
- **Event Handlers**: Use `on:click` for Svelte 5 (not `onclick` for most cases, except where explicitly needed)
- **Theme Store**: Access theme state via `themeStore` for dark/light mode
- **No Dropdowns for Colony Selection**: Show all colony data together without filtering UI

## WebAssembly Cryptography

The application uses a Go-compiled WASM module for cryptographic operations:

**Module Location**: `static/cryptolib.wasm` (must be in the `static/` directory to be served)
**JavaScript Wrapper**: `src/lib/crypto/crypto.js` (provides Go runtime polyfills and WASM loading)
**Singleton Manager**: `src/lib/utils/cryptoSingleton.ts` (ensures single instance)

**Available Functions**:
- `prvkey()` - Generate a new private key
- `id(prvkey)` - Derive user ID from private key
- `sign(msg, prvkey)` - Sign a message with private key
- `hash(msg)` - Hash a message
- `recoverid(msg, sig)` - Recover ID from message and signature

**Usage Pattern**:
```typescript
const crypto = await CryptoSingleton.getInstance();
const privateKey = crypto.prvkey();
const userId = crypto.id(privateKey);
const signature = crypto.sign(message, privateKey);
```

**Important**:
- Always use `CryptoSingleton.getInstance()` to ensure WASM loads only once
- WASM module must be loaded before any API calls (handled automatically in ClientFactory)
- The Go runtime in `crypto.js` provides necessary polyfills for the WASM module
- Do not modify `crypto.js` - it's generated from Go source