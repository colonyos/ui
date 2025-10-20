# TODO: Colony Overview Visualization

## Goal
Develop an advanced Colony Overview that visualizes the real-time relationship between servers, executors, and processes. The visualization should show:
1. The hierarchical structure (servers → executors)
2. Real-time process assignment and execution flow
3. Process lifecycle from submission to completion

## Phase 1: Foundation & Data Architecture

### 1.1 API Data Collection
- [ ] Review existing Colony API methods
  - `getColonies()` - Get colony information
  - `getExecutors(colonyName)` - Get executors in a colony
  - `getProcesses(colonyName, count, state)` - Get processes
  - `getServerStatus()` - Get server health status
- [ ] Add missing API methods (if needed)
  - [ ] `getExecutorStatus(executorId)` - Real-time executor state
  - [ ] `getProcessHistory(processId)` - Process lifecycle events
  - [ ] `getAssignments()` - Get process-to-executor assignments
- [ ] Define polling/refresh strategy
  - Real-time vs periodic updates
  - WebSocket support investigation
  - Polling intervals for different data types

### 1.2 Data Model Enhancement
- [ ] Create comprehensive TypeScript interfaces
  - [ ] `ColonyOverview` - Top-level overview structure
  - [ ] `ServerNode` - Server with its executors
  - [ ] `ExecutorNode` - Executor with current assignments
  - [ ] `ProcessAssignment` - Process assignment to executor
  - [ ] `ProcessFlow` - Process lifecycle events
- [ ] Define relationship structures
  - [ ] Server → Executors mapping
  - [ ] Executor → Processes mapping
  - [ ] Process → Executor history
- [ ] Create data transformation utilities
  - Transform API responses to visualization data
  - Aggregate data from multiple API calls
  - Calculate derived metrics (utilization, queue depth, etc.)

## Phase 2: Static Relationship Visualization

### 2.1 Server-Executor Hierarchy
- [ ] Create hierarchical layout component
  - [ ] Server nodes at top level
  - [ ] Executor nodes grouped under servers
  - [ ] Visual connection lines
- [ ] Design server node component
  - [ ] Server icon/representation
  - [ ] Server name and ID
  - [ ] Status indicator (online/offline/error)
  - [ ] Resource summary (total CPU, memory, executors)
  - [ ] Click to expand/collapse executors
- [ ] Design executor node component
  - [ ] Executor icon (varies by type: cli, container, hpc, etc.)
  - [ ] Executor name and type
  - [ ] Status indicator (idle/busy/offline)
  - [ ] Current workload indicator
  - [ ] Available capabilities list
  - [ ] Resource usage bars (CPU, memory)

### 2.2 Layout Algorithms
- [ ] Implement layout options
  - [ ] Tree layout (hierarchical top-down)
  - [ ] Cluster layout (grouped by server)
  - [ ] Force-directed layout (dynamic positioning)
  - [ ] Grid layout (organized rows/columns)
- [ ] Add layout controls
  - [ ] Layout selector dropdown
  - [ ] Zoom in/out controls
  - [ ] Pan/drag canvas
  - [ ] Reset view button
  - [ ] Fit to screen button

### 2.3 Interaction Features
- [ ] Node selection and focus
  - Click server to highlight all its executors
  - Click executor to show details panel
  - Multi-select with Ctrl/Cmd
- [ ] Detail panels
  - [ ] Server details sidebar
    - Configuration
    - Statistics
    - Connected executors list
  - [ ] Executor details sidebar
    - Specifications
    - Current processes
    - Historical performance
- [ ] Search and filter
  - [ ] Search by server/executor name
  - [ ] Filter by executor type
  - [ ] Filter by status (idle/busy)
  - [ ] Show only servers with available executors

## Phase 3: Real-Time Process Flow Visualization

### 3.1 Process Assignment Visualization
- [ ] Design process representation
  - [ ] Small process node/badge
  - [ ] Process ID display
  - [ ] Process state color coding
    - Waiting: Yellow
    - Assigned: Blue
    - Running: Green
    - Success: Light green
    - Failed: Red
  - [ ] Process type/function name
- [ ] Implement assignment animation
  - [ ] Process appears in server queue
  - [ ] Animated flow from server to executor
  - [ ] Process "lands" on executor node
  - [ ] Smooth transitions (300-500ms)
