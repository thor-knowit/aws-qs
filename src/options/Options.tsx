import { useEffect, useMemo, useState } from 'react'
import { APP_NAME } from '@/shared/constants'
import type { FolderDraft, FolderId, NodeId, TargetDraft, TargetId } from '@/shared/types'
import { getNodeChildren, getTarget, getTargetPathLabel, isFolderId, isTargetId } from '@/domain/catalog'
import { useAppStore } from '@/popup/store'
import { cn } from '@/shared/utils'
import {
  ActionButton,
  Badge,
  EMPTY_FOLDER_DRAFT,
  EMPTY_TARGET_DRAFT,
  SelectField,
  TextField,
} from '@/shared/components'
import { ColorField } from '@/shared/ColorField'

function useHashEditId(): string | null {
  const [editId, setEditId] = useState<string | null>(() => {
    const hash = globalThis.location?.hash ?? ''
    const match = hash.match(/^#edit=(.+)$/)
    return match?.[1] ?? null
  })

  useEffect(() => {
    function onHashChange() {
      const hash = globalThis.location.hash
      const match = hash.match(/^#edit=(.+)$/)
      setEditId(match?.[1] ?? null)
    }

    globalThis.addEventListener('hashchange', onHashChange)
    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [])

  return editId
}

/* ── Sidebar tree ── */

function SidebarFolder({ folderId, depth = 0, selectedId, onSelect }: {
  folderId: FolderId
  depth?: number
  selectedId: string | null
  onSelect: (id: NodeId) => void
}) {
  const state = useAppStore((s) => s.state)
  const folder = state.catalog.foldersById[folderId]
  const [expanded, setExpanded] = useState(true)
  if (!folder) return null

  const children = getNodeChildren(state, folder.id)
  const isSelected = selectedId === folderId

  return (
    <div>
      <button
        onClick={() => onSelect(folderId)}
        onDoubleClick={() => setExpanded((e) => !e)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
          isSelected
            ? 'bg-amber-400/15 text-amber-100'
            : 'text-zinc-300 hover:bg-white/5',
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        <span className="text-[10px] text-zinc-500">{expanded ? '▾' : '▸'}</span>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folder.color ?? '#f59e0b' }} />
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded ? (
        <div>
          {children.map((childId) =>
            isFolderId(state, childId) ? (
              <SidebarFolder key={childId} folderId={childId} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
            ) : isTargetId(state, childId) ? (
              <SidebarTarget key={childId} targetId={childId} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  )
}

function SidebarTarget({ targetId, depth, selectedId, onSelect }: {
  targetId: TargetId
  depth: number
  selectedId: string | null
  onSelect: (id: NodeId) => void
}) {
  const state = useAppStore((s) => s.state)
  const target = getTarget(state, targetId)
  if (!target) return null

  const isSelected = selectedId === targetId

  return (
    <button
      onClick={() => onSelect(targetId)}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
        isSelected
          ? 'bg-amber-400/15 text-amber-100'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
      )}
      style={{ paddingLeft: depth * 16 + 8 }}
    >
      <span className="text-[10px]">◆</span>
      <span className="truncate">{target.displayName}</span>
    </button>
  )
}

function Sidebar({ selectedId, onSelect, onNew }: {
  selectedId: string | null
  onSelect: (id: NodeId) => void
  onNew: (kind: 'folder' | 'target') => void
}) {
  const state = useAppStore((s) => s.state)

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-white/8 bg-zinc-950/80">
      <div className="flex items-center gap-2 border-b border-white/8 p-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70">Catalog</p>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-0.5">
          {state.catalog.rootChildIds.map((id: NodeId) =>
            isFolderId(state, id) ? (
              <SidebarFolder key={id} folderId={id} selectedId={selectedId} onSelect={onSelect} />
            ) : isTargetId(state, id) ? (
              <SidebarTarget key={id} targetId={id} depth={0} selectedId={selectedId} onSelect={onSelect} />
            ) : null,
          )}
          {state.catalog.rootChildIds.length === 0 ? (
            <p className="px-2 py-4 text-xs text-zinc-500">No items yet. Create a folder or target to get started.</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/8 p-3">
        <ActionButton className="flex-1 text-[10px]" onClick={() => onNew('folder')}>+ Folder</ActionButton>
        <ActionButton className="flex-1 text-[10px]" onClick={() => onNew('target')}>+ Target</ActionButton>
      </div>
    </aside>
  )
}

/* ── Editor panels ── */

function FolderEditorPanel({ folderId }: { folderId: FolderId }) {
  const state = useAppStore((s) => s.state)
  const updateFolder = useAppStore((s) => s.updateFolder)
  const deleteFolder = useAppStore((s) => s.deleteFolder)
  const moveNode = useAppStore((s) => s.moveNode)
  const reorderSibling = useAppStore((s) => s.reorderSibling)

  const folder = state.catalog.foldersById[folderId]
  const [draft, setDraft] = useState<FolderDraft>(EMPTY_FOLDER_DRAFT)

  useEffect(() => {
    if (!folder) return
    setDraft({ name: folder.name, parentId: folder.parentId, color: folder.color })
  }, [folder])

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById)
      .filter((f) => f.id !== folderId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [folderId, state.catalog.foldersById],
  )

  if (!folder) return <EmptyEditor />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-100">Edit Folder</h2>
        <p className="mt-1 text-sm text-zinc-500">Modify folder properties and organization.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Name</span>
          <TextField value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Folder name" />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Color</span>
          <ColorField value={draft.color ?? ''} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Parent Folder</span>
          <SelectField value={draft.parentId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null }))}>
            <option value="">Root</option>
            {folderOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectField>
        </label>

        <div className="flex gap-2 pt-2">
          <ActionButton onClick={() => updateFolder(folderId, draft)} className="flex-1">Save Changes</ActionButton>
          <ActionButton onClick={() => moveNode({ nodeId: folderId, nextParentId: draft.parentId })} className="flex-1">Move</ActionButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ActionButton onClick={() => reorderSibling(folderId, 'up')}>↑ Move Up</ActionButton>
        <ActionButton onClick={() => reorderSibling(folderId, 'down')}>↓ Move Down</ActionButton>
        <div className="flex-1" />
        <button
          onClick={() => deleteFolder(folderId)}
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-400/20"
        >
          Delete Folder
        </button>
      </div>
    </div>
  )
}

function TargetEditorPanel({ targetId }: { targetId: TargetId }) {
  const state = useAppStore((s) => s.state)
  const updateTarget = useAppStore((s) => s.updateTarget)
  const deleteTarget = useAppStore((s) => s.deleteTarget)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const activateTarget = useAppStore((s) => s.activateTarget)
  const moveNode = useAppStore((s) => s.moveNode)
  const reorderSibling = useAppStore((s) => s.reorderSibling)

  const target = state.catalog.targetsById[targetId]
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_TARGET_DRAFT)

  useEffect(() => {
    if (!target) return
    setDraft({
      displayName: target.displayName,
      parentId: target.parentId,
      accountId: target.accountId,
      accountAlias: target.accountAlias,
      roleName: target.roleName,
      destinationPath: target.destinationPath,
    })
  }, [target])

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((a, b) => a.name.localeCompare(b.name)),
    [state.catalog.foldersById],
  )

  if (!target) return <EmptyEditor />

  const isFavorite = state.usage.favoriteTargetIds.includes(targetId)
  const pathLabel = getTargetPathLabel(state, targetId)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Edit Target</h2>
            <p className="mt-1 text-sm text-zinc-500">{pathLabel}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleFavorite(targetId)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition',
                isFavorite ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-white/10 text-zinc-400 hover:border-amber-300/30',
              )}
            >
              {isFavorite ? '★ Favorited' : '☆ Favorite'}
            </button>
            <button
              onClick={() => activateTarget(targetId)}
              className="rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-950"
            >
              Switch Role
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Display Name</span>
          <TextField value={draft.displayName} onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))} placeholder="Admin" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Account ID</span>
            <TextField value={draft.accountId} onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))} placeholder="123456789012" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Account Alias</span>
            <TextField value={draft.accountAlias ?? ''} onChange={(e) => setDraft((d) => ({ ...d, accountAlias: e.target.value }))} placeholder="customer-prod" />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Role Name</span>
          <TextField value={draft.roleName} onChange={(e) => setDraft((d) => ({ ...d, roleName: e.target.value }))} placeholder="AdministratorAccess" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Destination Path</span>
          <TextField value={draft.destinationPath ?? ''} onChange={(e) => setDraft((d) => ({ ...d, destinationPath: e.target.value }))} placeholder="/console/home" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Parent Folder</span>
          <SelectField value={draft.parentId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null }))}>
            <option value="">Root</option>
            {folderOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectField>
        </label>

        <div className="flex gap-2 pt-2">
          <ActionButton onClick={() => updateTarget(targetId, draft)} className="flex-1">Save Changes</ActionButton>
          <ActionButton onClick={() => moveNode({ nodeId: targetId, nextParentId: draft.parentId })} className="flex-1">Move</ActionButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ActionButton onClick={() => reorderSibling(targetId, 'up')}>↑ Move Up</ActionButton>
        <ActionButton onClick={() => reorderSibling(targetId, 'down')}>↓ Move Down</ActionButton>
        <div className="flex-1" />
        <button
          onClick={() => deleteTarget(targetId)}
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-400/20"
        >
          Delete Target
        </button>
      </div>
    </div>
  )
}

