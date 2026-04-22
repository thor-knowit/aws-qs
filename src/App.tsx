import { useEffect, useMemo, useState } from 'react'
import type { FolderId, NodeId, TargetId } from '@/shared/types'
import { getFolder, getNodeChildren, getTarget, isFolderId, isTargetId, searchCatalog } from '@/domain/catalog'
import { useAppStore } from '@/popup/store'
import { cn } from '@/shared/utils'
import { openEditorForNode, openOptionsPage } from '@/shared/components'
import './index.css'

/* ── Search ── */

function SearchPanel() {
  const state = useAppStore((store) => store.state)
  const query = state.ui.searchQuery
  const setQuery = useAppStore((store) => store.setSearchQuery)
  const results = useMemo(() => searchCatalog(state, query), [state, query])
  const activateTarget = useAppStore((store) => store.activateTarget)
  const toggleFavorite = useAppStore((store) => store.toggleFavorite)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const targetResults = useMemo(() => results.filter((r) => r.type === 'target'), [results])

  return (
    <div className="px-3 pt-3 pb-1.5">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((current) => Math.min(current + 1, Math.max(targetResults.length - 1, 0)))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => Math.max(current - 1, 0))
            } else if (event.key === 'Enter') {
              const hit = targetResults[activeIndex]
              if (hit) {
                event.preventDefault()
                void activateTarget(hit.id as TargetId)
              }
            } else if (event.key === 'Escape') {
              setQuery('')
            }
          }}
          placeholder="Search roles..."
          className="flex-1 border-b border-zinc-800 bg-transparent px-1 pb-2 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          aria-label="Search catalog"
          autoFocus
        />
        <button
          onClick={openOptionsPage}
          className="mb-1 rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-400"
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.17 3.17l1.41 1.41M11.42 11.42l1.41 1.41M3.17 12.83l1.41-1.41M11.42 4.58l1.41-1.41" />
          </svg>
        </button>
      </div>

      {query ? (
        <div className="mt-1 max-h-52 overflow-auto">
          {results.map((result) => {
            const targetIndex = result.type === 'target' ? targetResults.findIndex((r) => r.id === result.id) : -1
            const isActive = targetIndex !== -1 && targetIndex === activeIndex
            const isFav = result.type === 'target' && state.usage.favoriteTargetIds.includes(result.id as TargetId)
            return (
              <button
                key={result.id}
                onClick={() => result.type === 'target' && activateTarget(result.id as TargetId)}
                onMouseEnter={() => targetIndex !== -1 && setActiveIndex(targetIndex)}
                aria-selected={isActive}
                className={cn(
                  'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                  result.type === 'target' ? 'hover:bg-zinc-800/80' : 'opacity-50',
                  isActive && 'bg-zinc-800',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] text-zinc-200">{result.label}</span>
                    <span className="shrink-0 text-[10px] text-zinc-600">{result.type === 'target' ? result.roleName : 'folder'}</span>
                  </div>
                  <p className="truncate text-[11px] text-zinc-600">{result.path}</p>
                </div>
                {result.type === 'target' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(result.id as TargetId) }}
                    className={cn(
                      'shrink-0 text-[11px] opacity-0 transition group-hover:opacity-100',
                      isFav ? 'text-amber-400 opacity-100' : 'text-zinc-600 hover:text-zinc-400',
                    )}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                )}
              </button>
            )
          })}
          {results.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-zinc-600">No matches</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── Compact target row ── */

function TargetRow({ targetId, showFolderColor }: { targetId: TargetId; showFolderColor?: boolean }) {
  const state = useAppStore((store) => store.state)
  const activateTarget = useAppStore((store) => store.activateTarget)
  const toggleFavorite = useAppStore((store) => store.toggleFavorite)
  const target = getTarget(state, targetId)

  if (!target) return null

  const isFavorite = state.usage.favoriteTargetIds.includes(targetId)
  const folderColor = showFolderColor && target.parentId ? getFolder(state, target.parentId)?.color : undefined

  return (
    <button
      onClick={() => activateTarget(targetId)}
      className="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/80"
    >
      {folderColor ? (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: folderColor }} />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] text-zinc-200">{target.displayName}</span>
          <span className="text-[10px] text-zinc-600">{target.roleName}</span>
        </div>
        <p className="truncate text-[11px] text-zinc-600">{target.accountAlias ?? target.accountId}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          onClick={(e) => { e.stopPropagation(); toggleFavorite(targetId) }}
          className={cn(
            'rounded p-0.5 text-[11px] transition',
            isFavorite ? 'text-amber-400' : 'text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-400',
          )}
        >
          {isFavorite ? '★' : '☆'}
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); openEditorForNode(targetId) }}
          className="rounded p-0.5 text-[11px] text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-zinc-400"
        >
          ✎
        </span>
      </div>
    </button>
  )
}

