import { create } from 'zustand'
import { buildAwsSwitchUrl, getTarget, searchCatalog } from '@/domain/catalog'
import { defaultAppState } from '@/domain/schema'
import {
  createFolder,
  createTarget,
  deleteFolder,
  deleteTarget,
  exportCatalogState,
  importCatalogState,
  moveNode,
  reorderSibling,
  selectTarget,
  setSearchQuery,
  toggleFavorite,
  toggleFolderExpanded,
  updateFolder,
  updateTarget,
} from '@/domain/mutations'
import { loadAppState, saveAppState } from '@/storage/chromeStorage'
import type {
  AppStorageState,
  FolderDraft,
  FolderId,
  MoveNodeDraft,
  NodeId,
  SearchResult,
  TargetDraft,
  TargetId,
} from '@/shared/types'

interface AppStore {
  hydrated: boolean
  state: AppStorageState
  initialize: () => Promise<void>
  setSearchQuery: (query: string) => void
  toggleFolderExpanded: (folderId: FolderId) => void
  toggleFavorite: (targetId: TargetId) => void
  activateTarget: (targetId: TargetId) => Promise<void>
  createFolder: (draft: FolderDraft) => void
  updateFolder: (folderId: FolderId, draft: FolderDraft) => void
  createTarget: (draft: TargetDraft) => void
  updateTarget: (targetId: TargetId, draft: TargetDraft) => void
  deleteFolder: (folderId: FolderId) => void
  deleteTarget: (targetId: TargetId) => void
  moveNode: (draft: MoveNodeDraft) => void
  reorderSibling: (nodeId: NodeId, direction: 'up' | 'down') => void
  exportState: () => string
  importState: (raw: string) => void
  getSearchResults: () => SearchResult[]
}

async function persist(state: AppStorageState) {
  await saveAppState(state)
}

function commit(set: (partial: Partial<AppStore>) => void, next: AppStorageState) {
  set({ state: next })
  void persist(next)
}

export const useAppStore = create<AppStore>((set, get) => ({
  hydrated: false,
  state: defaultAppState,
  async initialize() {
    const state = await loadAppState()
    set({ hydrated: true, state })
  },
  setSearchQuery(query) {
    const next = setSearchQuery(get().state, query)
    commit(set, next)
  },
  toggleFolderExpanded(folderId) {
    const next = toggleFolderExpanded(get().state, folderId)
    commit(set, next)
  },
  toggleFavorite(targetId) {
    const next = toggleFavorite(get().state, targetId)
    commit(set, next)
  },
  createFolder(draft) {
    const next = createFolder(get().state, draft)
    commit(set, next)
  },
  updateFolder(folderId, draft) {
    const next = updateFolder(get().state, folderId, draft)
    commit(set, next)
  },
  createTarget(draft) {
    const next = createTarget(get().state, draft)
    commit(set, next)
  },
  updateTarget(targetId, draft) {
    const next = updateTarget(get().state, targetId, draft)
    commit(set, next)
  },
  deleteFolder(folderId) {
    const next = deleteFolder(get().state, folderId)
    commit(set, next)
  },
  deleteTarget(targetId) {
    const next = deleteTarget(get().state, targetId)
    commit(set, next)
  },
  moveNode(draft) {
    const next = moveNode(get().state, draft)
    commit(set, next)
  },
  reorderSibling(nodeId, direction) {
    const next = reorderSibling(get().state, nodeId, direction)
    commit(set, next)
  },
  exportState() {
    return exportCatalogState(get().state)
  },
  importState(raw) {
    const next = importCatalogState(get().state, raw)
    commit(set, next)
  },
  async activateTarget(targetId) {
    const next = selectTarget(get().state, targetId)
    set({ state: next })
    await persist(next)

    const target = getTarget(next, targetId)
    if (!target) return

    const url = buildAwsSwitchUrl(target)
    if (globalThis.chrome?.tabs?.create) {
      const [activeTab] = await globalThis.chrome.tabs.query({ active: true, currentWindow: true })
      const index = activeTab?.index != null ? activeTab.index + 1 : undefined
      await globalThis.chrome.tabs.create({ url, index })
      return
    }

    globalThis.open(url, '_blank', 'noopener,noreferrer')
  },
  getSearchResults() {
    return searchCatalog(get().state, get().state.ui.searchQuery)
  },
}))
