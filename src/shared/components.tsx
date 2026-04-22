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
  return <span className="inline-flex rounded border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400">{children}</span>
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{title}</h2>
      {meta ? <span className="text-[10px] text-zinc-600">{meta}</span> : null}
    </div>
  )
}

export function TextField({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        {...props}
        className={cn(
          'w-full rounded border bg-zinc-900 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600',
          error ? 'border-rose-700/70 focus:border-rose-500' : 'border-zinc-700 focus:border-zinc-500',
          props.className,
        )}
      />
      {error ? <p className="mt-0.5 text-[11px] text-rose-400">{error}</p> : null}
    </div>
  )
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none focus:border-zinc-500',
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
        'rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100',
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
