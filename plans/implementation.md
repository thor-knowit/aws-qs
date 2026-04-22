# AWS Console Quick Switch Extension Implementation Plan

## Objective

Build a Chrome extension for the AWS Console that lets users quickly switch between many AWS account/role targets using a hybrid tree + search UX, supports arbitrary-depth hierarchical grouping, and remembers expanded folders between sessions, without handling credentials or IAM Identity Center.

## Finalized Technical Decisions

### Core Stack

- Browser platform: Chrome Extension Manifest V3
- Language: TypeScript
- UI framework: React
- Build tool: Vite
- State management: Zustand
- Validation: Zod
- Styling: Tailwind CSS
- Testing: Vitest + React Testing Library
- Persistence: Chrome extension storage APIs
- Architecture: popup-first, minimal background service worker
- Data model: normalized tree with stable IDs

### Scope Boundaries

Included in MVP:

- deep folder hierarchy
- AWS account/role switch targets as leaf nodes
- hybrid browse + search UI
- favorites
- recents
- persisted expanded-folder state
- manual add/edit/delete/move operations
- import/export

Excluded from MVP:

- IAM Identity Center
- AWS credential handling
- backend sync
- account auto-discovery
- page scraping/automation-heavy flows

## Architecture Summary

### Primary Runtime Components

- Popup application
  - main user interface
  - search
  - tree browsing
  - favorites/recents
  - node editing

- Shared domain layer
  - tree operations
  - search indexing/ranking
  - storage serialization
  - schema validation
  - migration logic
  - AWS target generation

- Background service worker
  - minimal extension lifecycle support
  - optional navigation orchestration if needed

### State Separation

- Catalog state
  - folders
  - targets
  - hierarchy
  - ordering

- Usage state
  - favorites
  - recents
  - launch metadata

- UI state
  - expanded folder IDs
  - optional view preferences

This separation is mandatory because expanded-folder persistence should survive sessions without becoming entangled with the actual business hierarchy.

## Data Model Direction

### Folder Node

- stable ID
- node type: folder
- name
- parent folder ID or root placement
- optional metadata
- created/updated metadata if desired

### Target Node

- stable ID
- node type: target
- display name
- parent folder ID
- AWS account ID
- optional account alias
- role name
- optional destination console path
- created/updated metadata if desired

### Tree Structure

Use normalized relationships:

- folders by ID
- targets by ID
- children by folder ID
- root child IDs
- explicit sibling order

### Usage and UI State

- favorite target IDs
- recent target launch list
- expanded folder IDs
- schema version

## Search Strategy

### Search Inputs

Search should match against:

- target display name
- account alias
- AWS account ID
- role name
- ancestor folder names
- full derived path

### Ranking Priorities

Recommended ranking order:

1. exact target name match
2. exact role/account/path segment match
3. favorites
4. recents
5. prefix matches
6. partial matches
7. folder matches after target matches

### Display Rules

Every search result, favorite, and recent item should display full ancestry, for example:

- `Customer A / Production / Admin`

This is necessary to disambiguate repeated role names across branches.

## Expanded Folder Persistence Rules

- expanding a folder adds its stable ID to persisted UI state
- collapsing a folder removes its ID
- popup reopens with persisted expanded IDs restored
- renaming a folder does not affect expansion state
- deleting a folder removes its ID and descendant references
- moving a folder preserves expansion state if the ID remains unchanged
- import behavior should default to resetting expanded state unless IDs are intentionally preserved

## AWS Switch Behavior

### MVP Execution Model

Treat every target as a deterministic launch definition.

Each target should provide enough metadata to generate the AWS destination needed for classic role/account switching, without scraping AWS pages or storing credentials.

### Technical Principle

Prefer URL/navigation generation over DOM automation.

Reason: page automation against AWS Console pages is more brittle, harder to test, and more likely to break with UI changes.

## Implementation Plan

### Phase 1: Foundation

- Initialize the extension as a Manifest V3 project using TypeScript, React, and Vite.
- Set up the initial project structure around popup, background, shared domain, and assets.
- Add Tailwind CSS and establish a compact popup-oriented styling baseline.
- Add Zustand for shared popup state and Zod for runtime schema validation.
- Establish a versioned persistence contract from the first commit of application logic.

### Phase 2: Domain Model and Persistence

- Define the normalized catalog model for folder nodes, target nodes, root children, and ordered child relationships.
- Define separate storage sections for catalog state, usage state, and UI state.
- Implement schema validation for restored and imported data.
- Define migration rules for future schema evolution, even if only one schema version exists initially.
- Define stable ID generation and lifecycle rules for folders and targets.

### Phase 3: Shared Domain Logic