function NewFolderPanel({ onCreated }: { onCreated: (id: FolderId) => void }) {
  const state = useAppStore((s) => s.state)
  const createFolder = useAppStore((s) => s.createFolder)
  const [draft, setDraft] = useState<FolderDraft>(EMPTY_FOLDER_DRAFT)

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((a, b) => a.name.localeCompare(b.name)),
    [state.catalog.foldersById],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-100">New Folder</h2>
        <p className="mt-1 text-sm text-zinc-500">Create a folder to organize your targets.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Name</span>
          <TextField value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Folder name" />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Color</span>
          <ColorField value={draft.color ?? ''} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Parent Folder</span>
          <SelectField value={draft.parentId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null }))}>
            <option value="">Root</option>
            {folderOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectField>
        </label>

        <ActionButton
          onClick={() => {
            createFolder(draft)
            // Find the newly created folder by name (most recent)
            const folders = Object.values(useAppStore.getState().state.catalog.foldersById)
            const created = folders.find((f) => f.name === draft.name)
            if (created) onCreated(created.id)
            setDraft(EMPTY_FOLDER_DRAFT)
          }}
          className="w-full"
        >
          Create Folder
        </ActionButton>
      </div>
    </div>
  )
}

function NewTargetPanel({ onCreated }: { onCreated: (id: TargetId) => void }) {
  const state = useAppStore((s) => s.state)
  const createTarget = useAppStore((s) => s.createTarget)
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_TARGET_DRAFT)

  const folderOptions = useMemo(
    () => Object.values(state.catalog.foldersById).sort((a, b) => a.name.localeCompare(b.name)),
    [state.catalog.foldersById],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-100">New Target</h2>
        <p className="mt-1 text-sm text-zinc-500">Add an AWS account/role switch target.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Display Name</span>
          <TextField value={draft.displayName} onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))} placeholder="Admin" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Account ID</span>
            <TextField value={draft.accountId} onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))} placeholder="123456789012" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Account Alias</span>
            <TextField value={draft.accountAlias ?? ''} onChange={(e) => setDraft((d) => ({ ...d, accountAlias: e.target.value }))} placeholder="customer-prod" />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Role Name</span>
          <TextField value={draft.roleName} onChange={(e) => setDraft((d) => ({ ...d, roleName: e.target.value }))} placeholder="AdministratorAccess" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Destination Path</span>
          <TextField value={draft.destinationPath ?? ''} onChange={(e) => setDraft((d) => ({ ...d, destinationPath: e.target.value }))} placeholder="/console/home" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Parent Folder</span>
          <SelectField value={draft.parentId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null }))}>
            <option value="">Root</option>
            {folderOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectField>
        </label>

        <ActionButton
          onClick={() => {
            createTarget(draft)
            const targets = Object.values(useAppStore.getState().state.catalog.targetsById)
            const created = targets.find((t) => t.displayName === draft.displayName && t.accountId === draft.accountId)
            if (created) onCreated(created.id)
            setDraft(EMPTY_TARGET_DRAFT)
          }}
          className="w-full"
        >
          Create Target
        </ActionButton>
      </div>
    </div>
  )
}

