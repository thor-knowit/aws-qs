import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/utils'

/* ── Color math ── */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  let r: number, g: number, b: number
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  } else {
    return null
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(v).toString(16).padStart(2, '0'))
      .join('')
  )
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return [0, 0, Math.round(l * 100)]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max - min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  s /= 100
  l /= 100
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

/** Parse hex or hsl/hsla string into components. */
function parseColor(
  color: string,
): { h: number; s: number; l: number; a: number } | null {
  const rgb = hexToRgb(color)
  if (rgb) {
    const [h, s, l] = rgbToHsl(...rgb)
    return { h, s, l, a: 1 }
  }
  const m = color.match(
    /hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*(?:,\s*([0-9.]+))?\s*\)/,
  )
  if (m) {
    return {
      h: Number(m[1]),
      s: Number(m[2]),
      l: Number(m[3]),
      a: m[4] != null ? Number(m[4]) : 1,
    }
  }
  return null
}

/** Best-effort hex conversion for the native color picker. */
function toPickerHex(color: string, fallback: string): string {
  const rgb = hexToRgb(color)
  if (rgb) return rgbToHex(...rgb)
  const parsed = parseColor(color)
  if (parsed) return rgbToHex(...hslToRgb(parsed.h, parsed.s, parsed.l))
  return fallback
}

/* ── Types ── */

type ColorMode = 'hex' | 'hsl' | 'hsla'

const NEXT_MODE: Record<ColorMode, ColorMode> = {
  hex: 'hsl',
  hsl: 'hsla',
  hsla: 'hex',
}

interface ColorFieldProps {
  value: string
  onChange: (color: string) => void
  defaultColor?: string
}

/* ── Channel definitions ── */

interface Channel {
  key: 'h' | 's' | 'l' | 'a'
  max: number
  step: number
  suffix: string
}

const HSL_CHANNELS: Channel[] = [
  { key: 'h', max: 360, step: 1, suffix: '°' },
  { key: 's', max: 100, step: 1, suffix: '%' },
  { key: 'l', max: 100, step: 1, suffix: '%' },
]

const HSLA_CHANNELS: Channel[] = [
  ...HSL_CHANNELS,
  { key: 'a', max: 1, step: 0.01, suffix: '' },
]

/* ── Component ── */

export function ColorField({
  value,
  onChange,
  defaultColor = '#f59e0b',
}: ColorFieldProps) {
  const [mode, setMode] = useState<ColorMode>('hex')
  const [hslDraft, setHslDraft] = useState({ h: '', s: '', l: '', a: '1' })
  const hslInputActive = useRef(false)

  const effectiveValue = value || defaultColor
  const pickerHex = toPickerHex(effectiveValue, defaultColor)

  // Sync HSL draft from value — skip when the change came from the HSL inputs
  useEffect(() => {
    if (hslInputActive.current) {
      hslInputActive.current = false
      return
    }
    const parsed = parseColor(effectiveValue)
    if (parsed) {
      setHslDraft({
        h: String(parsed.h),
        s: String(parsed.s),
        l: String(parsed.l),
        a: String(parsed.a),
      })
    }
  }, [effectiveValue])

  const handlePickerChange = (hex: string) => {
    if (mode === 'hex') {
      onChange(hex)
      return
    }
    const rgb = hexToRgb(hex)
    if (!rgb) return
    const [h, s, l] = rgbToHsl(...rgb)
    const a = hslDraft.a
    setHslDraft({ h: String(h), s: String(s), l: String(l), a })
    onChange(
      mode === 'hsla'
        ? `hsla(${h}, ${s}%, ${l}%, ${a})`
        : `hsl(${h}, ${s}%, ${l}%)`,
    )
  }

  const handleHslChange = (field: 'h' | 's' | 'l' | 'a', val: string) => {
    hslInputActive.current = true
    const next = { ...hslDraft, [field]: val }
    setHslDraft(next)

    const h = Math.max(0, Math.min(360, Number(next.h) || 0))
    const s = Math.max(0, Math.min(100, Number(next.s) || 0))
    const l = Math.max(0, Math.min(100, Number(next.l) || 0))
    const a = Number(next.a)

    onChange(
      mode === 'hsla'
        ? `hsla(${h}, ${s}%, ${l}%, ${isNaN(a) ? 1 : a})`
        : `hsl(${h}, ${s}%, ${l}%)`,
    )
  }

  const cycleMode = () => {
    const next = NEXT_MODE[mode]
    setMode(next)
    const parsed = parseColor(effectiveValue)
    if (!parsed) return

    if (next === 'hex') {
      onChange(rgbToHex(...hslToRgb(parsed.h, parsed.s, parsed.l)))
    } else if (next === 'hsl') {
      onChange(`hsl(${parsed.h}, ${parsed.s}%, ${parsed.l}%)`)
    } else {
      onChange(
        `hsla(${parsed.h}, ${parsed.s}%, ${parsed.l}%, ${parsed.a})`,
      )
    }
  }

  const placeholder =
    mode === 'hex'
      ? defaultColor
      : mode === 'hsl'
        ? 'hsl(38, 92%, 50%)'
        : 'hsla(38, 92%, 50%, 1)'

  const channels =
    mode === 'hsl'
      ? HSL_CHANNELS
      : mode === 'hsla'
        ? HSLA_CHANNELS
        : null

  return (
    <div className="space-y-2">
      {/* Swatch · text input · inline format label */}
      <div className="flex items-center gap-3">
        {/* Native color picker behind styled swatch */}
        <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/10 transition hover:border-amber-300/30">
          {/* Checkerboard for alpha-color visibility */}
          <span
            className="absolute inset-0"
            style={{
              background:
                'repeating-conic-gradient(#27272a 0% 25%, transparent 0% 50%) 0 0 / 8px 8px',
            }}
          />
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => handlePickerChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
            tabIndex={-1}
          />
          <span
            className="absolute inset-0"
            style={{ backgroundColor: effectiveValue }}
          />
          <span className="absolute inset-0 rounded-[11px] ring-1 ring-inset ring-white/[0.06]" />
        </label>

        {/* Text input with cycling format badge */}
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full rounded-xl border border-white/10 bg-black/25 py-2 pl-3 pr-14 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-300/40',
            )}
          />
          <button
            type="button"
            onClick={cycleMode}
            title="Cycle format: hex → hsl → hsla"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400"
          >
            {mode}
          </button>
        </div>
      </div>

      {/* HSL(A) channel controls — compact, understated */}
      {channels && (
        <div className="flex items-center gap-3 pl-[52px]">
          {channels.map(({ key, max, step, suffix }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[10px] lowercase text-zinc-600">
                {key}
              </span>
              <input
                type="number"
                min={0}
                max={max}
                step={step}
                value={hslDraft[key]}
                onChange={(e) => handleHslChange(key, e.target.value)}
                className="w-14 rounded-lg border border-white/8 bg-black/20 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-amber-300/30"
              />
              {suffix && (
                <span className="text-[10px] text-zinc-600">{suffix}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
