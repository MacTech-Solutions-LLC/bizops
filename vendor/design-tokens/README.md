# @mactech-solutions-llc/design-tokens

Design tokens for the MacTech Suite. Four moods. One Tailwind preset. Eight font bundles. Zero application code.

## What's in the box

| Export | What it is |
|---|---|
| `mactechPreset` | Tailwind v3 preset wiring `mt-*` utilities (color, font, radius, shadow, easing) to CSS variables. |
| `vividFonts` / `quietFonts` / `editorialFonts` / `brutalistFonts` | `next/font/google` bundles per mood. |
| `Mood` / `moods` | TypeScript union and runtime list of mood names. |
| `./moods/<name>.css` | One CSS file per mood. Importing it declares `--mt-*` variables on `:root` (vivid) or `[data-mt-mood="<name>"]` (others). |

## Install

```bash
npm install @mactech-solutions-llc/design-tokens
```

The package lives on GitHub Packages under the `@mactech-solutions-llc` scope. Apps need an `.npmrc`:

```
@mactech-solutions-llc:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## Use it (build time — single mood per app)

```ts
// tailwind.config.ts
import { mactechPreset } from "@mactech-solutions-llc/design-tokens";
export default {
  presets: [mactechPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};
```

```css
/* app/globals.css — pick one mood */
@import "@mactech-solutions-llc/design-tokens/moods/vivid.css";
```

```tsx
// app/layout.tsx
import { vividFonts } from "@mactech-solutions-llc/design-tokens";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mt-mood="vivid">
      <body
        className={`${vividFonts.sans.variable} ${vividFonts.mono.variable} ${vividFonts.serif.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
```

## Use it (runtime — multiple moods on one page)

Import all 4 mood CSS files. Toggle the active mood by setting `data-mt-mood` on `<html>` or any ancestor.

```css
/* globals.css */
@import "@mactech-solutions-llc/design-tokens/moods/vivid.css";
@import "@mactech-solutions-llc/design-tokens/moods/quiet.css";
@import "@mactech-solutions-llc/design-tokens/moods/editorial.css";
@import "@mactech-solutions-llc/design-tokens/moods/brutalist.css";
```

```tsx
document.documentElement.dataset.mtMood = "editorial";
```

## Use it (route-scoped mood)

The Vivid Command Center route in `mactech-suite-platform` scopes the mood to a single layout subtree:

```tsx
// app/(admin)/command-center/layout.tsx
import { vividFonts } from "@mactech-solutions-llc/design-tokens";
import "@mactech-solutions-llc/design-tokens/moods/vivid.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-mt-mood="vivid"
      className={`${vividFonts.sans.variable} ${vividFonts.mono.variable} ${vividFonts.serif.variable}`}
    >
      {children}
    </div>
  );
}
```

## Variable reference

Every mood declares the same set of variables. Component code reads from these — never hardcode hex.

| Group | Variables |
|---|---|
| Backgrounds | `--mt-bg`, `--mt-bg-2`, `--mt-bg-3` |
| Surfaces | `--mt-surface-1` … `--mt-surface-4` |
| Hairlines | `--mt-hairline`, `--mt-hairline-2`, `--mt-hairline-3` |
| Text | `--mt-text`, `--mt-text-2`, `--mt-text-3`, `--mt-text-4` |
| Accents | `--mt-accent`, `--mt-accent-2`, `--mt-accent-3`, `--mt-on-accent` |
| Status | `--mt-success`, `--mt-warning`, `--mt-danger` |
| Glow | `--mt-glow`, `--mt-glow-2`, `--mt-soft-accent` |
| Radii | `--mt-radius-1` … `--mt-radius-4` |
| Fonts | `--mt-font-sans`, `--mt-font-mono`, `--mt-font-serif` |
| Easing | `--mt-ease-out`, `--mt-ease-spring`, `--mt-ease-in-out` |
| Mesh BG | `--mt-mesh-1`, `--mt-mesh-2`, `--mt-mesh-3` |

## Tailwind utilities

The preset turns each variable into a utility:

- `bg-mt-bg`, `bg-mt-surface-2`
- `text-mt-text`, `text-mt-accent`
- `border-mt-hairline`
- `rounded-mt-3`
- `font-mt-mono`
- `shadow-mt-glow`
- `ease-mt-spring`

## Mood characteristics

| Mood | Vibe | When to use |
|---|---|---|
| **Vivid** | Deep-black, cyan/violet/magenta, gradient mesh, gentle motion | Internal admin surfaces (Command Center, EnclaveWatch) |
| **Quiet** | Off-white, indigo accent, sharp typography, minimal motion | Document-centric apps (Quality, Governance, Proposal) |
| **Editorial** | Warm beige, terracotta accent, Fraunces serif | Long-form content (Training, clearD, Vetted) |
| **Brutalist** | Pure black/white/orange, JetBrains Mono everywhere, no easing | Internal tools, debug surfaces, opinionated demos |

## License

UNLICENSED — internal use only.
