import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { FolderDraft, TargetDraft } from '@/shared/types'
import { cn } from '@/shared/utils'

export const EMPTY_FOLDER_DRAFT: FolderDraft = {
  name: '',
  parentId: null,
  color: '#f59e0b',
}

export const EMPTY_TARGET_DRAFT: TargetDraft = {
  displayName: '',
  parentId: null,
  accountId: '',
  accountAlias: '',
  roleName: '',
  destinationPath: '/console/home',
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-300">{children}</span>
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">{title}</h2>
      {meta ? <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{meta}</span> : null}
    </div>
  )
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
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

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
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

export function ActionButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
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

export function openOptionsPage() {
  if (globalThis.chrome?.runtime?.openOptionsPage) {
    globalThis.chrome.runtime.openOptionsPage()
  } else {
    globalThis.open('options.html', '_blank')
  }
}

export function openEditorForNode(nodeId: string) {
  const hash = `#edit=${nodeId}`
  if (globalThis.chrome?.runtime?.getURL) {
    const url = globalThis.chrome.runtime.getURL(`options.html${hash}`)
    if (globalThis.chrome?.tabs?.create) {
      void globalThis.chrome.tabs.create({ url })
    } else {
      globalThis.open(url, '_blank')
    }
  } else {
    globalThis.open(`options.html${hash}`, '_blank')
  }
}
