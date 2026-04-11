# Stelo Design System — "Celestial Mission Control"

## Brand Identity
- **Name:** Stelo (formerly StellarPOD)
- **Tagline:** "Instant settlement. On-chain proof."
- **Voice:** Direct, trustworthy, space-themed but not cheesy

## Colors

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#121317` | Page background |
| `surface-container-low` | `rgba(31,31,36,0.8)` | Cards, panels (glassmorphism) |
| `on-surface` | `#e3e2e8` | Primary text |
| `on-surface-variant` | `#c4c3cb` | Secondary text, labels |

### Brand Gradient
```css
.stellar-gradient {
  background: linear-gradient(135deg, #0b1e3f 0%, #6366f1 50%, #22d3ee 100%);
}
```
Use for: hero sections, active step indicators, primary CTAs, revenue highlights.
Do NOT use for: body text, small elements, backgrounds of content-dense sections.

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Indigo | `#6366f1` | Primary accent, links, active states |
| Cyan | `#22d3ee` | Secondary accent, success indicators, USDC amounts |
| Amber | `#f59e0b` | Warnings, pending states |
| Red | `#ef4444` | Errors, destructive actions, disputes |
| Green | `#22c55e` | Success, completed, released |

## Typography
- **Primary:** Space Grotesk (Google Fonts)
- **Mono:** System monospace (wallet addresses, tx hashes, code)
- **Headline:** `.font-headline` (Space Grotesk bold/extrabold)
- **Section headers:** uppercase, `tracking-widest`, `text-sm`, `font-bold`
- **Body:** `text-sm` default, `text-xs` for hints and metadata

## Spacing
- Card padding: `p-6` (default), `p-8` (large cards like escrow timeline)
- Section gap: `gap-6` between cards/sections
- Inner gap: `gap-3` to `gap-4` within cards
- Border radius: `rounded-2xl` for cards, `rounded-lg` for inputs, `rounded-full` for pills

## Components

### Glass Panel (primary card)
```css
.glass-panel {
  background: rgba(31, 31, 36, 0.8);
  backdrop-filter: blur(12px);
}
```
Or use `bg-surface-container-low rounded-2xl` with Tailwind.

### Status Pills
Use `StatusPill` component with color-coded backgrounds:
- `bg-indigo-500/20 text-indigo-200` — active/in-progress
- `bg-green-400/20 text-green-200` — success/completed
- `bg-amber-400/20 text-amber-200` — warning/pending
- `bg-red-500/20 text-red-300` — error/failed

### Icons
Material Symbols Outlined. `font-variation-settings: "FILL" 0, "wght" 400`.
Use `text-sm` (16px) inline, `text-base` (20px) for buttons.

## Patterns

### Empty States
Every empty state must have:
1. An icon (Material Symbols, muted color)
2. A warm message (not just "No items found")
3. A primary action button
4. Context: why is this empty and what can the user do?

### Error States
- Red-tinted glass panel: `bg-red-500/10 border border-red-400/20 text-red-300`
- Bold error title + muted description
- Recovery action if applicable

### Loading States
- Skeleton pulse for content areas
- Spinner for buttons during submission
- Never show blank space while loading

### Escrow Visual Language
The escrow timeline is the product's signature UI:
- Horizontal stepper with gradient-filled circles for completed steps
- Clickable tx hash links to Stellar Explorer
- The timeline should always be the most prominent element on the order detail page

## Responsive
- Mobile-first Tailwind: `sm:`, `md:`, `lg:` breakpoints
- Cards stack vertically on mobile
- Dashboard hero: text-only on mobile, CTA buttons below
- Tables: horizontal scroll on mobile, or convert to card list
- Touch targets: minimum 44px

## Accessibility
- Color contrast: all text meets WCAG AA (4.5:1 for small text)
- Keyboard navigation: all interactive elements focusable
- Focus indicator: `ring-2 ring-indigo-400`
- Screen reader: ARIA labels on icon-only buttons
- Motion: respect `prefers-reduced-motion`
