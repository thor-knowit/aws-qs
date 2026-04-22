import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { APP_NAME } from '@/shared/constants'
import type { FolderDraft, FolderId, NodeId, TargetDraft, TargetId } from '@/shared/types'
import { getNodeChildren, getTarget, getTargetPathLabel, isFolderId, isTargetId, searchCatalog } from '@/domain/catalog'
import { useAppStore } from '@/popup/store'
import { cn } from '@/shared/utils'
import './index.css'

const EMPTY_FOLDER_DRAFT: FolderDraft = {
  name: '',
  parentId: null,
  color: '#f59e0b',
}

const EMPTY_TARGET_DRAFT: TargetDraft = {
  displayName: '',
  parentId: null,
  accountId: '',
  accountAlias: '',
  roleName: '',
  destinationPath: '/console/home',
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-300">{children}</span>
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">{title}</h2>
      {meta ? <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{meta}</span> : null}
    </div>
  )
}

function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-300/40',
        props.className,
      )}
    />
  )
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300/40',
        props.className,
      )}
    />
  )
}

function ActionButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-200 transition hover:border-amber-300/40 hover:bg-amber-300/10',
        className,
      )}
    >
      {children}
    </button>
  )
}

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

function TargetCard({ targetId }: { targetId: TargetId }) {
  const state = useAppStore((store) => store.state)
  const activateTarget = useAppStore((store) => store.activateTarget)
  const toggleFavorite = useAppStore((store) => store.toggleFavorite)
  const deleteTarget = useAppStore((store) => store.deleteTarget)
  const moveNode = useAppStore((store) => store.moveNode)
  const reorderSibling = useAppStore((store) => store.reorderSibling)
  const target = getTarget(state, targetId)
  const [nextParentId, setNextParentId] = useState<FolderId | ''>('')

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((left, right) => left.name.localeCompare(right.name)),
    [state.catalog.foldersById],
  )

  useEffect(() => {
    if (!target) return
    setNextParentId(target.parentId ?? '')
  }, [target])

  if (!target) return null

  const isFavorite = state.usage.favoriteTargetIds.includes(targetId)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{target.displayName}</p>
          <p className="mt-1 text-xs text-zinc-400">{getTargetPathLabel(state, targetId)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleFavorite(targetId)}
            className={cn(
              'rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em]',
              isFavorite ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-white/10 text-zinc-400',
            )}
          >
            Fav
          </button>
          <button
            onClick={() => deleteTarget(targetId)}
            className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-100"
          >
            Del
          </button>
          <button
            onClick={() => reorderSibling(targetId, 'up')}
            aria-label={`Move ${target.displayName} up`}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
          >
            ↑
          </button>
          <button
            onClick={() => reorderSibling(targetId, 'down')}
            aria-label={`Move ${target.displayName} down`}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
          >
            ↓
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{target.accountAlias ?? target.accountId}</span>
        <span>{target.roleName}</span>
      </div>
      <div className="mt-3 grid gap-2">
        <button
          onClick={() => activateTarget(targetId)}
          className="rounded-xl bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-105"
        >
          Switch role
        </button>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <SelectField
            aria-label={`Move ${target.displayName}`}
            value={nextParentId}
            onChange={(event) => setNextParentId(event.target.value as FolderId | '')}
          >
            <option value="">Root</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </SelectField>
          <ActionButton onClick={() => moveNode({ nodeId: targetId, nextParentId: nextParentId || null })}>Move</ActionButton>
        </div>
      </div>
    </div>
  )
}

