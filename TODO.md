# TODO: Graphical Cluster Designer

## Goal
Create a visual interface for designing complete clusters with servers and executors that can be submitted to the Colony cluster and automatically created.

## Phase 1: Data Model & Architecture

### 1.1 Define Cluster Specification Schema
- [ ] Research and document the Colony cluster specification format
  - Server specification fields (name, host, port, TLS settings, etc.)
  - Executor specification fields (type, name, capabilities, resources, etc.)
  - Relationship between servers and executors
  - Authentication/key management for cluster components
- [ ] Create TypeScript types/interfaces for cluster specifications
  - `ClusterSpec` type
  - `ServerSpec` type
  - `ExecutorSpec` type
  - Validation schemas

### 1.2 Add API Methods
- [ ] Add `createServer()` method to Colony API client
  - Determine correct RPC message type
  - Define required parameters and authentication
- [ ] Add `createExecutor()` method to Colony API client
  - Determine correct RPC message type
  - Define required parameters and authentication
- [ ] Add `submitCluster()` method to handle batch creation
  - Orchestrate server creation first, then executors
  - Handle dependencies and ordering
  - Error handling and rollback strategy

## Phase 2: Visual Designer UI Components

### 2.1 Canvas Component
- [ ] Create main cluster design canvas component
  - Drag-and-drop interface for adding components
  - Zoom and pan functionality
  - Grid/snap-to-grid for alignment
  - Component selection and highlighting
- [ ] Implement component palette/toolbar
  - Server component button
  - Executor component button
  - Connection tool
  - Delete tool
  - Export/Import buttons

### 2.2 Server Component
- [ ] Create visual server node component
  - Icon/visual representation
  - Display server name and key info
  - Connection points for executors
  - Hover state with details
  - Selected state
- [ ] Create server properties panel
  - Form for server configuration
    - Name
    - Host/endpoint
    - Port
    - TLS settings
    - Authentication keys
  - Validation for required fields
  - Save/cancel actions

### 2.3 Executor Component
- [ ] Create visual executor node component
  - Icon/visual representation based on executor type
  - Display executor name and type
  - Connection line to parent server
  - Hover state with details
  - Selected state
- [ ] Create executor properties panel
  - Form for executor configuration
    - Name
    - Executor type (dropdown)
    - Capabilities/functions
    - Resource requirements (CPU, memory, GPU)
    - Environment variables
    - Labels/tags
  - Validation for required fields
  - Save/cancel actions

### 2.4 Connection Visualization
- [ ] Implement visual connections between servers and executors
  - Lines/arrows showing relationships
  - Color coding by status (planned/active/error)
  - Animated flow indicators
- [ ] Allow drag-and-drop to reassign executors to different servers

## Phase 3: Design Management

### 3.1 Cluster Design State Management
- [ ] Create Svelte store for cluster design state
  - Servers array
  - Executors array
  - Connections/relationships
  - Canvas state (zoom, pan position)
- [ ] Implement undo/redo functionality
  - History stack for design changes
  - Undo/redo buttons in UI
- [ ] Add design validation
  - Check all required fields are filled
  - Validate connections (executors have servers)
  - Check for naming conflicts
  - Validate resource specifications

### 3.2 Save/Load Designs
- [ ] Add export cluster design to JSON
  - Download as `.cluster.json` file
  - Include all specifications
- [ ] Add import cluster design from JSON
  - File upload
  - Parse and validate JSON
  - Reconstruct visual layout
- [ ] Add localStorage persistence
  - Auto-save current design
  - Restore on page reload
  - Manage multiple saved designs

## Phase 4: Deployment Features

### 4.1 Preview & Validation
- [ ] Create deployment preview modal
  - Show summary of what will be created
  - List all servers with their configurations
  - List all executors grouped by server
  - Show estimated resources
  - Validation warnings/errors
- [ ] Add dry-run/validation mode
  - Check if server hosts are reachable
  - Validate authentication keys
  - Check for naming conflicts with existing resources

### 4.2 Deployment Execution
- [ ] Create deployment workflow
  - Step-by-step progress indicator
  - Create servers first (sequential or parallel)
  - Create executors after servers are ready
  - Handle failures gracefully
- [ ] Add deployment status tracking
  - Real-time status updates
  - Success/failure indicators per component
  - Error messages and logs
  - Ability to cancel deployment
- [ ] Post-deployment verification
  - Verify servers are running
  - Verify executors registered
  - Show summary of created resources
  - Link to view in existing dashboard tabs

### 4.3 Deployment History
- [ ] Track deployment history
  - Save deployment metadata
  - Timestamp, user, cluster spec
  - Success/failure status
- [ ] Show deployment logs
  - Detailed logs of each step
  - Error messages and stack traces
