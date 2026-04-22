import type {
  AppStorageState,
  FolderDraft,
  FolderId,
  MoveNodeDraft,
  NodeId,
  TargetDraft,
  TargetId,
} from '@/shared/types'
import { createId, unique } from '@/shared/utils'
import { appStorageSchema, folderDraftSchema, targetDraftSchema } from '@/domain/schema'

function removeNodeFromList(ids: NodeId[], nodeId: NodeId): NodeId[] {
  return ids.filter((id) => id !== nodeId)
}

function insertIntoList(ids: NodeId[], nodeId: NodeId, index?: number): NodeId[] {
  const next = removeNodeFromList(ids, nodeId)

  if (typeof index !== 'number' || index < 0 || index > next.length) {
    return [...next, nodeId]
  }

  return [...next.slice(0, index), nodeId, ...next.slice(index)]
}

function removeExpandedDescendants(state: AppStorageState, folderId: FolderId): string[] {
  const descendants = new Set<string>([folderId])
  const queue = [folderId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue

    for (const childId of state.catalog.childrenByFolderId[current] ?? []) {
      if (childId in state.catalog.foldersById) {
        descendants.add(childId)
        queue.push(childId)
      }
    }
  }

  return state.ui.expandedFolderIds.filter((id) => !descendants.has(id))
}

function assertParentExists(state: AppStorageState, parentId: FolderId | null) {
  if (parentId === null) return
  if (!state.catalog.foldersById[parentId]) {
    throw new Error('Parent folder does not exist')
  }
}

function getParentList(state: AppStorageState, parentId: FolderId | null): NodeId[] {
  return parentId === null ? state.catalog.rootChildIds : (state.catalog.childrenByFolderId[parentId] ?? [])
}

function setParentList(state: AppStorageState, parentId: FolderId | null, ids: NodeId[]): AppStorageState {
  if (parentId === null) {
    return {
      ...state,
      catalog: {
        ...state.catalog,
        rootChildIds: ids,
      },
    }
  }

  return {
    ...state,
    catalog: {
      ...state.catalog,
      childrenByFolderId: {
        ...state.catalog.childrenByFolderId,
        [parentId]: ids,
      },
    },
  }
}

export function toggleFolderExpanded(state: AppStorageState, folderId: FolderId): AppStorageState {
  const expanded = state.ui.expandedFolderIds.includes(folderId)

  return {
    ...state,
    ui: {
      ...state.ui,
      expandedFolderIds: expanded
        ? state.ui.expandedFolderIds.filter((id) => id !== folderId)
        : unique([...state.ui.expandedFolderIds, folderId]),
    },
  }
}

export function setSearchQuery(state: AppStorageState, query: string): AppStorageState {
  return {
    ...state,
    ui: {
      ...state.ui,
      searchQuery: query,
    },
  }
}

export function selectTarget(state: AppStorageState, targetId: TargetId): AppStorageState {
  const timestamp = new Date().toISOString()

  return {
    ...state,
    usage: {
      ...state.usage,
      recentTargetIds: unique([targetId, ...state.usage.recentTargetIds]).slice(0, 8),
      launchCountByTargetId: {
        ...state.usage.launchCountByTargetId,
        [targetId]: (state.usage.launchCountByTargetId[targetId] ?? 0) + 1,
      },
      lastLaunchedAtByTargetId: {
        ...state.usage.lastLaunchedAtByTargetId,
        [targetId]: timestamp,
      },
    },
    ui: {
      ...state.ui,
      selectedTargetId: targetId,
    },
  }
}

export function toggleFavorite(state: AppStorageState, targetId: TargetId): AppStorageState {
  const exists = state.usage.favoriteTargetIds.includes(targetId)

  return {
    ...state,
    usage: {
      ...state.usage,
      favoriteTargetIds: exists
        ? state.usage.favoriteTargetIds.filter((id) => id !== targetId)
        : unique([...state.usage.favoriteTargetIds, targetId]),
    },
  }
}

export function createFolder(state: AppStorageState, draft: FolderDraft): AppStorageState {
  const parsed = folderDraftSchema.parse(draft)
  assertParentExists(state, parsed.parentId)

  const folderId = createId('folder')
  const nextState = {
    ...state,
    catalog: {
      ...state.catalog,
      foldersById: {
        ...state.catalog.foldersById,
        [folderId]: {
          id: folderId,
          type: 'folder' as const,
          name: parsed.name,
          parentId: parsed.parentId,
          color: parsed.color,
        },
      },
      childrenByFolderId: {
        ...state.catalog.childrenByFolderId,
        [folderId]: [],
      },
    },
  }

  const parentList = getParentList(nextState, parsed.parentId)
  const withChild = insertIntoList(parentList, folderId)
  const expandedFolderIds = parsed.parentId
    ? unique([...nextState.ui.expandedFolderIds, parsed.parentId])
    : nextState.ui.expandedFolderIds

  return {
    ...setParentList(nextState, parsed.parentId, withChild),
    ui: {
      ...nextState.ui,
      expandedFolderIds,
    },
  }
}

