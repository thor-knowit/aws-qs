# Separate Edit Screen

## Goal
Move editing UI (FolderEditor, TargetEditor, ImportExportPanel) to a full-screen options page.
Keep popup lean for quick navigation (search, browse, favorites, recents).

## Tasks
- [x] Create `src/options/Options.tsx` — full-screen editor with sidebar tree + editor panels
- [x] Wire up hash-based deep linking (#edit=nodeId) in Options
- [x] Update `vite.config.ts` — add `options.html` as build entry point
- [x] Update `public/manifest.json` — add `options_page: "options.html"`
- [x] Refactor `src/App.tsx` — remove editors, use shared components, add "Edit catalog" button
- [x] Update tests in `src/App.test.tsx` — remove import/export tests, add "Edit Catalog" test
- [x] Verify build succeeds with `npm run build`
- [x] Verify all 23 tests pass

## Summary of changes

### New files
- `src/options/Options.tsx` — Full-screen options page with sidebar tree navigation, folder/target editors, new-folder/new-target creation, and import/export panel
- `src/options/main.tsx` — Options page React bootstrap
- `src/options/options.css` — Options page styles (full viewport)
- `options.html` — Options page HTML entry point
- `src/shared/components.tsx` — Shared UI components (Badge, SectionTitle, TextField, SelectField, ActionButton) + openOptionsPage/openEditorForNode helpers

### Modified files
- `src/App.tsx` — Slimmed down popup: removed FolderEditor, TargetEditor, ImportExportPanel; added "Edit Catalog" button; added per-node edit buttons (✎) that deep-link to options page; uses shared components
- `vite.config.ts` — Added `options.html` as build entry
- `public/manifest.json` — Added `options_page: "options.html"`
- `src/App.test.tsx` — Updated tests to match new popup shape