- [ ] Add rollback functionality
  - Delete created resources on failure
  - Manual rollback option for successful deployments

## Phase 5: Advanced Features

### 5.1 Templates
- [ ] Create cluster template system
  - Pre-defined cluster configurations
  - Templates for common use cases:
    - Small development cluster
    - Production cluster with HA
    - GPU compute cluster
    - Edge computing cluster
- [ ] Template library UI
  - Browse available templates
  - Preview template before applying
  - Create custom templates from designs
  - Share/export templates

### 5.2 Auto-Layout
- [ ] Implement automatic layout algorithms
  - Hierarchical layout (servers → executors)
  - Force-directed layout
  - Grid layout
- [ ] Add layout optimization
  - Minimize connection crossings
  - Group related components
  - Spacing and alignment

### 5.3 Import from Existing Cluster
- [ ] Add "Import Existing" feature
  - Fetch current cluster configuration from API
  - Automatically create visual representation
  - Allow editing and redeployment
- [ ] Show diff between current and designed state
  - Highlight what will be added
  - Highlight what will be removed
  - Highlight what will be modified

### 5.4 Resource Monitoring Integration
- [ ] Show real-time status on visual components
  - Server health indicators
  - Executor active/idle status
  - Resource utilization overlays
- [ ] Add alerts/notifications
  - Highlight failed components
  - Show warning for resource constraints
  - Alert on configuration drift

## Phase 6: UI/UX Polish

### 6.1 User Experience
- [ ] Add contextual help/tooltips
  - Explain each field and option
  - Show examples
  - Link to documentation
- [ ] Keyboard shortcuts
  - Delete selected component
  - Duplicate component
  - Undo/redo
  - Save design
- [ ] Search/filter in component palette
  - Search by executor type
  - Filter by capability

### 6.2 Visual Design
- [ ] Professional visual styling
  - Custom icons for different executor types
  - Color scheme for different states
  - Smooth animations
- [ ] Responsive design
  - Work on different screen sizes
  - Mobile-friendly (view-only mode)
- [ ] Dark mode support
  - Dark theme for canvas
  - Adjusted colors for visibility

### 6.3 Accessibility
- [ ] Keyboard navigation
  - Tab through components
  - Arrow keys to move selected component
- [ ] Screen reader support
  - ARIA labels
  - Descriptive text alternatives
- [ ] High contrast mode

## Phase 7: Testing & Documentation

### 7.1 Testing
- [ ] Unit tests for state management
- [ ] Integration tests for API calls
- [ ] E2E tests for complete workflow
- [ ] Test error scenarios and edge cases
- [ ] Performance testing with large clusters

### 7.2 Documentation
- [ ] User guide for cluster designer
  - Getting started tutorial
  - Component reference
  - Example workflows
- [ ] API documentation
  - Cluster specification format
  - RPC message formats
- [ ] Developer documentation
  - Architecture overview
  - Component structure
  - Extension guide

## Notes & Considerations

### Technical Decisions
- **Canvas Library**: Consider using a library like:
  - React Flow / Svelte Flow for node-based UI
  - Konva.js for canvas manipulation
  - D3.js for visualization
  - Or build custom with SVG

### Security Considerations
- Don't store private keys in designs
- Encrypt sensitive data in localStorage
- Validate all inputs before submission
- Implement proper authentication for deployment actions

### Performance Considerations
- Lazy load large clusters
- Virtualize canvas for many components
- Debounce auto-save
- Optimize re-renders

### Future Enhancements
- Multi-user collaboration (real-time editing)
- Version control for designs
- CI/CD integration (deploy from Git)
- Cost estimation for cloud deployments
- Cluster optimization recommendations
- A/B testing for cluster configurations

## Dependencies to Add
```json
{
  "dependencies": {
    "@sveltejs/kit": "^2.x.x",
    "svelte": "^5.x.x"
    // Consider adding:
    // "@xyflow/svelte": "^1.x.x",  // For node-based UI
    // "d3": "^7.x.x",               // For visualizations
    // "zod": "^3.x.x"               // For schema validation
  }
}
```

## Priority Order
1. **Phase 1** (Foundation) - Critical
2. **Phase 2** (Basic UI) - Critical
3. **Phase 3** (State Management) - High
4. **Phase 4** (Deployment) - High
5. **Phase 5** (Advanced Features) - Medium
6. **Phase 6** (Polish) - Medium
7. **Phase 7** (Testing & Docs) - High (ongoing)

## Estimated Timeline
- Phase 1: 1-2 weeks
- Phase 2: 2-3 weeks
- Phase 3: 1-2 weeks
- Phase 4: 2-3 weeks
- Phase 5: 2-3 weeks
- Phase 6: 1-2 weeks
- Phase 7: Ongoing

**Total Estimated Time**: 10-15 weeks for full implementation
