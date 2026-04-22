import { describe, expect, it } from 'vitest'
import { defaultAppState } from '@/domain/schema'
import {
  createFolder,
  createTarget,
  deleteFolder,
  deleteTarget,
  exportCatalogState,
  importCatalogState,
  moveNode,
  toggleFavorite,
  toggleFolderExpanded,
  updateFolder,
} from '@/domain/mutations'

describe('catalog mutations', () => {
  it('creates a folder under a parent and auto-expands it', () => {
    const next = createFolder(defaultAppState, {
      name: 'New Team',
      parentId: 'folder-acme',
    })

    const created = Object.values(next.catalog.foldersById).find((f) => f.name === 'New Team')
    expect(created).toBeTruthy()
    expect(next.catalog.childrenByFolderId['folder-acme']).toContain(created!.id)
    expect(next.ui.expandedFolderIds).toContain('folder-acme')
  })

  it('validates target account id format', () => {
    expect(() =>
      createTarget(defaultAppState, {
        displayName: 'Bad',
        parentId: null,
        accountId: 'not-an-id',
        roleName: 'Role',
      }),
    ).toThrow()
  })

  it('creates a target and adds it to the parent folder', () => {
    const next = createTarget(defaultAppState, {
      displayName: 'Auditor',
      parentId: 'folder-beta-eu',
      accountId: '999888777666',
      roleName: 'AuditRole',
    })

    const created = Object.values(next.catalog.targetsById).find((t) => t.displayName === 'Auditor')
    expect(created).toBeTruthy()
    expect(next.catalog.childrenByFolderId['folder-beta-eu']).toContain(created!.id)
  })

  it('moves a target between folders', () => {
    const next = moveNode(defaultAppState, {
      nodeId: 'target-acme-admin',
      nextParentId: 'folder-beta-eu',
    })

    expect(next.catalog.targetsById['target-acme-admin'].parentId).toBe('folder-beta-eu')
    expect(next.catalog.childrenByFolderId['folder-acme-prod']).not.toContain('target-acme-admin')
    expect(next.catalog.childrenByFolderId['folder-beta-eu']).toContain('target-acme-admin')
  })

  it('prevents a folder from becoming its own parent', () => {
    expect(() =>
      moveNode(defaultAppState, { nodeId: 'folder-acme', nextParentId: 'folder-acme' }),
    ).toThrow()
  })

  it('deleting a folder removes descendants and cleans expanded state', () => {
    const expanded = toggleFolderExpanded(defaultAppState, 'folder-acme-stage')
    const next = deleteFolder(expanded, 'folder-acme')

    expect(next.catalog.foldersById['folder-acme']).toBeUndefined()
    expect(next.catalog.foldersById['folder-acme-prod']).toBeUndefined()
    expect(next.catalog.targetsById['target-acme-admin']).toBeUndefined()
    expect(next.ui.expandedFolderIds).not.toContain('folder-acme')
    expect(next.ui.expandedFolderIds).not.toContain('folder-acme-stage')
    expect(next.catalog.rootChildIds).not.toContain('folder-acme')
  })

  it('deleting a target removes it from favorites and recents', () => {
    const next = deleteTarget(defaultAppState, 'target-acme-admin')

    expect(next.catalog.targetsById['target-acme-admin']).toBeUndefined()
    expect(next.usage.favoriteTargetIds).not.toContain('target-acme-admin')
    expect(next.usage.recentTargetIds).not.toContain('target-acme-admin')
  })

  it('toggleFavorite adds and removes targets', () => {
    const withFav = toggleFavorite(defaultAppState, 'target-acme-readonly')
    expect(withFav.usage.favoriteTargetIds).toContain('target-acme-readonly')

    const withoutFav = toggleFavorite(withFav, 'target-acme-readonly')
    expect(withoutFav.usage.favoriteTargetIds).not.toContain('target-acme-readonly')
  })

  it('renaming a folder preserves its expanded state', () => {
    const expanded = toggleFolderExpanded(defaultAppState, 'folder-acme-stage')
    const renamed = updateFolder(expanded, 'folder-acme-stage', {
      name: 'QA',
      parentId: 'folder-acme',
    })

    expect(renamed.ui.expandedFolderIds).toContain('folder-acme-stage')
    expect(renamed.catalog.foldersById['folder-acme-stage'].name).toBe('QA')
  })

  it('export then import round-trips the catalog', () => {
    const payload = exportCatalogState(defaultAppState)
    const restored = importCatalogState(defaultAppState, payload)

    expect(restored.catalog.rootChildIds).toEqual(defaultAppState.catalog.rootChildIds)
    expect(Object.keys(restored.catalog.targetsById).sort()).toEqual(
      Object.keys(defaultAppState.catalog.targetsById).sort(),
    )
    expect(restored.ui.expandedFolderIds).toEqual([])
  })

  it('rejects malformed import JSON', () => {
    expect(() => importCatalogState(defaultAppState, 'not json')).toThrow()
  })

  it('rejects semantically invalid import payloads', () => {
    const badPayload = JSON.stringify({
      schemaVersion: 1,
      catalog: { foldersById: {}, targetsById: { x: { id: 'x' } }, childrenByFolderId: {}, rootChildIds: [] },
      usage: defaultAppState.usage,
    })

    expect(() => importCatalogState(defaultAppState, badPayload)).toThrow()
  })
})