export function updateFolder(state: AppStorageState, folderId: FolderId, draft: FolderDraft): AppStorageState {
  const current = state.catalog.foldersById[folderId]
  if (!current) return state

  const parsed = folderDraftSchema.parse(draft)
  assertParentExists(state, parsed.parentId)

  if (parsed.parentId === folderId) {
    throw new Error('Folder cannot be its own parent')
  }

  let nextState: AppStorageState = {
    ...state,
    catalog: {
      ...state.catalog,
      foldersById: {
        ...state.catalog.foldersById,
        [folderId]: {
          ...current,
          name: parsed.name,
          parentId: parsed.parentId,
          color: parsed.color,
        },
      },
    },
  }

  if (current.parentId !== parsed.parentId) {
    const currentList = getParentList(nextState, current.parentId)
    nextState = setParentList(nextState, current.parentId, removeNodeFromList(currentList, folderId))

    const nextList = getParentList(nextState, parsed.parentId)
    nextState = setParentList(nextState, parsed.parentId, insertIntoList(nextList, folderId))
  }

  return nextState
}

export function createTarget(state: AppStorageState, draft: TargetDraft): AppStorageState {
  const parsed = targetDraftSchema.parse(draft)
  assertParentExists(state, parsed.parentId)

  const targetId = createId('target')
  const nextState = {
    ...state,
    catalog: {
      ...state.catalog,
      targetsById: {
        ...state.catalog.targetsById,
        [targetId]: {
          id: targetId,
          type: 'target' as const,
          parentId: parsed.parentId,
          displayName: parsed.displayName,
          accountId: parsed.accountId,
          accountAlias: parsed.accountAlias,
          roleName: parsed.roleName,
          destinationPath: parsed.destinationPath,
        },
      },
    },
  }

  const parentList = getParentList(nextState, parsed.parentId)
  const withChild = insertIntoList(parentList, targetId)
  const expandedFolderIds = parsed.parentId
    ? unique([...nextState.ui.expandedFolderIds, parsed.parentId])
    : nextState.ui.expandedFolderIds

  return {
    ...setParentList(nextState, parsed.parentId, withChild),
    ui: {
      ...nextState.ui,
      expandedFolderIds,
    },
  }
}

export function updateTarget(state: AppStorageState, targetId: TargetId, draft: TargetDraft): AppStorageState {
  const current = state.catalog.targetsById[targetId]
  if (!current) return state

  const parsed = targetDraftSchema.parse(draft)
  assertParentExists(state, parsed.parentId)

  let nextState: AppStorageState = {
    ...state,
    catalog: {
      ...state.catalog,
      targetsById: {
        ...state.catalog.targetsById,
        [targetId]: {
          ...current,
          parentId: parsed.parentId,
          displayName: parsed.displayName,
          accountId: parsed.accountId,
          accountAlias: parsed.accountAlias,
          roleName: parsed.roleName,
          destinationPath: parsed.destinationPath,
        },
      },
    },
  }

  if (current.parentId !== parsed.parentId) {
    const currentList = getParentList(nextState, current.parentId)
    nextState = setParentList(nextState, current.parentId, removeNodeFromList(currentList, targetId))

    const nextList = getParentList(nextState, parsed.parentId)
    nextState = setParentList(nextState, parsed.parentId, insertIntoList(nextList, targetId))
  }

  return nextState
}

export function reorderSibling(
  state: AppStorageState,
  nodeId: NodeId,
  direction: 'up' | 'down',
): AppStorageState {
  const parentId =
    state.catalog.foldersById[nodeId]?.parentId ??
    state.catalog.targetsById[nodeId]?.parentId ??
    null

  const list = getParentList(state, parentId)
  const index = list.indexOf(nodeId)
  if (index === -1) return state

  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= list.length) return state

  const next = [...list]
  ;[next[index], next[swapWith]] = [next[swapWith], next[index]]

  return setParentList(state, parentId, next)
}