/* ── Folder tree ── */

function FolderTree({ folderId, depth = 0 }: { folderId: FolderId; depth?: number }) {
  const state = useAppStore((store) => store.state)
  const toggleExpanded = useAppStore((store) => store.toggleFolderExpanded)
  const folder = state.catalog.foldersById[folderId]

  if (!folder) return null

  const children = getNodeChildren(state, folder.id)
  const expanded = state.ui.expandedFolderIds.includes(folder.id)

  return (
    <div>
      <div
        className="group flex items-center"
        style={{ paddingLeft: depth * 14 }}
      >
        <button
          onClick={() => toggleExpanded(folder.id)}
          className="flex flex-1 items-center gap-1.5 rounded px-2 py-1 text-left transition-colors hover:bg-zinc-800/60"
        >
          <span className="w-3 text-center text-[10px] text-zinc-600">{expanded ? '▾' : '▸'}</span>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folder.color ?? '#f59e0b' }} />
          <span className="text-[13px] text-zinc-300">{folder.name}</span>
          <span className="text-[10px] text-zinc-700">{children.length}</span>
        </button>
        <span
          onClick={() => openEditorForNode(folder.id)}
          className="mr-1 cursor-pointer rounded p-0.5 text-[10px] text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-zinc-400"
        >
          ✎
        </span>
      </div>
      {expanded ? (
        <div>
          {children.map((childId) =>
            isFolderId(state, childId) ? (
              <FolderTree key={childId} folderId={childId} depth={depth + 1} />
            ) : isTargetId(state, childId) ? (
              <div key={childId} style={{ paddingLeft: depth * 14 }}>
                <TargetRow targetId={childId} />
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ── Panels ── */

function FavoritesPanel() {
  const favorites = useAppStore((store) => store.state.usage.favoriteTargetIds)
  if (favorites.length === 0) return null

  return (
    <section className="px-1">
      <div className="flex items-center gap-2 px-2 pb-1 pt-2">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Pinned</h2>
        <span className="text-[10px] text-zinc-700">{favorites.length}</span>
      </div>
      {favorites.map((targetId) => (
        <TargetRow key={targetId} targetId={targetId} showFolderColor />
      ))}
    </section>
  )
}

function RecentsPanel() {
  const recents = useAppStore((store) => store.state.usage.recentTargetIds)
  if (recents.length === 0) return null

  return (
    <section className="px-1">
      <div className="flex items-center gap-2 px-2 pb-1 pt-2">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Recent</h2>
        <span className="text-[10px] text-zinc-700">{recents.length}</span>
      </div>
      {recents.map((targetId) => (
        <TargetRow key={targetId} targetId={targetId} showFolderColor />
      ))}
    </section>
  )
}

function BrowsePanel() {
  const state = useAppStore((store) => store.state)
  const rootChildren = state.catalog.rootChildIds

  if (rootChildren.length === 0) return null

  return (
    <section className="px-1">
      <div className="flex items-center gap-2 px-2 pb-1 pt-2">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Catalog</h2>
      </div>
      {rootChildren.map((id: NodeId) =>
        isFolderId(state, id) ? <FolderTree key={id} folderId={id} /> : isTargetId(state, id) ? <TargetRow key={id} targetId={id} /> : null,
      )}
    </section>
  )
}

/* ── Shell ── */

function Shell() {
  const initialize = useAppStore((store) => store.initialize)
  const hydrated = useAppStore((store) => store.hydrated)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (!hydrated) {
    return (
      <div className="flex min-h-[480px] items-center justify-center text-[11px] uppercase tracking-widest text-zinc-600">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-[480px] bg-[#0c0c0e] pb-3">
      <SearchPanel />
      <div className="divide-y divide-zinc-800/60">
        <FavoritesPanel />
        <RecentsPanel />
        <BrowsePanel />
      </div>
    </div>
  )
}

export default Shell