function FolderTree({ folderId, depth = 0 }: { folderId: FolderId; depth?: number }) {
  const state = useAppStore((store) => store.state)
  const toggleExpanded = useAppStore((store) => store.toggleFolderExpanded)
  const deleteFolder = useAppStore((store) => store.deleteFolder)
  const moveNode = useAppStore((store) => store.moveNode)
  const reorderSibling = useAppStore((store) => store.reorderSibling)
  const folder = state.catalog.foldersById[folderId]
  const [nextParentId, setNextParentId] = useState<FolderId | ''>('')

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById)
      .filter((candidate) => candidate.id !== folderId)
      .sort((left, right) => left.name.localeCompare(right.name)),
    [folderId, state.catalog.foldersById],
  )

  useEffect(() => {
    if (!folder) return
    setNextParentId(folder.parentId ?? '')
  }, [folder])

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
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <SelectField
            aria-label={`Move ${folder.name}`}
            value={nextParentId}
            onChange={(event) => setNextParentId(event.target.value as FolderId | '')}
            className="min-w-32"
          >
            <option value="">Root</option>
            {folderOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
            ))}
          </SelectField>
          <ActionButton onClick={() => moveNode({ nodeId: folder.id, nextParentId: nextParentId || null })}>Move</ActionButton>
        </div>
        <button
          onClick={() => deleteFolder(folder.id)}
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-rose-100"
        >
          Delete
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => reorderSibling(folder.id, 'up')}
            aria-label={`Move ${folder.name} up`}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
          >
            ↑
          </button>
          <button
            onClick={() => reorderSibling(folder.id, 'down')}
            aria-label={`Move ${folder.name} down`}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
          >
            ↓
          </button>
        </div>
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

function FavoritesPanel() {
  const favorites = useAppStore((store) => store.state.usage.favoriteTargetIds)

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Favorites" meta={favorites.length ? `${favorites.length} pinned` : 'none yet'} />
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

function FolderEditor() {
  const state = useAppStore((store) => store.state)
  const createFolder = useAppStore((store) => store.createFolder)
  const updateFolder = useAppStore((store) => store.updateFolder)
  const [selectedFolderId, setSelectedFolderId] = useState<FolderId | 'new'>('new')
  const [draft, setDraft] = useState<FolderDraft>(EMPTY_FOLDER_DRAFT)

  useEffect(() => {
    if (selectedFolderId === 'new') {
      setDraft(EMPTY_FOLDER_DRAFT)
      return
    }

    const folder = state.catalog.foldersById[selectedFolderId]
    if (!folder) return

    setDraft({
      name: folder.name,
      parentId: folder.parentId,
      color: folder.color,
    })
  }, [selectedFolderId, state.catalog.foldersById])

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((left, right) => left.name.localeCompare(right.name)),
    [state.catalog.foldersById],
  )

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Folders" meta="create + edit" />
      <div className="space-y-3">
        <SelectField
          aria-label="Folder editor selector"
          value={selectedFolderId}
          onChange={(event) => setSelectedFolderId(event.target.value as FolderId | 'new')}
        >
          <option value="new">Create new folder</option>
          {folderOptions.map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.name}</option>
          ))}
        </SelectField>
        <TextField
          aria-label="Folder name"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="Folder name"
        />
        <TextField
          aria-label="Folder color"
          value={draft.color ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
          placeholder="#f59e0b"
        />
        <SelectField
          aria-label="Folder parent"
          value={draft.parentId ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, parentId: event.target.value || null }))}
        >
          <option value="">Root</option>
          {folderOptions
            .filter((folder) => folder.id !== selectedFolderId)
            .map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
        </SelectField>
        <ActionButton
          onClick={() => {
            if (selectedFolderId === 'new') {
              createFolder(draft)
              setDraft(EMPTY_FOLDER_DRAFT)
              return
            }

            updateFolder(selectedFolderId, draft)
          }}
        >
          {selectedFolderId === 'new' ? 'Create folder' : 'Update folder'}
        </ActionButton>
      </div>
    </section>
  )
}

