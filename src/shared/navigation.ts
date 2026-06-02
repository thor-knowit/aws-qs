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
