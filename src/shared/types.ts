export type NodeId = string
export type FolderId = NodeId
export type TargetId = NodeId

export type NodeType = 'folder' | 'target'

export interface FolderNode {
  id: FolderId
  type: 'folder'
  name: string
  parentId: FolderId | null
  color?: string
}

export interface TargetNode {
  id: TargetId
  type: 'target'
  parentId: FolderId | null
  displayName: string
  accountId: string
  accountAlias?: string
  roleName: string
  destinationPath?: string
}

export interface CatalogState {
  foldersById: Record<FolderId, FolderNode>
  targetsById: Record<TargetId, TargetNode>
  childrenByFolderId: Record<string, NodeId[]>
  rootChildIds: NodeId[]
}

export interface UsageState {
  favoriteTargetIds: TargetId[]
  recentTargetIds: TargetId[]
  launchCountByTargetId: Record<TargetId, number>
  lastLaunchedAtByTargetId: Record<TargetId, string>
}

export interface UiState {
  expandedFolderIds: FolderId[]
  searchQuery: string
  selectedTargetId: TargetId | null
}

export interface AppStorageState {
  schemaVersion: number
  catalog: CatalogState
  usage: UsageState
  ui: UiState
}

export interface SearchResult {
  id: NodeId
  type: NodeType
  label: string
  path: string
  score: number
  accountId?: string
  accountAlias?: string
  roleName?: string
}

export interface FolderDraft {
  name: string
  parentId: FolderId | null
  color?: string
}

export interface TargetDraft {
  displayName: string
  parentId: FolderId | null
  accountId: string
  accountAlias?: string
  roleName: string
  destinationPath?: string
}

export interface MoveNodeDraft {
  nodeId: NodeId
  nextParentId: FolderId | null
  index?: number
}