- [ ] Show process queue
  - [ ] Waiting processes at server level
  - [ ] Queue count indicator
  - [ ] Queue depth visualization

### 3.2 Process Execution Visualization
- [ ] Active process indicators on executors
  - [ ] Show process running on executor
  - [ ] Animated "working" indicator (pulse, spin)
  - [ ] Progress bar (if available)
  - [ ] Elapsed time counter
- [ ] Create execution timeline
  - [ ] Process lifecycle visualization
  - [ ] Start time, execution time, end time
  - [ ] Visual timeline scrubber
- [ ] Add process details overlay
  - Click process to see:
    - [ ] Full process specification
    - [ ] Input arguments
    - [ ] Output/results
    - [ ] Logs (if available)
    - [ ] Resource usage during execution

### 3.3 Process Completion Visualization
- [ ] Return value animation
  - [ ] Animated flow from executor back to server
  - [ ] Success/failure indicator
  - [ ] Result data preview
- [ ] Completion effects
  - [ ] Success: Green glow/flash
  - [ ] Failure: Red glow/flash
  - [ ] Fade out after display period
- [ ] Process history tracking
  - [ ] Recently completed processes list
  - [ ] Success/failure statistics
  - [ ] Average execution times

## Phase 4: Real-Time Data Updates

### 4.1 Live Data Streaming
- [ ] Implement data polling mechanism
  - [ ] Configurable poll interval (default: 2 seconds)
  - [ ] Poll for process state changes
  - [ ] Poll for executor status updates
  - [ ] Poll for server health
- [ ] Optimize API calls
  - [ ] Batch requests where possible
  - [ ] Only fetch changed data (if API supports)
  - [ ] Implement debouncing/throttling
- [ ] WebSocket integration (if available)
  - [ ] Subscribe to process events
  - [ ] Subscribe to executor state changes
  - [ ] Real-time updates without polling

### 4.2 State Management
- [ ] Create Svelte stores for real-time data
  - [ ] `coloniesStore` - Colony list and selection
  - [ ] `serversStore` - Server nodes and status
  - [ ] `executorsStore` - Executor nodes and assignments
  - [ ] `processesStore` - Active and recent processes
  - [ ] `assignmentsStore` - Process-to-executor mappings
- [ ] Implement reactive updates
  - [ ] Automatic UI updates on data changes
  - [ ] Smooth transitions between states
  - [ ] No jarring re-renders
- [ ] Add data caching
  - [ ] Cache recent data to reduce API calls
  - [ ] Invalidate cache on relevant changes
  - [ ] Configurable cache TTL

### 4.3 Performance Optimization
- [ ] Handle large datasets
  - [ ] Virtualization for many nodes
  - [ ] Pagination for process lists
  - [ ] Lazy loading of details
- [ ] Optimize animations
  - [ ] Use CSS transforms for performance
  - [ ] Reduce animation complexity for many items
  - [ ] Pause animations when not visible
- [ ] Memory management
  - [ ] Limit history size
  - [ ] Clean up old process data
  - [ ] Unsubscribe from events when not needed

## Phase 5: Advanced Visualization Features

### 5.1 Flow Animation Enhancements
- [ ] Multiple process flows simultaneously
  - [ ] Stagger animations to prevent overlap
  - [ ] Show multiple processes on one executor
  - [ ] Queue visualization at executor level
- [ ] Flow path optimization
  - [ ] Smart routing to avoid overlaps
  - [ ] Curved paths for better visibility
  - [ ] Color-coded flows by process type
- [ ] Flow effects
  - [ ] Particle effects along flow path
  - [ ] Pulse/wave animation
  - [ ] Speed based on process priority

### 5.2 Metrics and Statistics
- [ ] Real-time metrics dashboard
  - [ ] Total processes: Waiting/Running/Completed/Failed
  - [ ] Executor utilization percentage
  - [ ] Average execution time
  - [ ] Success/failure rate
  - [ ] Throughput (processes per minute)
- [ ] Historical charts
  - [ ] Process count over time (line chart)
  - [ ] Executor utilization over time (area chart)
  - [ ] Success/failure distribution (pie chart)