function TargetEditor() {
  const state = useAppStore((store) => store.state)
  const createTarget = useAppStore((store) => store.createTarget)
  const updateTarget = useAppStore((store) => store.updateTarget)
  const [selectedTargetId, setSelectedTargetId] = useState<TargetId | 'new'>('new')
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_TARGET_DRAFT)

  useEffect(() => {
    if (selectedTargetId === 'new') {
      setDraft(EMPTY_TARGET_DRAFT)
      return
    }

    const target = state.catalog.targetsById[selectedTargetId]
    if (!target) return

    setDraft({
      displayName: target.displayName,
      parentId: target.parentId,
      accountId: target.accountId,
      accountAlias: target.accountAlias,
      roleName: target.roleName,
      destinationPath: target.destinationPath,
    })
  }, [selectedTargetId, state.catalog.targetsById])

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((left, right) => left.name.localeCompare(right.name)),
    [state.catalog.foldersById],
  )

  const targetOptions = useMemo(
    () => Object.values(state.catalog.targetsById).sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [state.catalog.targetsById],
  )

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Targets" meta="create + edit" />
      <div className="space-y-3">
        <SelectField
          aria-label="Target editor selector"
          value={selectedTargetId}
          onChange={(event) => setSelectedTargetId(event.target.value as TargetId | 'new')}
        >
          <option value="new">Create new target</option>
          {targetOptions.map((target) => (
            <option key={target.id} value={target.id}>{target.displayName}</option>
          ))}
        </SelectField>
        <TextField
          aria-label="Target display name"
          value={draft.displayName}
          onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
          placeholder="Admin"
        />
        <TextField
          aria-label="Target account id"
          value={draft.accountId}
          onChange={(event) => setDraft((current) => ({ ...current, accountId: event.target.value }))}
          placeholder="123456789012"
        />
        <TextField
          aria-label="Target account alias"
          value={draft.accountAlias ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, accountAlias: event.target.value }))}
          placeholder="customer-prod"
        />
        <TextField
          aria-label="Target role name"
          value={draft.roleName}
          onChange={(event) => setDraft((current) => ({ ...current, roleName: event.target.value }))}
          placeholder="AdministratorAccess"
        />
        <TextField
          aria-label="Target destination path"
          value={draft.destinationPath ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, destinationPath: event.target.value }))}
          placeholder="/console/home"
        />
        <SelectField
          aria-label="Target parent"
          value={draft.parentId ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, parentId: event.target.value || null }))}
        >
          <option value="">Root</option>
          {folderOptions.map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.name}</option>
          ))}
        </SelectField>
        <ActionButton
          onClick={() => {
            if (selectedTargetId === 'new') {
              createTarget(draft)
              setDraft(EMPTY_TARGET_DRAFT)
              return
            }

            updateTarget(selectedTargetId, draft)
          }}
        >
          {selectedTargetId === 'new' ? 'Create target' : 'Update target'}
        </ActionButton>
      </div>
    </section>
  )
}

function ImportExportPanel() {
  const exportState = useAppStore((store) => store.exportState)
  const importState = useAppStore((store) => store.importState)
  const [buffer, setBuffer] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle title="Import / Export" meta="catalog portability" />
      <div className="space-y-3">
        <textarea
          aria-label="Import export payload"
          value={buffer}
          onChange={(event) => {
            setBuffer(event.target.value)
            setError(null)
            setStatus(null)
          }}
          className="min-h-40 w-full rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
          placeholder="Paste exported JSON here or click Export to generate it"
        />
        <div className="flex gap-2">
          <ActionButton
            onClick={() => {
              const payload = exportState()
              setBuffer(payload)
              setStatus('Exported current catalog to JSON payload.')
              setError(null)
            }}
            className="flex-1"
          >
            Export JSON
          </ActionButton>
          <ActionButton
            onClick={() => {
              try {
                importState(buffer)
                setStatus('Imported catalog JSON successfully.')
                setError(null)
              } catch (caughtError) {
                setError(caughtError instanceof Error ? caughtError.message : 'Import failed.')
                setStatus(null)
              }
            }}
            className="flex-1"
          >
            Import JSON
          </ActionButton>
        </div>
        {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
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
              recent launches, persistent tree expansion, and editable catalog data.
            </p>
          </div>
          <Badge>Manifest V3</Badge>
        </div>
      </header>

      <div className="space-y-4">
        <SearchPanel />
        <FolderEditor />
        <TargetEditor />
        <ImportExportPanel />
        <FavoritesPanel />
        <RecentsPanel />
        <BrowsePanel />
      </div>
    </div>
  )
}

export default Shell