- Implement tree operations for add, edit, delete, move, and reorder across folder and target nodes.
- Implement cleanup rules that remove invalid descendant references after deletes or failed imports.
- Implement full-path derivation for every target and folder.
- Implement search indexing and ranking over target fields and ancestry path segments.
- Implement AWS target generation as a dedicated shared-domain responsibility.

### Phase 4: Popup UX

- Build the popup shell with persistent state hydration at startup.
- Implement the hybrid layout with search at the top and browseable hierarchy below.
- Implement a collapsible tree view that supports arbitrary-depth folder nesting.
- Implement persisted expanded-folder state using stable folder IDs.
- Implement search results that prioritize targets and display full path context.
- Implement favorites and recents as overlays with full path context.
- Ensure users can move between search and browse flows without losing browse context.

### Phase 5: Node Management

- Implement forms for creating and editing folders.
- Implement forms for creating and editing AWS target nodes.
- Implement deletion flows with confirmation and integrity cleanup.
- Implement move operations for folders and targets.
- Implement ordering rules within folders and make them predictable.

### Phase 6: Import and Export

- Define a JSON import/export contract for the full catalog and selected metadata.
- Validate imported files before accepting them into storage.
- Decide and implement whether expanded-folder UI state is exported or remains device-local.
- Implement import conflict behavior for replacing existing data or merging in a controlled way.

### Phase 7: Background and Navigation

- Add a minimal background service worker only for essential extension coordination.
- Implement navigation launching in a way that works consistently from popup interactions.
- Keep permissions limited to only those required for storage and AWS navigation behavior.

### Phase 8: Testing and Hardening

- Add unit tests for tree operations, especially move, delete, reorder, and path derivation.
- Add tests for persisted expanded-folder restoration and cleanup after structural edits.
- Add tests for schema validation and migration boundaries.
- Add tests for search ranking and ancestry display behavior.
- Add component tests for the popup’s key user flows.
- Perform manual verification against realistic catalogs with repeated role names and deep nesting.

## Suggested Project Structure

- `src/popup`
  - popup app shell
  - search UI
  - tree UI
  - favorites/recents UI
  - forms/dialogs

- `src/background`
  - service worker entry
  - navigation coordination if needed

- `src/domain`
  - node types
  - tree operations
  - search logic
  - path derivation
  - AWS target generation
  - import/export
  - migrations

- `src/storage`
  - storage adapters
  - hydration/persistence
  - schema version coordination

- `src/shared`
  - common types
  - utilities
  - constants

- `src/assets`
  - extension icons and static assets

## Delivery Sequence Recommendation

1. Scaffold the extension project and baseline dependencies.
2. Define and validate the storage schema and node types.
3. Implement tree mutation logic and path derivation.
4. Implement popup hydration and persistent expanded-folder behavior.
5. Implement tree browsing and search UX.
6. Implement AWS target launching.
7. Implement favorites, recents, and node management flows.
8. Implement import/export.
9. Add tests and hardening passes.

## Verification Criteria

- Users can create arbitrary-depth folder hierarchies such as `customer / env / role`.
- Users can store more than five AWS targets persistently across sessions.
- Users can browse the tree and reopen the extension with previously expanded folders still expanded.
- Users can search by role name, account alias, account ID, or path segment.
- Search results prioritize actionable targets and always show full ancestry.
- Users can launch the intended AWS switch target from the tree, favorites, recents, or search.
- Users can add, edit, move, reorder, and delete folders and targets safely.
- Renaming a folder does not lose its expanded-state persistence.
- Deleting folders cleans up stale expanded-state references.
- Import/export preserves catalog integrity according to the defined contract.
- The extension stores no AWS credentials, tokens, or secrets.
- Requested extension permissions are limited to those necessary for the product behavior.

## Risks and Mitigations

1. Tree operations become fragile as move and delete complexity grows.  
   Mitigation: centralize all hierarchy mutations in shared domain logic and cover them with unit tests before expanding UI features.

2. Expanded-folder persistence becomes inconsistent after structural edits.  
   Mitigation: key all UI persistence off stable folder IDs and clean stale references whenever nodes are deleted or replaced.

3. Search becomes noisy with repeated names across many branches.  
   Mitigation: rank targets above folders, include path context in every result, and weight exact/path segment matches higher than loose partial matches.

4. Popup space becomes too crowded with search, tree, recents, and favorites.  
   Mitigation: keep overlays compact, make hierarchy the primary body region, and treat search as an accelerator rather than a separate mode.

5. Import/export destabilizes storage if accepted without validation.  
   Mitigation: require schema validation and deterministic import semantics before writing imported data into persistence.

## Final Recommendation

Proceed with a popup-first Manifest V3 extension built with React, TypeScript, Vite, Zustand, Zod, Tailwind, and Chrome storage APIs.