- [ ] Heatmaps
  - [ ] Executor activity heatmap
  - [ ] Server load heatmap
  - [ ] Time-of-day activity heatmap

### 5.3 Alerts and Notifications
- [ ] Visual alerts on nodes
  - [ ] Failed process badge on executor
  - [ ] Overloaded executor warning
  - [ ] Offline server alert
- [ ] Alert notification system
  - [ ] Toast notifications for critical events
  - [ ] Alert history panel
  - [ ] Configurable alert rules
- [ ] Health monitoring
  - [ ] Server health score
  - [ ] Executor health indicators
  - [ ] System-wide health status

## Phase 6: Interactive Features

### 6.1 Process Management
- [ ] Submit process from visualization
  - [ ] Click server to submit new process
  - [ ] Quick-submit common process types
  - [ ] Drag process spec to server
- [ ] Process control actions
  - [ ] Cancel running process
  - [ ] Retry failed process
  - [ ] View process logs
  - [ ] Download process results
- [ ] Batch operations
  - [ ] Select multiple processes
  - [ ] Bulk cancel/retry
  - [ ] Export selected process data

### 6.2 Executor Management
- [ ] Executor control actions
  - [ ] Drain executor (stop accepting new processes)
  - [ ] Restart executor
  - [ ] View executor logs
  - [ ] Modify executor settings (if supported)
- [ ] Resource allocation
  - [ ] Show available vs allocated resources
  - [ ] Adjust resource limits
  - [ ] Set executor priorities

### 6.3 Colony Configuration
- [ ] Colony-level settings
  - [ ] Default executor selection strategy
  - [ ] Process timeout settings
  - [ ] Retry policies
- [ ] Visualization preferences
  - [ ] Auto-refresh toggle
  - [ ] Refresh interval slider
  - [ ] Animation speed control
  - [ ] Color theme selection

## Phase 7: UI/UX Enhancements

### 7.1 Visual Design
- [ ] Professional node styling
  - [ ] Custom SVG icons for each executor type
  - [ ] Glassmorphism/modern design style
  - [ ] Smooth gradients and shadows
- [ ] Color coding system
  - [ ] Consistent status colors
  - [ ] Color-blind friendly palette
  - [ ] Dark mode support
- [ ] Animation refinement
  - [ ] Easing functions for smooth motion
  - [ ] Stagger delays for multiple items
  - [ ] Loading state animations

### 7.2 Information Density
- [ ] Compact view mode
  - [ ] Show more nodes on screen
  - [ ] Minimal details, max overview
- [ ] Detailed view mode
  - [ ] Show full information on nodes
  - [ ] Larger nodes with more details
- [ ] Focus mode
  - [ ] Dim unrelated nodes
  - [ ] Highlight selected path
  - [ ] Show only relevant information

### 7.3 User Guidance
- [ ] Interactive tutorial
  - [ ] Onboarding flow for new users
  - [ ] Highlight key features
  - [ ] Interactive tooltips
- [ ] Help documentation
  - [ ] Inline help tooltips
  - [ ] Legend for colors and icons
  - [ ] Keyboard shortcuts list
- [ ] Example scenarios
  - [ ] Demo mode with simulated data
  - [ ] Guided tour of features
  - [ ] Common workflow examples

## Phase 8: Integration & Testing

### 8.1 Integration with Existing Dashboard
- [ ] Navigation integration
  - [ ] Update main navigation to highlight colony-overview
  - [ ] Breadcrumbs for navigation context
  - [ ] Deep linking to specific views
- [ ] Cross-tab integration
  - [ ] Click executor → navigate to executors tab with filter
  - [ ] Click process → navigate to processes tab with details
  - [ ] Click server → show server details page
- [ ] Shared state
  - [ ] Selected colony persists across tabs
  - [ ] Filter settings shared where applicable
  - [ ] Recent views/history

### 8.2 Testing Strategy
- [ ] Unit tests
  - [ ] Data transformation functions
  - [ ] State management logic
  - [ ] Component rendering
- [ ] Integration tests
  - [ ] API data fetching
  - [ ] Real-time update handling
  - [ ] Cross-component interactions
- [ ] E2E tests
  - [ ] Full user workflows
  - [ ] Process submission to completion
  - [ ] Error scenarios
