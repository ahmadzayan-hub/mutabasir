# UX / UI design system

This document describes the tokens and primitives actually used in the
code, not an aspirational design. Grep for each identifier to find its
call sites.

## Colour tokens (`src/app/globals.css`)

| Token | Value | Purpose |
|---|---|---|
| `--color-brand-navy` | `#171c8f` | Primary brand, headings, active states |
| `--color-brand-red` | `#ee0032` | Warning pulse, destructive actions |
| `--color-brand-gold` | `#d4a017` | Accents (Sparkles, aperture-mark focus dot) |
| `--color-brand-teal` | `#00b0b9` | Reserved for secondary accent |
| `--color-status-green` | `#10b981` | On-track / HIGH confidence / pass |
| `--color-status-amber` | `#f59e0b` | Watch / MEDIUM / warning |
| `--color-status-red` | `#ef4444` | Action required / error |
| `--color-ink` | `#0f172a` | Body text |
| `--color-paper` | `#ffffff` | Card/page backgrounds |

Statement: **one strict traffic-light palette (green / amber / red)** —
blue is reserved for the brand chrome and never used to indicate status.

## Typography

- Font stack: **Dubai** (primary display + body, self-hosted via CDN),
  fallback IBM Plex Sans Arabic → Inter → system
- Monospace (numbers): **JetBrains Mono**
- Display class: `.display-tight` with `letter-spacing: -0.02em`
- Numeric class: `.num` with `font-variant-numeric: tabular-nums`

## Spacing / layout

- 4 px baseline via Tailwind default scale
- Container `max-w-6xl` for workspace, `max-w-4xl` for the published
  dashboard (widens to `max-w-6xl` in presenter mode)
- Mobile-first paddings: `px-4 py-5 sm:px-6 sm:py-8` (workspace shell)

## RTL

- `dir="rtl"` set on the root when locale is `ar`
- Tailwind logical properties used (`ps-*`, `pe-*`, `ms-*`, `me-*`,
  `start-*`, `end-*`) — no hard-coded `left-*` / `right-*` for content
  paddings

## Print

- `@page { size: A4 portrait; margin: 12mm 14mm; }`
- Utility class `.no-print` hides chrome
- Published view header switches from gradient navy to white on print

## Mobile-first hooks (globals.css)

```css
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
@media (max-width: 640px) {
  button, [role="button"], a { min-height: 40px; }
}
```

## Component primitives

| Primitive | File | Notes |
|---|---|---|
| `<Section>` + `<Empty>` | `src/components/ui/section.tsx` | Unified card chrome (radius, header, action slot); replaces earlier `<Card>` / `<CardHeader>` / `<CardTitle>` pattern |
| `<Button>` | `src/components/ui/button.tsx` | Variants `primary` / `secondary` / `ghost` / `danger`, sizes `sm` / `md` / `lg` |
| `<Input>` `<Label>` `<Select>` `<Textarea>` | `src/components/ui/*` | Minimal form controls |
| `<StatusDot>` `<PulseDot>` | `src/components/ui/status-dot.tsx`, `src/components/motion/pulse-dot.tsx` | Status indicator; pulse for active |
| `<CountUp>` | `src/components/motion/count-up.tsx` | Number roll for landing stats |
| `<FadeIn>` `<Stagger>` `<StaggerItem>` | `src/components/motion/*` | Motion presets |
| `<Wordmark>` + `<ApertureMark>` | `src/components/branding/*` | Brand mark (hexagonal aperture with gold focus dot) |
| `<LocaleToggle>` | `src/components/branding/locale-toggle.tsx` | EN / AR segmented control |
| `<Toast>` + `useToast()` | `src/components/ui/toast.tsx` | Non-blocking notifications |
| `<SimpleMarkdown>` | `src/components/markdown/simple-markdown.tsx` | Constrained markdown (headings, bold, paragraphs) for briefs |
| `<FactItem>` | `src/components/facts/fact-item.tsx` | Single fact card with citation + verify toggle; shared between Extract and Published views |
| `<MetricRing>` | `src/components/data-viz/metric-ring.tsx` | Zero-dep SVG donut, locale-aware percentage |
| `<ConfidenceBar>` | `src/components/data-viz/confidence-bar.tsx` | Stacked bar for HIGH/MEDIUM/LOW distribution |
| `<AgentPanel>` | `src/components/agents/agent-panel.tsx` | Tabbed 7-agent view |
| `<InstallPrompt>` | `src/components/pwa/install-prompt.tsx` | PWA install banner (bilingual, week-long snooze) |
| `<OfflineBanner>` | `src/components/pwa/offline-banner.tsx` | Slim status bar when `!navigator.onLine` |

## Pipeline stage components

Under `src/app/(app)/projects/[id]/_pipeline/`:

- `stage-tabs.tsx` — segmented control for the 4 stages
- `upload-card.tsx` — drop zone + document list with parse-error chips
- `ai-engine-card.tsx` — model picker with elapsed timer + retry button + driver-bug callout
- `extract-card.tsx` — grouped fact list with agent panel below
- `brief-card.tsx` — audience picker + bilingual composer output
- `publish-card.tsx` — 5-point quality gate + publish/print controls

## Motion rules

- Duration ≤ 0.35 s for view transitions
- `ease: [0.22, 1, 0.36, 1]` (cubic-out) for content
- Spring `stiffness: 320, damping: 18` for tap/hover interactions
- Everything respects `prefers-reduced-motion` via Tailwind's `motion-safe:`

## Accessibility conventions

- Real semantic elements: `<button>` for actions, `<a>` for navigation
- `aria-pressed` on segmented toggles, `aria-current` on active nav
- `role="status"` + `sr-only` label on Suspense loaders
- `role="dialog"` + `aria-modal` + ESC-to-close + focus trap on modals
  (see `IosSheet`)
- Colour never carries meaning alone — icons and text reinforce it

## Explicit non-goals

- No dark mode (executive dashboards are print-first, light-first)
- No blue for status (traffic-light rule)
- No decorative animations that don't communicate state change
- No dashboards inside dashboards (one primary action per screen)
