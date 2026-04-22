import type { FolderId, NodeId, SearchResult, TargetId } from '@/shared/types'
import type { AppStorageState, FolderNode, TargetNode } from '@/shared/types'

export function isFolderId(state: AppStorageState, id: NodeId): id is FolderId {
  return id in state.catalog.foldersById
}

export function isTargetId(state: AppStorageState, id: NodeId): id is TargetId {
  return id in state.catalog.targetsById
}

export function getNodePath(state: AppStorageState, id: NodeId): string[] {
  if (isTargetId(state, id)) {
    const target = state.catalog.targetsById[id]
    return [...getFolderPath(state, target.parentId), target.displayName]
  }

  if (isFolderId(state, id)) {
    const folder = state.catalog.foldersById[id]
    return [...getFolderPath(state, folder.parentId), folder.name]
  }

  return []
}

export function getFolderPath(state: AppStorageState, parentId: FolderId | null): string[] {
  const path: string[] = []
  let currentId = parentId

  while (currentId) {
    const folder = state.catalog.foldersById[currentId]
    if (!folder) break
    path.unshift(folder.name)
    currentId = folder.parentId
  }

  return path
}

export function getNodeChildren(state: AppStorageState, folderId: FolderId | null): NodeId[] {
  return folderId ? (state.catalog.childrenByFolderId[folderId] ?? []) : state.catalog.rootChildIds
}

export function getFolder(state: AppStorageState, folderId: FolderId): FolderNode | null {
  return state.catalog.foldersById[folderId] ?? null
}

export function getTarget(state: AppStorageState, targetId: TargetId): TargetNode | null {
  return state.catalog.targetsById[targetId] ?? null
}

export function getTargetPathLabel(state: AppStorageState, targetId: TargetId): string {
  return getNodePath(state, targetId).join(' / ')
}

function scoreText(haystack: string, query: string): number {
  const normalizedHaystack = haystack.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) return 0
  if (normalizedHaystack === normalizedQuery) return 120
  if (normalizedHaystack.startsWith(normalizedQuery)) return 80
  if (normalizedHaystack.includes(normalizedQuery)) return 50

  return 0
}

export function searchCatalog(state: AppStorageState, query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  const results: SearchResult[] = []

  for (const folder of Object.values(state.catalog.foldersById)) {
    const path = getNodePath(state, folder.id).join(' / ')
    const score = scoreText(folder.name, normalizedQuery) + scoreText(path, normalizedQuery) - 20

    if (score > 0) {
      results.push({
        id: folder.id,
        type: folder.type,
        label: folder.name,
        path,
        score,
      })
    }
  }

  for (const target of Object.values(state.catalog.targetsById)) {
    const path = getTargetPathLabel(state, target.id)
    const score =
      scoreText(target.displayName, normalizedQuery) +
      scoreText(target.roleName, normalizedQuery) +
      scoreText(target.accountId, normalizedQuery) +
      scoreText(target.accountAlias ?? '', normalizedQuery) +
      scoreText(path, normalizedQuery) +
      (state.usage.favoriteTargetIds.includes(target.id) ? 10 : 0) +
      (state.usage.recentTargetIds.includes(target.id) ? 6 : 0)

    if (score > 0) {
      results.push({
        id: target.id,
        type: target.type,
        label: target.displayName,
        path,
        score,
        accountId: target.accountId,
        accountAlias: target.accountAlias,
        roleName: target.roleName,
      })
    }
  }

  return results.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
}

export function buildAwsSwitchUrl(target: TargetNode): string {
  const destination = target.destinationPath ?? '/console/home'
  const destinationUrl = new URL(`https://console.aws.amazon.com${destination}`)
  const switchUrl = new URL('https://signin.aws.amazon.com/switchrole')
  switchUrl.searchParams.set('account', target.accountId)
  switchUrl.searchParams.set('roleName', target.roleName)
  switchUrl.searchParams.set('displayName', target.displayName)
  switchUrl.searchParams.set('redirect_uri', destinationUrl.toString())

  return switchUrl.toString()
}
