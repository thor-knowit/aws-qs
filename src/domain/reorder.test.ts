import { describe, expect, it } from 'vitest'
import { defaultAppState } from '@/domain/schema'
import { reorderSibling } from '@/domain/mutations'

describe('reorderSibling', () => {
  it('moves a root folder down among siblings', () => {
    const next = reorderSibling(defaultAppState, 'folder-acme', 'down')
    expect(next.catalog.rootChildIds).toEqual(['folder-beta', 'folder-acme'])
  })

  it('is a no-op when already at the top', () => {
    const next = reorderSibling(defaultAppState, 'folder-acme', 'up')
    expect(next.catalog.rootChildIds).toEqual(defaultAppState.catalog.rootChildIds)
  })

  it('reorders children inside a folder', () => {
    const next = reorderSibling(defaultAppState, 'target-acme-admin', 'down')
    expect(next.catalog.childrenByFolderId['folder-acme-prod']).toEqual([
      'target-acme-readonly',
      'target-acme-admin',
    ])
  })

  it('returns the same state for unknown nodes', () => {
    const next = reorderSibling(defaultAppState, 'unknown-id', 'up')
    expect(next).toBe(defaultAppState)
  })
})