function ImportExportPanel() {
  const exportState = useAppStore((s) => s.exportState)
  const importState = useAppStore((s) => s.importState)
  const [buffer, setBuffer] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-100">Import / Export</h2>
        <p className="mt-1 text-sm text-zinc-500">Transfer your catalog between devices or back it up as JSON.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <textarea
          aria-label="Import export payload"
          value={buffer}
          onChange={(e) => { setBuffer(e.target.value); setError(null); setStatus(null) }}
          className="min-h-56 w-full rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
          placeholder="Paste exported JSON here or click Export to generate it"
        />
        <div className="flex gap-3">
          <ActionButton
            onClick={() => { setBuffer(exportState()); setStatus('Exported current catalog.'); setError(null) }}
            className="flex-1"
          >
            Export JSON
          </ActionButton>
          <ActionButton
            onClick={() => {
              try { importState(buffer); setStatus('Imported successfully.'); setError(null) }
              catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); setStatus(null) }
            }}
            className="flex-1"
          >
            Import JSON
          </ActionButton>
        </div>
        {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    </div>
  )
}

function EmptyEditor() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Select a node from the sidebar</p>
      <p className="mt-2 text-sm text-zinc-600">or create a new folder / target to get started.</p>
    </div>
  )
}

/* ── Main shell ── */