- [ ] Performance tests
  - [ ] Large colony (100+ executors)
  - [ ] High process throughput
  - [ ] Memory usage over time
  - [ ] Animation performance

### 8.3 Error Handling
- [ ] API error handling
  - [ ] Graceful degradation on API failure
  - [ ] Retry logic with backoff
  - [ ] User-friendly error messages
- [ ] Data validation
  - [ ] Validate API responses
  - [ ] Handle missing/malformed data
  - [ ] Fallback to cached data
- [ ] Edge cases
  - [ ] Empty colony (no executors)
  - [ ] No processes running
  - [ ] Server disconnection
  - [ ] Rapid state changes

## Technical Implementation Details

### Visualization Library Options
1. **D3.js** - Full control, steep learning curve
   - Pros: Powerful, flexible, great for custom visualizations
   - Cons: Complex, verbose code, manual DOM management

2. **Cytoscape.js** - Graph visualization library
   - Pros: Built for node-edge graphs, good layouts, interactive
   - Cons: Learning curve, may be overkill for simple hierarchies

3. **@xyflow/svelte (Svelte Flow)** - Node-based UI for Svelte
   - Pros: Native Svelte integration, interactive, modern
   - Cons: May need customization for specific needs

4. **Custom SVG with Svelte** - Build from scratch
   - Pros: Full control, optimized for needs, no dependencies
   - Cons: More development time, reinventing the wheel

**Recommendation**: Start with **@xyflow/svelte** for rapid prototyping, fall back to custom SVG if needed.

### Animation Library Options
1. **Svelte's built-in transitions** - Simple, performant
2. **Anime.js** - Powerful animation library
3. **GSAP** - Industry standard, very powerful
4. **Framer Motion** - React-focused but has Svelte alternatives

**Recommendation**: Start with **Svelte transitions**, add **Anime.js** for complex animations.

### Real-Time Updates Strategy
```javascript
// Polling strategy (simple, works everywhere)
let pollInterval = 2000; // 2 seconds
setInterval(async () => {
  await fetchLatestData();
}, pollInterval);

// WebSocket strategy (if available)
const ws = new WebSocket('wss://colony-server/ws');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  handleUpdate(update);
};
```

### Data Flow Architecture
```
API Calls → Data Stores → Computed Stores → UI Components
    ↓           ↓              ↓                ↓
 Colony     Servers      Assignments      Visualization
Executors   Processes    Flows            Animations
```

## Dependencies to Add
```json
{
  "dependencies": {
    "@xyflow/svelte": "^1.x.x",    // Node-based UI (optional)
    "d3": "^7.x.x",                 // Visualization utilities (optional)
    "animejs": "^3.x.x"             // Animation library (optional)
  }
}
```

## Priority & Phasing

### Minimum Viable Product (MVP) - 3-4 weeks
- Phase 1: Foundation
- Phase 2: Static visualization (basic)
- Phase 3: Process flow (basic)
- Phase 4: Real-time updates (polling)

### Enhanced Version - 6-8 weeks
- All MVP features
- Phase 5: Advanced visualization
- Phase 6: Interactive features
- Phase 7: UI/UX polish

### Complete Feature Set - 10-12 weeks
- All above
- Phase 8: Full integration and testing
- Advanced analytics and reporting

## Success Metrics
- [ ] Successfully visualize server-executor relationships
- [ ] Real-time process flow animation works smoothly
- [ ] Page loads in < 2 seconds with 50 executors
- [ ] Animations run at 60fps
- [ ] Zero crashes with 100+ concurrent processes
- [ ] User can understand colony state at a glance
- [ ] Intuitive enough for first-time users
- [ ] Provides actionable insights for operators

## Future Enhancements (Post-MVP)
- [ ] Historical playback (replay past process executions)
- [ ] Predictive analytics (forecast resource needs)
- [ ] Anomaly detection (detect unusual patterns)
- [ ] Comparison mode (compare colonies side-by-side)
- [ ] Export visualizations as images/videos
- [ ] Mobile app with simplified view
- [ ] AR/VR visualization for large deployments
- [ ] Machine learning for optimization recommendations

## Notes
- Start simple, iterate based on feedback
- Prioritize performance over features initially
- Get real user testing early
- Consider accessibility from the start
- Document visualization semantics clearly
- Build reusable components for other views
