/// <reference types="chrome" />

interface LaunchTargetMessage {
  type: 'aws-quick-switch/launch-target'
  url: string
}

function isLaunchMessage(value: unknown): value is LaunchTargetMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'aws-quick-switch/launch-target' &&
      typeof (value as { url?: unknown }).url === 'string',
  )
}

chrome.runtime.onInstalled.addListener(() => {
  console.info('AWS Quick Switch installed')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLaunchMessage(message)) return false

  void chrome.tabs
    .create({ url: message.url, active: true })
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }))

  return true
})

if (chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command !== 'open-popup') return
    void chrome.action.openPopup?.()
  })
}
