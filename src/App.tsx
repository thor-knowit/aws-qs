import { useEffect, useMemo, useState } from 'react'
import { APP_NAME } from '@/shared/constants'
import type { FolderId, NodeId, TargetId } from '@/shared/types'
import { getNodeChildren, getTarget, getTargetPathLabel, isFolderId, isTargetId, searchCatalog } from '@/domain/catalog'
import { useAppStore } from '@/popup/store'
import { cn } from '@/shared/utils'
import { ActionButton, Badge, SectionTitle, openEditorForNode, openOptionsPage } from '@/shared/components'
import './index.css'

/* ── Search ── */

function SearchPanel() {
  const state = useAppStore((store) => store.state)
  const query = state.ui.searchQuery
  const setQuery = useAppStore((store) => store.setSearchQuery)
  const results = useMemo(() => searchCatalog(state, query), [state, query])
  const activateTarget = useAppStore((store) => store.activateTarget)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const targetResults = useMemo(() => results.filter((r) => r.type === 'target'), [results])

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[0_20px_45px_-24px_rgba(0,0,0,0.6)] backdrop-blur">
      <SectionTitle title="Quick Search" meta={results.length ? `${results.length} matches` : 'browse + search'} />
      <label className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-200 shadow-inner shadow-black/30">
        <span className="text-base text-amber-300">⌕</span>
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
          placeholder="Search customer, account, alias, role..."
          className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          aria-label="Search catalog"
        />
      </label>
      {query ? (
        <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
          {results.map((result) => {
            const targetIndex = result.type === 'target' ? targetResults.findIndex((r) => r.id === result.id) : -1
            const isActive = targetIndex !== -1 && targetIndex === activeIndex
            return (
              <button
                key={result.id}
                onClick={() => result.type === 'target' && activateTarget(result.id as TargetId)}
                onMouseEnter={() => targetIndex !== -1 && setActiveIndex(targetIndex)}
                aria-selected={isActive}
                className={cn(
                  'w-full rounded-2xl border px-3 py-3 text-left transition',
                  result.type === 'target'
                    ? 'border-white/10 bg-white/[0.04] hover:border-amber-400/40 hover:bg-amber-400/10'
                    : 'border-white/5 bg-white/[0.02] opacity-80',
                  isActive && 'border-amber-400/70 bg-amber-400/15 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{result.label}</p>
                    <p className="mt-1 text-xs text-zinc-400">{result.path}</p>
                  </div>
                  <Badge>{result.type}</Badge>
                </div>
              </button>
            )
          })}
          {results.length === 0 ? (
            <p className="px-1 py-2 text-xs text-zinc-500">No matches. Try a role name, account alias, or folder.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/* ── Target card (compact) ── */

function TargetCard({ targetId }: { targetId: TargetId }) {
  const state = useAppStore((store) => store.state)
  const activateTarget = useAppStore((store) => store.activateTarget)
  const toggleFavorite = useAppStore((store) => store.toggleFavorite)
  const target = getTarget(state, targetId)

  if (!target) return null

  const isFavorite = state.usage.favoriteTargetIds.includes(targetId)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100">{target.displayName}</p>
          <p className="mt-1 text-xs text-zinc-400">{getTargetPathLabel(state, targetId)}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => toggleFavorite(targetId)}
            className={cn(
              'rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em]',
              isFavorite ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-white/10 text-zinc-400',
            )}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button
            onClick={() => openEditorForNode(targetId)}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
            title="Edit in settings"
          >
            ✎
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{target.accountAlias ?? target.accountId}</span>
        <span>{target.roleName}</span>
      </div>
      <button
        onClick={() => activateTarget(targetId)}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-105"
      >
        Switch role
      </button>
    </div>
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
    <div className="space-y-2">
      <div
        className="flex items-center gap-2"
        style={{ marginLeft: depth * 12 }}
      >
        <button
          onClick={() => toggleExpanded(folder.id)}
          className="flex flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
        >
          <span className="text-xs text-amber-300">{expanded ? '▾' : '▸'}</span>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: folder.color ?? '#f59e0b' }} />
          <span className="text-sm font-medium text-zinc-100">{folder.name}</span>
        </button>
        <button
          onClick={() => openEditorForNode(folder.id)}
          className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-zinc-300 transition hover:border-amber-300/30"
          title="Edit in settings"
        >
          ✎
        </button>
      </div>
      {expanded ? (
        <div className="space-y-2">
          {children.map((childId) =>
            isFolderId(state, childId) ? (
              <FolderTree key={childId} folderId={childId} depth={depth + 1} />
            ) : isTargetId(state, childId) ? (
              <div key={childId} style={{ marginLeft: (depth + 1) * 12 }}>
                <TargetCard targetId={childId} />
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
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Favorites" meta={`${favorites.length} pinned`} />
      <div className="space-y-3">
        {favorites.map((targetId) => (
          <TargetCard key={targetId} targetId={targetId} />
        ))}
      </div>
    </section>
  )
}

function RecentsPanel() {
  const recents = useAppStore((store) => store.state.usage.recentTargetIds)
  if (recents.length === 0) return null

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Recent Launches" meta="path aware" />
      <div className="space-y-3">
        {recents.map((targetId) => (
          <TargetCard key={targetId} targetId={targetId} />
        ))}
      </div>
    </section>
  )
}

function BrowsePanel() {
  const state = useAppStore((store) => store.state)

  return (
    <section className="rounded-[32px] border border-white/10 bg-zinc-950/70 p-4 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <SectionTitle title="Browse Catalog" meta="expansion persists" />
      <div className="space-y-3">
        {state.catalog.rootChildIds.map((id: NodeId) =>
          isFolderId(state, id) ? <FolderTree key={id} folderId={id} /> : isTargetId(state, id) ? <TargetCard key={id} targetId={id} /> : null,
        )}
      </div>
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
      <div className="flex min-h-[640px] items-center justify-center text-sm uppercase tracking-[0.28em] text-zinc-500">
        Hydrating catalog…
      </div>
    )
  }

  return (
    <div className="min-h-[640px] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#16151b_0%,_#09090b_48%,_#050506_100%)] px-4 py-5 text-zinc-100">
      <header className="mb-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200/80">AWS Console Switchboard</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-white">{APP_NAME}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
              A local-first control room for deeply grouped AWS accounts and roles, with search, favorites,
              recent launches, and persistent tree expansion.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>Manifest V3</Badge>
            <ActionButton onClick={openOptionsPage}>
              Edit Catalog
            </ActionButton>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <SearchPanel />
        <FavoritesPanel />
        <RecentsPanel />
        <BrowsePanel />
      </div>
    </div>
  )
}

export default Shell
