/// <reference types="chrome" />

interface LaunchTargetMessage {
  type: 'aws-quick-switch/launch-target'
  url: string
  automation?: SwitchRoleAutomation
}

interface SwitchRoleAutomation {
  sourceAccount?: string
  sourceRoleName?: string
}

interface TabChangeInfo {
  status?: string
  url?: string
}

function isLaunchMessage(value: unknown): value is LaunchTargetMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'aws-quick-switch/launch-target' &&
      typeof (value as { url?: unknown }).url === 'string',
  )
}

function isSwitchRoleUrl(url: string | undefined): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return parsed.hostname === 'signin.aws.amazon.com' && parsed.pathname.startsWith('/switchrole')
  } catch {
    return false
  }
}

async function openLaunchTab(message: LaunchTargetMessage) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const index = activeTab?.index != null ? activeTab.index + 1 : undefined
  const tab = await chrome.tabs.create({ url: message.url, active: true, index })

  if (tab.id != null && message.automation) {
    scheduleSwitchRoleAutomation(tab.id, message.automation)
  }
}

function scheduleSwitchRoleAutomation(tabId: number, automation: SwitchRoleAutomation) {
  let complete = false
  const timeoutId = setTimeout(cleanup, 15_000)

  function cleanup() {
    if (complete) return
    complete = true
    chrome.tabs.onUpdated.removeListener(handleUpdated)
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }

  async function run() {
    cleanup()
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: runSwitchRoleAutomation,
        args: [automation],
      })
    } catch (error) {
      console.warn('AWS Quick Switch automation failed', error)
    }
  }

  function handleUpdated(updatedTabId: number, changeInfo: TabChangeInfo, tab: chrome.tabs.Tab) {
    if (updatedTabId !== tabId || complete) return

    const currentUrl = changeInfo.url ?? tab.url
    if (currentUrl && !isSwitchRoleUrl(currentUrl)) {
      cleanup()
      return
    }

    if (changeInfo.status === 'complete' && isSwitchRoleUrl(currentUrl)) {
      void run()
    }
  }

  chrome.tabs.onUpdated.addListener(handleUpdated)
  void chrome.tabs.get(tabId).then((tab) => {
    if (!complete && tab.status === 'complete' && isSwitchRoleUrl(tab.url)) {
      void run()
    }
  })
}

async function runSwitchRoleAutomation(automation: SwitchRoleAutomation) {
  const sourceAccount = automation.sourceAccount?.trim().toLowerCase()
  const sourceRoleName = automation.sourceRoleName?.trim().toLowerCase()
  const wantsSource = Boolean(sourceAccount || sourceRoleName)
  const compactSourceAccount = sourceAccount?.replace(/\D/g, '')

  function visible(element: Element): boolean {
    const htmlElement = element as HTMLElement
    const rect = htmlElement.getBoundingClientRect()
    const style = globalThis.getComputedStyle(htmlElement)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }

  function textFor(element: Element): string {
    const htmlElement = element as HTMLElement
    const control = element as HTMLInputElement | HTMLButtonElement | HTMLOptionElement
    return [
      htmlElement.innerText,
      element.textContent,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      'value' in control ? control.value : '',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  function textMatches(haystack: string, needle: string | undefined): boolean {
    if (!needle) return true

    const normalizedNeedle = needle.replace(/\s+/g, ' ').trim()
    if (!normalizedNeedle) return true

    if (haystack.includes(normalizedNeedle)) return true

    const compactNeedle = normalizedNeedle.replace(/\W/g, '')
    const compactHaystack = haystack.replace(/\W/g, '')
    return Boolean(compactNeedle && compactHaystack.includes(compactNeedle))
  }

  function matchesSource(element: Element): boolean {
    const text = textFor(element)
    if (!text) return false

    return Boolean(
      (
        !sourceAccount ||
        textMatches(text, sourceAccount) ||
        Boolean(compactSourceAccount && text.replace(/\D/g, '').includes(compactSourceAccount))
      ) &&
        textMatches(text, sourceRoleName),
    )
  }

  function getOptionContainer(input: Element): Element {
    const candidates: Element[] = []
    let current = input.parentElement

    while (current && current !== document.body) {
      candidates.push(current)
      current = current.parentElement
    }

    return candidates.find((candidate) => {
      const text = textFor(candidate)
      return text.includes('logged in') || text.includes('@') || matchesSource(candidate)
    }) ?? input
  }

  function selectDefaultSource(): boolean {
    if (!wantsSource) return true

    for (const select of Array.from(document.querySelectorAll('select')).filter(visible)) {
      const option = Array.from(select.options).find(matchesSource)
      if (option) {
        select.value = option.value
        select.dispatchEvent(new Event('input', { bubbles: true }))
        select.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }

    const sourceInputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
      .filter(visible)
      .filter((input) => {
        const id = input.getAttribute('id')
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
        const implicitLabel = input.closest('label')
        const optionContainer = getOptionContainer(input)
        return (
          matchesSource(input) ||
          Boolean(label && matchesSource(label)) ||
          Boolean(implicitLabel && matchesSource(implicitLabel)) ||
          matchesSource(optionContainer)
        )
      })

    const input = sourceInputs[0] as HTMLInputElement | undefined
    if (input) {
      getOptionContainer(input).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      input.click()
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }

    const candidate = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], li, tr, div'))
      .filter(visible)
      .find(matchesSource) as HTMLElement | undefined

    if (candidate) {
      candidate.click()
      return true
    }

    return false
  }

  function clickSwitchRole(): boolean {
    const submitControl = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]'))
      .filter(visible)
      .find((element) => {
        const text = textFor(element)
        const disabled = (element as HTMLButtonElement | HTMLInputElement).disabled || element.getAttribute('aria-disabled') === 'true'
        return !disabled && /\bswitch\s+role\b/.test(text) && !/\bswitch\s+back\b/.test(text)
      }) as HTMLElement | undefined

    if (!submitControl) return false
    submitControl.click()
    return true
  }

  await new Promise<void>((resolve) => {
    const startedAt = Date.now()
    const intervalId = setInterval(() => {
      const sourceReady = selectDefaultSource()
      const clicked = sourceReady && clickSwitchRole()

      if (clicked || !wantsSource || Date.now() - startedAt > 8_000) {
        clearInterval(intervalId)
        resolve()
      }
    }, 250)
  })
}

chrome.runtime.onInstalled.addListener(() => {
  console.info('AWS Quick Switch installed')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLaunchMessage(message)) return false

  void openLaunchTab(message)
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