export function moveNode(state: AppStorageState, draft: MoveNodeDraft): AppStorageState {
  assertParentExists(state, draft.nextParentId)

  if (draft.nodeId in state.catalog.foldersById) {
    const folder = state.catalog.foldersById[draft.nodeId]
    if (draft.nextParentId === folder.id) {
      throw new Error('Folder cannot be its own parent')
    }

    let nextState = setParentList(
      state,
      folder.parentId,
      removeNodeFromList(getParentList(state, folder.parentId), folder.id),
    )

    nextState = setParentList(
      nextState,
      draft.nextParentId,
      insertIntoList(getParentList(nextState, draft.nextParentId), folder.id, draft.index),
    )

    return {
      ...nextState,
      catalog: {
        ...nextState.catalog,
        foldersById: {
          ...nextState.catalog.foldersById,
          [folder.id]: {
            ...folder,
            parentId: draft.nextParentId,
          },
        },
      },
    }
  }

  if (draft.nodeId in state.catalog.targetsById) {
    const target = state.catalog.targetsById[draft.nodeId]
    let nextState = setParentList(
      state,
      target.parentId,
      removeNodeFromList(getParentList(state, target.parentId), target.id),
    )

    nextState = setParentList(
      nextState,
      draft.nextParentId,
      insertIntoList(getParentList(nextState, draft.nextParentId), target.id, draft.index),
    )

    return {
      ...nextState,
      catalog: {
        ...nextState.catalog,
        targetsById: {
          ...nextState.catalog.targetsById,
          [target.id]: {
            ...target,
            parentId: draft.nextParentId,
          },
        },
      },
    }
  }

  return state
}

export function deleteFolder(state: AppStorageState, folderId: FolderId): AppStorageState {
  const folder = state.catalog.foldersById[folderId]
  if (!folder) return state

  const childIds = state.catalog.childrenByFolderId[folderId] ?? []
  let nextState = { ...state }

  for (const childId of childIds) {
    nextState = childId in nextState.catalog.foldersById
      ? deleteFolder(nextState, childId as FolderId)
      : deleteTarget(nextState, childId as TargetId)
  }

  const nextFolders = { ...nextState.catalog.foldersById }
  const nextChildren = { ...nextState.catalog.childrenByFolderId }
  delete nextFolders[folderId]
  delete nextChildren[folderId]

  const parentId = folder.parentId
  const rootChildIds = parentId === null
    ? removeNodeFromList(nextState.catalog.rootChildIds, folderId)
    : nextState.catalog.rootChildIds

  if (parentId !== null) {
    nextChildren[parentId] = removeNodeFromList(nextChildren[parentId] ?? [], folderId)
  }

  return {
    ...nextState,
    catalog: {
      ...nextState.catalog,
      foldersById: nextFolders,
      childrenByFolderId: nextChildren,
      rootChildIds,
    },
    ui: {
      ...nextState.ui,
      expandedFolderIds: removeExpandedDescendants(nextState, folderId),
    },
  }
}

export function deleteTarget(state: AppStorageState, targetId: TargetId): AppStorageState {
  const target = state.catalog.targetsById[targetId]
  if (!target) return state

  const nextTargets = { ...state.catalog.targetsById }
  delete nextTargets[targetId]

  const nextChildren = { ...state.catalog.childrenByFolderId }
  if (target.parentId !== null) {
    nextChildren[target.parentId] = removeNodeFromList(nextChildren[target.parentId] ?? [], targetId)
  }

  return {
    ...state,
    catalog: {
      ...state.catalog,
      targetsById: nextTargets,
      childrenByFolderId: nextChildren,
      rootChildIds:
        target.parentId === null ? removeNodeFromList(state.catalog.rootChildIds, targetId) : state.catalog.rootChildIds,
    },
    usage: {
      favoriteTargetIds: state.usage.favoriteTargetIds.filter((id) => id !== targetId),
      recentTargetIds: state.usage.recentTargetIds.filter((id) => id !== targetId),
      launchCountByTargetId: Object.fromEntries(
        Object.entries(state.usage.launchCountByTargetId).filter(([id]) => id !== targetId),
      ),
      lastLaunchedAtByTargetId: Object.fromEntries(
        Object.entries(state.usage.lastLaunchedAtByTargetId).filter(([id]) => id !== targetId),
      ),
    },
    ui: {
      ...state.ui,
      selectedTargetId: state.ui.selectedTargetId === targetId ? null : state.ui.selectedTargetId,
    },
  }
}

export function exportCatalogState(state: AppStorageState): string {
  return JSON.stringify(
    {
      schemaVersion: state.schemaVersion,
      catalog: state.catalog,
      usage: state.usage,
    },
    null,
    2,
  )
}

export function importCatalogState(state: AppStorageState, raw: string): AppStorageState {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Import payload is not valid JSON')
  }

  const candidate = {
    schemaVersion:
      (parsed as Partial<AppStorageState>)?.schemaVersion ?? state.schemaVersion,
    catalog: (parsed as Partial<AppStorageState>)?.catalog ?? state.catalog,
    usage: (parsed as Partial<AppStorageState>)?.usage ?? state.usage,
    ui: {
      expandedFolderIds: [],
      selectedTargetId: null,
      searchQuery: '',
    },
  }

  const validated = appStorageSchema.parse(candidate)

  return {
    ...state,
    schemaVersion: validated.schemaVersion,
    catalog: validated.catalog,
    usage: validated.usage,
    ui: {
      ...state.ui,
      expandedFolderIds: [],
      selectedTargetId: null,
      searchQuery: '',
    },
  }
}