type EditorView =
  | { kind: 'folder'; id: FolderId }
  | { kind: 'target'; id: TargetId }
  | { kind: 'new-folder' }
  | { kind: 'new-target' }
  | { kind: 'import-export' }
  | { kind: 'empty' }

export default function Options() {
  const initialize = useAppStore((s) => s.initialize)
  const hydrated = useAppStore((s) => s.hydrated)
  const state = useAppStore((s) => s.state)
  const hashEditId = useHashEditId()

  const [view, setView] = useState<EditorView>({ kind: 'empty' })

  useEffect(() => {
    void initialize()
  }, [initialize])

  // Sync hash-based deep link into view once hydrated
  useEffect(() => {
    if (!hydrated || !hashEditId) return

    if (hashEditId in state.catalog.foldersById) {
      setView({ kind: 'folder', id: hashEditId })
    } else if (hashEditId in state.catalog.targetsById) {
      setView({ kind: 'target', id: hashEditId })
    }
  }, [hydrated, hashEditId, state.catalog.foldersById, state.catalog.targetsById])

  function handleSelect(id: NodeId) {
    if (isFolderId(state, id)) {
      setView({ kind: 'folder', id })
    } else if (isTargetId(state, id)) {
      setView({ kind: 'target', id })
    }
    // Update hash for deep-link persistence
    globalThis.history.replaceState(null, '', `#edit=${id}`)
  }

  function handleNew(kind: 'folder' | 'target') {
    setView(kind === 'folder' ? { kind: 'new-folder' } : { kind: 'new-target' })
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.28em] text-zinc-500">
        Hydrating catalog…
      </div>
    )
  }

  const selectedId = view.kind === 'folder' ? view.id : view.kind === 'target' ? view.id : null

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.10),_transparent_40%),linear-gradient(180deg,_#16151b_0%,_#09090b_48%,_#050506_100%)] text-zinc-100">
      <Sidebar selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/8 px-8 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-amber-200/70">Settings</p>
            <h1 className="mt-1 font-serif text-xl tracking-tight text-white">{APP_NAME}</h1>
          </div>
          <div className="flex gap-2">
            <ActionButton onClick={() => setView({ kind: 'import-export' })}>Import / Export</ActionButton>
            <Badge>Manifest V3</Badge>
          </div>
        </header>

        {/* Editor area */}
        <div className="mx-auto max-w-2xl px-8 py-8">
          {view.kind === 'folder' ? <FolderEditorPanel folderId={view.id} /> : null}
          {view.kind === 'target' ? <TargetEditorPanel targetId={view.id} /> : null}
          {view.kind === 'new-folder' ? <NewFolderPanel onCreated={(id) => { setView({ kind: 'folder', id }); globalThis.history.replaceState(null, '', `#edit=${id}`) }} /> : null}
          {view.kind === 'new-target' ? <NewTargetPanel onCreated={(id) => { setView({ kind: 'target', id }); globalThis.history.replaceState(null, '', `#edit=${id}`) }} /> : null}
          {view.kind === 'import-export' ? <ImportExportPanel /> : null}
          {view.kind === 'empty' ? <EmptyEditor /> : null}
        </div>
      </main>
    </div>
  )
}
