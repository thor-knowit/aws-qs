import { useEffect, useState } from 'react'
import { APP_NAME } from '@/shared/constants'
import type { FolderDraft, FolderId, NodeId, TargetDraft, TargetId } from '@/shared/types'
import { getNodeChildren, getTarget, getTargetPathLabel, isFolderId, isTargetId } from '@/domain/catalog'
import { useAppStore } from '@/popup/store'
import { cn } from '@/shared/utils'
import {
  ActionButton,
  EMPTY_FOLDER_DRAFT,
  EMPTY_TARGET_DRAFT,
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

function SidebarFolder({ folderId, selectedId, onSelect }: {
  folderId: FolderId
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
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors',
          isSelected
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
        )}
      >
        <span className="w-3 text-center text-[10px] text-zinc-600">{expanded ? '▾' : '▸'}</span>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: folder.color ?? '#f59e0b' }} />
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && children.length > 0 ? (
        <div className="ml-3 border-l border-zinc-800 pl-2">
          {children.map((childId) =>
            isFolderId(state, childId) ? (
              <SidebarFolder key={childId} folderId={childId} selectedId={selectedId} onSelect={onSelect} />
            ) : isTargetId(state, childId) ? (
              <SidebarTarget key={childId} targetId={childId} selectedId={selectedId} onSelect={onSelect} />
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  )
}

function SidebarTarget({ targetId, selectedId, onSelect }: {
  targetId: TargetId
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
        'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors',
        isSelected
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300',
      )}
    >
      <span className="w-3 text-center text-[9px] text-zinc-600">◆</span>
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-[#0a0a0c]">
      <div className="border-b border-zinc-800 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Catalog</p>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-px">
          {state.catalog.rootChildIds.map((id: NodeId) =>
            isFolderId(state, id) ? (
              <SidebarFolder key={id} folderId={id} selectedId={selectedId} onSelect={onSelect} />
            ) : isTargetId(state, id) ? (
              <SidebarTarget key={id} targetId={id} selectedId={selectedId} onSelect={onSelect} />
            ) : null,
          )}
          {state.catalog.rootChildIds.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-zinc-600">No items yet.</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1.5 border-t border-zinc-800 p-2">
        <ActionButton className="flex-1 text-[10px]" onClick={() => onNew('folder')}>+ Folder</ActionButton>
        <ActionButton className="flex-1 text-[10px]" onClick={() => onNew('target')}>+ Target</ActionButton>
      </div>
    </aside>
  )
}

/* ── Editor panels ── */

function FieldLabel({ children }: { children: string }) {
  return <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{children}</span>
}

/* ── Folder tree picker (replaces flat <select>) ── */

function FolderPickerNode({ folderId, selectedId, excludeId, onSelect }: {
  folderId: FolderId
  selectedId: FolderId | null
  excludeId?: FolderId
  onSelect: (id: FolderId | null) => void
}) {
  const state = useAppStore((s) => s.state)
  const folder = state.catalog.foldersById[folderId]
  if (!folder || folder.id === excludeId) return null

  const children = getNodeChildren(state, folder.id).filter((id) => isFolderId(state, id) && id !== excludeId)
  const isSelected = selectedId === folderId

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(folderId)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors',
          isSelected
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200',
        )}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: folder.color ?? '#f59e0b' }} />
        <span className="truncate">{folder.name}</span>
      </button>
      {children.length > 0 ? (
        <div className="ml-3 border-l border-zinc-800 pl-2">
          {children.map((childId) => (
            <FolderPickerNode key={childId} folderId={childId} selectedId={selectedId} excludeId={excludeId} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FolderTreePicker({ value, onChange, excludeId }: {
  value: FolderId | null
  onChange: (parentId: FolderId | null) => void
  excludeId?: FolderId
}) {
  const state = useAppStore((s) => s.state)
  const rootFolderIds = state.catalog.rootChildIds.filter((id) => isFolderId(state, id) && id !== excludeId)

  return (
    <div className="space-y-1">
      <FieldLabel>Parent Folder</FieldLabel>
      <div className="rounded border border-zinc-800 bg-zinc-950/60 p-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors',
            value === null
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300',
          )}
        >
          <span className="text-[10px] text-zinc-600">⌂</span>
          <span>Root</span>
        </button>
        {rootFolderIds.length > 0 ? (
          <div className="ml-3 border-l border-zinc-800 pl-2">
            {rootFolderIds.map((id) => (
              <FolderPickerNode key={id} folderId={id} selectedId={value} excludeId={excludeId} onSelect={onChange} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

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

  if (!folder) return <EmptyEditor />

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-zinc-100">Edit Folder</h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">Modify folder properties and organization.</p>
      </div>

      <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block space-y-1">
          <FieldLabel>Name</FieldLabel>
          <TextField value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Folder name" />
        </label>

        <div className="space-y-1">
          <FieldLabel>Color</FieldLabel>
          <ColorField value={draft.color ?? ''} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
        </div>

        <FolderTreePicker
          value={draft.parentId}
          onChange={(parentId) => setDraft((d) => ({ ...d, parentId }))}
          excludeId={folderId}
        />

        <div className="flex gap-2 pt-1">
          <ActionButton onClick={() => updateFolder(folderId, draft)} className="flex-1">Save Changes</ActionButton>
          <ActionButton onClick={() => moveNode({ nodeId: folderId, nextParentId: draft.parentId })} className="flex-1">Move</ActionButton>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ActionButton onClick={() => reorderSibling(folderId, 'up')}>↑ Up</ActionButton>
        <ActionButton onClick={() => reorderSibling(folderId, 'down')}>↓ Down</ActionButton>
        <div className="flex-1" />
        <button
          onClick={() => deleteFolder(folderId)}
          className="rounded border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-[11px] font-medium text-rose-300 transition hover:bg-rose-900/30"
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

  if (!target) return <EmptyEditor />

  const isFavorite = state.usage.favoriteTargetIds.includes(targetId)
  const pathLabel = getTargetPathLabel(state, targetId)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium text-zinc-100">Edit Target</h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">{pathLabel}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => toggleFavorite(targetId)}
              className={cn(
                'rounded border px-2.5 py-1 text-[11px] transition',
                isFavorite ? 'border-amber-800/50 bg-amber-950/40 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600',
              )}
            >
              {isFavorite ? '★ Pinned' : '☆ Pin'}
            </button>
            <button
              onClick={() => activateTarget(targetId)}
              className="rounded bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-900 transition hover:bg-white"
            >
              Switch
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block space-y-1">
          <FieldLabel>Display Name</FieldLabel>
          <TextField value={draft.displayName} onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))} placeholder="Admin" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <FieldLabel>Account ID</FieldLabel>
            <TextField value={draft.accountId} onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))} placeholder="123456789012" />
          </label>

          <label className="block space-y-1">
            <FieldLabel>Account Alias</FieldLabel>
            <TextField value={draft.accountAlias ?? ''} onChange={(e) => setDraft((d) => ({ ...d, accountAlias: e.target.value }))} placeholder="customer-prod" />
          </label>
        </div>

        <label className="block space-y-1">
          <FieldLabel>Role Name</FieldLabel>
          <TextField value={draft.roleName} onChange={(e) => setDraft((d) => ({ ...d, roleName: e.target.value }))} placeholder="AdministratorAccess" />
        </label>

        <label className="block space-y-1">
          <FieldLabel>Destination Path</FieldLabel>
          <TextField value={draft.destinationPath ?? ''} onChange={(e) => setDraft((d) => ({ ...d, destinationPath: e.target.value }))} placeholder="/console/home" />
        </label>

        <FolderTreePicker
          value={draft.parentId}
          onChange={(parentId) => setDraft((d) => ({ ...d, parentId }))}
        />

        <div className="flex gap-2 pt-1">
          <ActionButton onClick={() => updateTarget(targetId, draft)} className="flex-1">Save Changes</ActionButton>
          <ActionButton onClick={() => moveNode({ nodeId: targetId, nextParentId: draft.parentId })} className="flex-1">Move</ActionButton>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ActionButton onClick={() => reorderSibling(targetId, 'up')}>↑ Up</ActionButton>
        <ActionButton onClick={() => reorderSibling(targetId, 'down')}>↓ Down</ActionButton>
        <div className="flex-1" />
        <button
          onClick={() => deleteTarget(targetId)}
          className="rounded border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-[11px] font-medium text-rose-300 transition hover:bg-rose-900/30"
        >
          Delete Target
        </button>
      </div>
    </div>
  )
}

function NewFolderPanel({ onCreated }: { onCreated: (id: FolderId) => void }) {
  const createFolder = useAppStore((s) => s.createFolder)
  const [draft, setDraft] = useState<FolderDraft>(EMPTY_FOLDER_DRAFT)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-zinc-100">New Folder</h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">Create a folder to organize your targets.</p>
      </div>

      <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block space-y-1">
          <FieldLabel>Name</FieldLabel>
          <TextField value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Folder name" />
        </label>

        <div className="space-y-1">
          <FieldLabel>Color</FieldLabel>
          <ColorField value={draft.color ?? ''} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
        </div>

        <FolderTreePicker
          value={draft.parentId}
          onChange={(parentId) => setDraft((d) => ({ ...d, parentId }))}
        />

        <ActionButton
          onClick={() => {
            createFolder(draft)
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
  const createTarget = useAppStore((s) => s.createTarget)
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_TARGET_DRAFT)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-zinc-100">New Target</h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">Add an AWS account/role switch target.</p>
      </div>

      <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block space-y-1">
          <FieldLabel>Display Name</FieldLabel>
          <TextField value={draft.displayName} onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))} placeholder="Admin" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <FieldLabel>Account ID</FieldLabel>
            <TextField value={draft.accountId} onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))} placeholder="123456789012" />
          </label>

          <label className="block space-y-1">
            <FieldLabel>Account Alias</FieldLabel>
            <TextField value={draft.accountAlias ?? ''} onChange={(e) => setDraft((d) => ({ ...d, accountAlias: e.target.value }))} placeholder="customer-prod" />
          </label>
        </div>

        <label className="block space-y-1">
          <FieldLabel>Role Name</FieldLabel>
          <TextField value={draft.roleName} onChange={(e) => setDraft((d) => ({ ...d, roleName: e.target.value }))} placeholder="AdministratorAccess" />
        </label>

        <label className="block space-y-1">
          <FieldLabel>Destination Path</FieldLabel>
          <TextField value={draft.destinationPath ?? ''} onChange={(e) => setDraft((d) => ({ ...d, destinationPath: e.target.value }))} placeholder="/console/home" />
        </label>

        <FolderTreePicker
          value={draft.parentId}
          onChange={(parentId) => setDraft((d) => ({ ...d, parentId }))}
        />

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
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium text-zinc-100">Import / Export</h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">Transfer your catalog between devices or back it up as JSON.</p>
      </div>

      <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-4">
        <textarea
          aria-label="Import export payload"
          value={buffer}
          onChange={(e) => { setBuffer(e.target.value); setError(null); setStatus(null) }}
          className="min-h-48 w-full rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          placeholder="Paste exported JSON here or click Export to generate it"
        />
        <div className="flex gap-2">
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
        {status ? <p className="text-[11px] text-emerald-400">{status}</p> : null}
        {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
      </div>
    </div>
  )
}

function EmptyEditor() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[11px] uppercase tracking-widest text-zinc-600">Select from sidebar</p>
      <p className="mt-1 text-[12px] text-zinc-700">or create a new folder / target.</p>
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
    globalThis.history.replaceState(null, '', `#edit=${id}`)
  }

  function handleNew(kind: 'folder' | 'target') {
    setView(kind === 'folder' ? { kind: 'new-folder' } : { kind: 'new-target' })
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[11px] uppercase tracking-widest text-zinc-600">
        Loading…
      </div>
    )
  }

  const selectedId = view.kind === 'folder' ? view.id : view.kind === 'target' ? view.id : null

  return (
    <div className="flex min-h-screen bg-[#0c0c0e] text-zinc-100">
      <Sidebar selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
          <div>
            <h1 className="text-[14px] font-medium text-zinc-200">{APP_NAME}</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Settings</p>
          </div>
          <ActionButton onClick={() => setView({ kind: 'import-export' })}>Import / Export</ActionButton>
        </header>

        {/* Editor area */}
        <div className="mx-auto max-w-xl px-6 py-6">
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
