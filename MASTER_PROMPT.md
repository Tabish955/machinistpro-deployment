# MachinistPro — Complete Master Build Prompt

> **What this is:** a full, self-contained specification for building MachinistPro
> from nothing. It names every screen, every formula, every table, every rule and
> every guard the app relies on. An AI agent given this document and no other
> context should be able to produce the working product.
>
> **How to use it:** read Part 0 for build order, then build in that order.
> Sections 1–8 are the foundation (setup, design system, components, state).
> Sections 9–12 are the licensing backend. Sections 13–31 are the feature
> modules — each is independently buildable and independently testable.

---

# PART 0 — HOW TO BUILD THIS

## 0.1 Build order

1. **Scaffold** — Vite + TanStack Start + TypeScript + Tailwind v4 (§2)
2. **Design system** — `styles.css` with all tokens, utilities, animations, print rules (§4)
3. **Component library** — Button, Card, Badge, Input, Dialog, PageHeader, SectionHeader, ResultCard family, Toast (§5)
4. **State stores** — Zustand stores for auth, app, theme, history, toast, calculator, converter, workspace (§6)
5. **Core services** — history, clipboard, formatting, validation, backup (§7)
6. **Shell** — root route, sidebar, header, bottom nav, protected route, splash, cursor, copy protection (§8)
7. **Database** — Supabase tables + RLS (§9)
8. **Auth + licensing + trial** — password hashing, sessions, device HWID, trial anti-bypass (§10, §11)
9. **API routes & server functions** (§12)
10. **Module registry** (§13) — then every module in §14–§31, each with its engine + tests + page
11. **Admin panel** (§32)
12. **Public pages** (§33)
13. **Deployment** (§34)

## 0.2 Rules that apply to every line of this build

1. **Correctness before features.** Every formula is the real textbook or
   standards-body formula, in correct units. A wrong number in a machine shop
   scraps a part, breaks a tool, or hurts someone. If a formula cannot be
   implemented correctly, leave the feature out rather than approximate it.
2. **Every engine has Vitest tests.** Test files live next to the engine
   (`engine.ts` → `engine.test.ts`). Cover: known-good textbook values, edge
   cases, unit round-trips, invalid input, and cross-module consistency (the
   same material density must give the same weight everywhere it is used).
3. **Units are explicit, always.** Every input and every output carries its unit
   on screen. Metric and imperial are both first-class. Conversions use exact
   constants (25.4, 0.3048, 0.4536…), never rounded intermediates.
4. **Never render `NaN`, `Infinity`, or a blank result.** Formatters return an
   em-dash `—` for non-finite values. Invalid input produces a plain-language
   message beside the field, in the words a machinist would use.
5. **Engines are pure.** No DOM, no React, no browser APIs inside `src/lib/**`
   engine files, so everything is testable in Node. UI concerns (unit toggles,
   formatting choices) live at the page boundary.
6. **All engineering maths and all file parsing happen on the device.** Nothing
   about a user's parts, drawings, or programs is ever uploaded.
7. **The server exists only for auth, licensing, trials, and admin.** The
   Supabase service-role key is server-only and must never enter the client bundle.
8. **Comments explain *why*, not *what*.** Where a non-obvious decision was made
   — a route name kept for deep links, one formula variant chosen over another,
   a guard added after a real fault — say so in a comment. Never restate code.

---

# PART 1 — THE PRODUCT

## 1.1 What it is

**MachinistPro** — a premium, subscription-licensed engineering calculator suite
for the web. Everything a machinist would otherwise look up in Machinery's
Handbook, on a chart taped to the wall, or across three separate apps, in one
dark instrument-panel dashboard that works on a phone at the machine and
full-width on an office desktop.

- **Tagline:** *Precision tools for modern machinists.*
- **Positioning:** *A premium engineering calculator suite built for fabrication
  shops, CNC operators, mechanical engineers, and technical students. Every tool
  you need, in one place.*
- **Version pill on the landing page:** `v1.0.0-rc1 — Now Available`

## 1.2 Who it is for

Fabrication shops, CNC operators and setters, mechanical engineers, tool and
die makers, welders, maintenance electricians, and technical students.

## 1.3 Commercial model

Licence-gated, **not** freemium and **not** self-serve:

- A visitor gets one **14-day free trial, locked to their device**, with no
  account required.
- To buy, they message the operator on **WhatsApp (+92 314 2839944)**; the
  operator issues them a username and password from the **admin panel**.
- There is **no sign-up form and no payment processor** anywhere in the app.

## 1.4 What it is not

**There is no AI, no LLM, and no external API in this product.** Every number it
shows is computed locally from engineering formulas and standards tables written
in TypeScript. Do not add an AI feature, a chat assistant, or a cloud compute
call.

---

# PART 2 — STACK AND PROJECT SETUP

## 2.1 Dependencies

**Framework and build**

```
@tanstack/react-start, @tanstack/react-router, @tanstack/router-plugin,
@tanstack/react-query, react ^19, react-dom ^19, vite ^8, vite-tsconfig-paths,
typescript ^5.8, nitro (dev dep)
```

**Styling**

```
tailwindcss ^4, @tailwindcss/vite, tw-animate-css, clsx, tailwind-merge,
class-variance-authority
```

**UI**

```
@radix-ui/react-{accordion,alert-dialog,aspect-ratio,avatar,checkbox,collapsible,
context-menu,dialog,dropdown-menu,hover-card,label,menubar,navigation-menu,popover,
progress,radio-group,scroll-area,select,separator,slider,slot,switch,tabs,toggle,
toggle-group,tooltip}
lucide-react, sonner, cmdk, vaul, embla-carousel-react, react-day-picker,
react-resizable-panels, input-otp, recharts, date-fns
```

**Data / logic**

```
zustand ^5, react-hook-form, @hookform/resolvers, zod ^3, mathjs ^15,
pdfjs-dist ^6, @supabase/supabase-js ^2, @noble/hashes ^2
```

**Tooling**

```
vitest ^4, eslint ^9, typescript-eslint, eslint-plugin-{prettier,react-hooks,react-refresh},
eslint-config-prettier, prettier ^3, @types/{node,react,react-dom}
```

## 2.2 Scripts

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

Package name `machinist-pro`, `"type": "module"`, `"private": true`,
`"sideEffects": false`. Path alias `@/*` → `src/*` in both `tsconfig.json` and
via `vite-tsconfig-paths`.

## 2.3 File structure

```
src/
├─ components/
│  ├─ auth/protected-route.tsx
│  ├─ calculator/{index,mode-selector,premium-calculator,premium-display,
│  │              premium-keypad,history-panel,advanced-workspaces}.tsx
│  ├─ cnc/{backplot,simulation}.tsx
│  ├─ dashboard/module-card.tsx
│  ├─ layout/{header,sidebar,bottom-nav,info-page}.tsx
│  ├─ level/vials.tsx
│  ├─ shared/result-card.tsx
│  ├─ ui/{analytics,badge,button,card,client-providers,copy-protection,
│  │      custom-cursor,dialog,input,logo,page-header,search,section-header,
│  │      skeleton,splash-loader,toast}.tsx
│  ├─ workspace/{add-from-history,project-report}.tsx
│  ├─ site-notice.tsx
│  └─ trial-banner.tsx
├─ config/modules.ts                      ← single module registry
├─ hooks/{use-copy,use-device-trial,use-mobile}.ts
├─ integrations/supabase/{client,client.server,auth-attacher,auth-middleware,types}.ts
├─ lib/
│  ├─ cad/{registry,dxf-import,pdf-import,stl-import,gcode-import,centerline}.ts
│  ├─ calculator/{engine,parser,tokenizer,functions,advanced,constants,types}.ts
│  ├─ cnc/{parse,check,cycles,g71,toolpaths,simulate}.ts
│  ├─ converter/{units,engine,search,types}.ts
│  ├─ core/{constants,format,formula-engine,history,math-symbols,validate}.ts
│  ├─ electrical/{formulas,sizing,tables,edm}.ts
│  ├─ engdb/{materials,threads,drills,cutting}.ts
│  ├─ engineering/formulas.ts
│  ├─ formulas/{database,database-extended,search,types}.ts
│  ├─ geometry/{shapes2d,shapes3d,coord,units}.ts
│  ├─ industrial/formulas.ts
│  ├─ level/{level,orientation}.ts
│  ├─ machining/{engine,tapping,speed-overrides,data,types}.ts
│  ├─ materials/{database,shapes,engine,gauge,custom,diagrams,types}.ts
│  ├─ tap-drill/{data,engine}.ts
│  ├─ tolerances/{iso-fits,gdt,surface}.ts
│  ├─ workspace/{types,report}.ts
│  ├─ backup/manager.ts
│  ├─ {admin,site,trial}.functions.ts     ← server functions
│  ├─ {session-server,device-server,password,fingerprint}.ts
│  ├─ {clipboard,dxf-converter,next-compat,support,utils}.ts
│  └─ {error-capture,error-page,lovable-error-reporting}.ts
├─ pages/                                  ← page components
│  ├─ dashboard/{index,admin,cnc,converter,dxf-converter,electrical,engineering,
│  │             favorites,formulas,geometry,history,industrial,layout,level,
│  │             machining,materials,pricing,scientific,settings,tap-drill,
│  │             tolerances,weight,workspace}.tsx
│  └─ {home,login,about,contact,faq,privacy,terms}.tsx
├─ routes/                                 ← thin file-based route wrappers
│  ├─ __root.tsx, index.tsx, login.tsx, about.tsx, contact.tsx, faq.tsx,
│  │  privacy.tsx, terms.tsx
│  ├─ api/health.ts
│  ├─ api/auth/{login,logout,session,health}.ts
│  └─ dashboard/{route,index,...one per page}.tsx
├─ store/{app,auth,calculator,converter,history,theme,toast,workspace}-store.ts
├─ router.tsx, server.ts, start.ts, styles.css
└─ routeTree.gen.ts                        ← generated, never hand-edit or format
```

Each `src/routes/**` file is a thin wrapper:
`createFileRoute("/dashboard/x")({ component: XPage })` importing the real page
from `src/pages/**`. Keeping pages out of the route tree means routes can move
without touching page code.

---

# PART 3 — DESIGN SYSTEM

## 3.1 Mood

Dark, high-contrast, instrument panel. Glass panels, hairline borders, neon
accent glows, monospace numerals. Premium and technical, never playful. Numbers
are the hero of every screen.

## 3.2 Tokens — `src/styles.css`

```css
@import "tailwindcss";

@theme {
  --color-dark-990: #020204;
  --color-dark-950: #050508;
  --color-dark-900: #0a0a10;
  --color-dark-800: #10101a;
  --color-dark-700: #181825;
  --color-dark-600: #1e1e30;
  --color-dark-500: #2a2a3d;
  --color-dark-400: #3a3a52;
  --color-dark-300: #52526e;
  --color-dark-200: #6e6e8a;

  --color-accent-cyan:   #00d4ff;
  --color-accent-blue:   #3b82f6;
  --color-accent-purple: #8b5cf6;
  --color-accent-green:  #10b981;
  --color-accent-amber:  #f59e0b;
  --color-accent-red:    #ef4444;

  --color-glass-white:  rgba(255, 255, 255, 0.04);
  --color-glass-border: rgba(255, 255, 255, 0.08);
  --color-glass-hover:  rgba(255, 255, 255, 0.06);

  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Base: `html { scroll-behavior: smooth; cursor: none; }`,
`body { background: var(--color-dark-950); color: #e4e4eb; font-family: var(--font-sans);
-webkit-font-smoothing: antialiased; cursor: none; user-select: none; }`

Text selection is re-enabled only on `input, textarea, select,
[contenteditable="true"], .allow-select`.

## 3.3 Utility classes to define

| Class | Effect |
|---|---|
| `.glass-card` | `background: glass-white`, `1px solid glass-border`, `backdrop-filter: blur(16px)`; hover raises to `glass-hover` and border to `rgba(255,255,255,.12)` |
| `.glow-cyan/blue/purple/green/amber` | `box-shadow: 0 0 20px rgba(accent,.15), 0 0 60px rgba(accent,.05)` |
| `.gradient-bg` | three radial ellipses: cyan .04 at 20%/50%, purple .04 at 80%/20%, blue .03 at 50%/80% |
| `.grid-pattern` | crossed 1px white .015 lines on a 50px grid |
| `.blueprint-pattern` | cyan .03 lines on 100px + cyan .015 on 20px |
| `.text-gradient` | 135° cyan → blue → purple, clipped to text |
| `.border-gradient` | dark-800 padding-box over a cyan/purple 135° border-box |
| `.noise-overlay` | `::before` fractal-noise SVG data URI at 3% opacity, `mix-blend-mode: overlay` |
| `.scrollbar-none` | hides scrollbars cross-browser |
| `.line-clamp-1/2/3` | webkit line clamping |
| `.pb-safe` | `padding-bottom: env(safe-area-inset-bottom, 0)` |
| `.calc-button-glow` | `inset 0 1px 0 rgba(255,255,255,.05), 0 2px 8px rgba(0,0,0,.3)` |
| `.calc-display-glow` | `inset 0 2px 4px rgba(0,0,0,.3), 0 0 40px rgba(0,212,255,.03)` |
| `.stagger-1…8` | `animation-delay` 0.05s → 0.4s |

Scrollbars: 6px, track `dark-900`, thumb `dark-500` (hover `dark-400`), 3px radius.

Focus ring on inputs and `button:focus-visible`:
`box-shadow: 0 0 0 2px var(--color-dark-950), 0 0 0 4px rgba(0,212,255,.4)`.

## 3.4 Animations to define

`pulse-glow` (2s opacity .4↔1), `shimmer` (1.5s sliding gradient for skeletons),
`fade-in` (.4s, 8px rise), `fade-in-up` (.5s, 16px rise), `scale-in` (.3s from .95),
`slide-in-left` / `slide-in-right` (.3s, 16px), `slide-up` (.3s from 100%),
`bounce-subtle` (2s, 4px), `rotate` (8s linear), `ripple` (.6s scale to 100),
`shake` (.5s ±4px, for errors).

## 3.5 Custom cursor

`cursor: none` globally. Two fixed elements at `z-index: 99999`,
`pointer-events: none`, `transform: translate(-50%,-50%)`:

- `.cursor-dot` — 8px cyan disc with `0 0 10px cyan, 0 0 30px rgba(0,212,255,.3)`
- `.cursor-ring` — 36px, `1.5px solid rgba(0,212,255,.4)`; `.hover` → 50px and
  70% border; `.clicking` → 28px and full cyan

**Both are hidden and native cursors restored** under
`@media (hover: none) and (pointer: coarse)`.

## 3.6 Copy protection

A `CopyProtection` component attaching document listeners:

- `contextmenu` — prevented, except on INPUT / TEXTAREA / SELECT / contentEditable
- `copy` — prevented, with the same exceptions
- `keydown` — on non-inputs, block `Ctrl/Cmd+C` and `Ctrl/Cmd+A`; block `F12` and
  `Ctrl/Cmd+Shift+I` everywhere

CSS support: `::selection { background: transparent }`, `img, svg` get
`-webkit-user-drag: none; pointer-events: none` (re-enabled for
`svg.interactive`, `button svg`, `a svg`), and `* { -webkit-touch-callout: none }`.

## 3.7 Light theme

Toggled by adding `class="light"` and `data-theme="light"` to `<html>`. Light
mode **flips the palette tokens** so every existing utility keeps working with no
markup change — including inverting the neutral text scale so `text-white` and
`text-gray-*` stay readable:

```css
html.light {
  --color-dark-990:#eef1f7; --color-dark-950:#f6f7fb; --color-dark-900:#ffffff;
  --color-dark-800:#f2f4f9; --color-dark-700:#e5e8f0; --color-dark-600:#d7dbe6;
  --color-dark-500:#c2c8d8; --color-dark-400:#a3abc0; --color-dark-300:#7d859b;
  --color-dark-200:#5d6478;

  --color-accent-cyan:#0284a8;  --color-accent-blue:#2563eb;
  --color-accent-purple:#7c3aed; --color-accent-green:#047857;
  --color-accent-amber:#b45309;  --color-accent-red:#dc2626;

  --color-glass-white: rgba(15,23,42,.03);
  --color-glass-border: rgba(15,23,42,.10);
  --color-glass-hover: rgba(15,23,42,.06);

  --color-white:#0b1020; --color-black:#ffffff;
  --color-gray-50:#1e293b;  --color-gray-100:#1f2937; --color-gray-200:#263243;
  --color-gray-300:#2f3a4d; --color-gray-400:#3d4859; --color-gray-500:#4b5563;
  --color-gray-600:#5b6577; --color-gray-700:#6b7280; --color-gray-800:#94a3b8;
  --color-gray-900:#cbd5e1; --color-gray-950:#e2e8f0;
}
html.light body { background: var(--color-dark-950); color: #0f172a; }
```

## 3.8 Print stylesheet — required, not optional

The app is dark and browsers do not print backgrounds, so a naive print gives a
blank sheet with the sidebar shovelled in beside it. Printing is treated as its
own medium:

```css
@media print {
  @page { size: A4 portrait; margin: 16mm 14mm; }

  html, body { background:#fff!important; color:#000!important;
               height:auto!important; overflow:visible!important; cursor:auto!important; }

  body * { visibility: hidden; }                    /* not display:none —
     visibility keeps ancestors in place so the sheet stays where layout put it */

  body *, body *::before, body *::after {
    animation:none!important; transition:none!important; transform:none!important;
  }   /* a lingering transform would become the containing block for the
         absolutely-positioned sheet and start it partway down the page */

  .print-document, .print-document * { visibility: visible; }

  .print-document {
    position:absolute; inset:0 auto auto 0; width:100%; margin:0; padding:0;
    background:#fff!important; color:#000!important; font-size:10.5pt; line-height:1.45;
  }

  .print-document *, .print-document *::before, .print-document *::after {
    background:transparent!important; background-image:none!important;
    box-shadow:none!important; text-shadow:none!important; color:#000!important;
    border-color:#9aa0aa!important; filter:none!important; backdrop-filter:none!important;
  }

  .print-hide, .cursor-dot, .cursor-ring { display:none!important; }

  .print-document thead { display: table-header-group; }
  .print-document tr, .print-document .avoid-break { break-inside: avoid; }
  .print-document .page-break { break-before: page; }

  .print-document table { width:100%; border-collapse:collapse; }
  .print-document th, .print-document td {
    border:1px solid #9aa0aa!important; padding:4px 6px; text-align:left; vertical-align:top;
  }
  .print-document th { font-weight:700; background:#eceff3!important;
                       print-color-adjust: exact; }
  .print-document a[href]::after { content: ""; }
}
```

## 3.9 Module accent colours

Eight accents: `cyan, blue, purple, green, amber, red, pink, orange`. Each maps
to a 4-part style record used everywhere a module is rendered:

```ts
{ bg: "bg-accent-cyan/10", border: "border-accent-cyan/20",
  text: "text-accent-cyan", glow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]" }
```

`pink` and `orange` use `pink-500` / `orange-500` with `text-pink-400` /
`text-orange-400`.

---

# PART 4 — COMPONENT LIBRARY

Build these first; every page depends on them.

## 4.1 `Button`

```ts
variant: "primary" | "secondary" | "ghost" | "danger"   // default "primary"
size: "sm" | "md" | "lg"                                 // default "md"
loading?: boolean    // shows a spinning SVG in place of the icon, disables
icon?: ReactNode     // leading icon
```

- primary: `bg-gradient-to-r from-accent-cyan to-accent-blue text-dark-950
  font-semibold hover:brightness-110 active:brightness-95 shadow-lg shadow-accent-cyan/10`
- secondary: `bg-dark-600 text-white border border-dark-400 hover:bg-dark-500 hover:border-dark-300`
- ghost: `bg-transparent text-gray-300 hover:bg-dark-700 hover:text-white`
- danger: `bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20`
- sizes: sm `px-3 py-1.5 text-xs rounded-md gap-1.5`, md `px-4 py-2.5 text-sm rounded-lg gap-2`,
  lg `px-6 py-3 text-base rounded-lg gap-2.5`
- base: `inline-flex items-center justify-center font-medium transition-all
  duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`

## 4.2 `Card`

```ts
variant: "glass" | "solid" | "outline"      // default "solid"
glow: "cyan" | "blue" | "purple" | "none"   // default "none"
padding: "sm" | "md" | "lg"                 // p-3 / p-5 / p-7
hoverable?: boolean                          // hover:scale-[1.01] hover:brightness-110
```

`solid` = `bg-dark-800 border border-dark-600`; `outline` = transparent with
`border-dark-500`; base `rounded-xl transition-all duration-300`.

## 4.3 `Badge`

Colours cyan/blue/purple/green/amber/red/gray, each `bg-accent-X/10
text-accent-X border-accent-X/20`; gray = `bg-dark-500/50 text-gray-400
border-dark-400`. Shape: `inline-flex items-center gap-1 rounded-full border
px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider`.

## 4.4 `Input`

`forwardRef`, props `label?`, `error?`, `icon?`. Label is
`text-xs font-medium text-gray-400 uppercase tracking-wider`. Field is
`w-full rounded-lg border border-dark-400 bg-dark-800 px-4 py-2.5 text-sm
text-white placeholder:text-gray-600 hover:border-dark-300
focus:border-accent-cyan/50`, `pl-10` when an icon is present,
`border-accent-red/50` when errored. Error text `text-xs text-accent-red`.

## 4.5 `PageHeader`

```ts
{ title, description?, icon?, iconColor?: ModuleColor, status?: ModuleStatus,
  backHref = "/dashboard", actions? }
```

Renders a ghost **Back** button, a tinted icon tile (`bg-accent-X/10 p-2.5
rounded-xl`), the title as `text-lg font-bold text-white`, a status Badge
(`available`→green "Available", `beta`→purple "Beta", `coming-soon`→gray
"Coming Soon", `locked`→amber "Locked"), the description as `text-xs
text-gray-500`, and right-aligned `actions`.

## 4.6 `SectionHeader`

`{ title, description?, icon?, action?: { label, href? | onClick? } }`. Title is
`text-sm font-semibold text-gray-300 uppercase tracking-wider`; the action is a
right-aligned link/button with a `ChevronRight`.

## 4.7 Result primitives (`shared/result-card.tsx`)

- **`ResultRow`** `{ label, value, unit?, accent? }` — flex row, label
  `text-xs text-gray-500` left, value `text-sm font-mono` right (cyan and
  semibold when `accent`), unit as a smaller grey suffix, bottom border except
  on the last row.
- **`CopyButton`** `{ text }` — uses a `useCopy()` hook exposing
  `{ copied, failed, copy }`. Shows `Copy` → `Check` (green) on success →
  `X` (red) on failure with the title *"Nothing was copied — the clipboard is
  unavailable here"*. Never claim success when the clipboard API failed.
- **`FormulaDisplay`** `{ formula, steps? }` — a collapsible "Formula" disclosure
  that reveals the expression in cyan monospace plus optional worked steps
  (`description: expression = result`). Every calculated result should offer this.
- **`UnitToggle`** `{ value, onChange, options }` — segmented pill group,
  active option `bg-accent-cyan/20 text-accent-cyan`.
- **`MaterialSelector`** `{ materials, value, onChange }` — labelled native
  `<select>` styled `bg-dark-900 border-dark-600 rounded-xl`.

## 4.8 Other shell components

- **`Logo`** — sizes sm/md/lg, wordmark + mark.
- **`Skeleton`** — `animate-shimmer` block.
- **`Dialog`** — Radix dialog, dark glass panel, used for all confirmations.
- **`ToastContainer`** — renders the toast store; success/error/info/warning.
- **`SplashLoader`** — full-screen brand loader with a progress bar, shown only
  when `sessionStorage.mp_loaded` is unset, then fades out and sets the flag.
- **`CustomCursor`** — dot + ring following pointer, `.hover` on interactive
  elements, `.clicking` on mousedown.
- **`AnalyticsScript`** — injects GA `gtag` only when `VITE_GA_ID` is set.
- **`InfoPage`** — shared layout for about/faq/privacy/terms/contact.
- **`ModuleCard`** — dashboard grid tile: icon in an accent tile, name,
  description, status badge, module glow on hover.

---

# PART 5 — STATE STORES (Zustand)

## 5.1 `auth-store`

```ts
interface UserInfo { username; subscription; expiry; sessionToken; isAdmin? }
interface AuthState {
  status: "idle" | "loading" | "authenticated" | "error";
  user: UserInfo | null;
  errorMessage: string;
  setStatus, setUser, setError, clearError;
  logout(opts?: { skipServerCall?: boolean }): Promise<void>;
}
```

`logout` does a **best-effort** `POST /api/auth/logout` with the token, then
always clears `mp_session`, `mp_user`, `mp_trial` from localStorage and resets
state — a transport failure must never trap the user in a signed-in shell.
localStorage access is wrapped in try/catch (private mode, tests).

## 5.2 `app-store`

`{ sidebarOpen: true, mobileSidebarOpen: false, activeModule: "dashboard",
toggleSidebar, toggleMobileSidebar, closeMobileSidebar, setActiveModule }`

## 5.3 `theme-store`

`{ theme: "dark" | "light", setTheme, toggleTheme, hydrate }`, persisted to
`localStorage["mp_theme"]`, applying `document.documentElement.classList.toggle("light")`
and `dataset.theme`. `hydrate()` runs on mount; SSR-safe (returns `"dark"` when
`window` is undefined).

## 5.4 `history-store` (persisted: `machinist-pro-history`)

```ts
entries: HistoryEntry[]
add(module, moduleLabel, title, details, inputs, outputs)
remove(id) · toggleFavorite(id) · clearAll() · clearModule(module)
getByModule(module) · getFavorites() · search(query)
```

`partialize` persists only the first **100** entries; the in-memory cap is **200**.

## 5.5 `toast-store`

```ts
Toast { id, type: "success"|"error"|"info"|"warning", title, message?, duration? }
addToast · removeToast · clearToasts
export const toast = { success, error, info, warning }   // convenience helpers
```

Auto-dismiss after `duration ?? 5000` ms; `duration: 0` pins the toast.

## 5.6 `calculator-store` (persisted)

Holds expression, result, previousResult, angle mode, memory, mode, per-mode
state, and history. Constants: `MAX_HISTORY_SIZE 100`, `MAX_EXPRESSION_LENGTH 500`,
`MAX_UNDO_STACK 50`.

Required behaviours:

- **Undo/redo stores `{ expression, result, previousResult }`**, not the
  expression alone — otherwise redoing past an equals lands on a blank display
  instead of the answer.
- **Every recorded calculation is also written to the shared `history-store`**
  with the mode label ("Standard", "Scientific", …), title
  `"<expression> = <result>"` and details `"Angle mode DEG"`. Without this the
  dashboard History and Favorites pages stay permanently empty.
- **Repeat-equals**: pressing `=` again repeats the last top-level binary
  operation. Detecting it must skip operators inside parentheses and must not
  treat a unary sign — after `(`, after another operator, or the `e`/`E` of an
  exponent — as the repeat operator.

## 5.7 `converter-store` (persisted)

Selected category, from/to unit ids, input value, swap, and recent conversions.

## 5.8 `workspace-store` (persisted)

```ts
projects: Project[]
addProject(name, templateId?) → id
updateProject(id, updates)          // always bumps updatedAt
deleteProject(id) · duplicateProject(id) → id   // name + " (Copy)", isPinned reset
togglePin(id) · archiveProject(id)
addCalcToProject(projectId, calc) · removeCalcFromProject(projectId, calcId)
addVariable · updateVariable · removeVariable
updateNotes(projectId, notes)
importProject(project) → id
getProject · getActiveProjects · getArchivedProjects · getPinnedProjects
```

---

# PART 6 — CORE SERVICES

## 6.1 `core/history.ts`

```ts
interface HistoryEntry {
  id; module; moduleLabel; title; details;
  inputs: Record<string,string>; outputs: Record<string,string>;
  timestamp: number; isFavorite: boolean;
}
createHistoryEntry(...)         // id = `hist-${Date.now()}-${random36}`
addToHistory(list, entry)       // prepend, slice to MAX_HISTORY = 200
toggleFavoriteInHistory(list, id)
getFavorites(list) · searchHistory(list, query) · relativeTime(ts)
```

**Every module writes to history on a successful calculation.** This is the
mechanism that makes History, Favorites, and Workspace work — no module talks to
Workspace directly.

## 6.2 `clipboard.ts`

`copyText(text): Promise<boolean>` — tries `navigator.clipboard.writeText`, falls
back to a hidden textarea + `execCommand`, and **returns false rather than
throwing or lying** when neither is available (common in embedded webviews).
`use-copy.ts` wraps it as `{ copied, failed, copy }` with a ~2s reset.

## 6.3 `core/format.ts` and per-domain `fmt`

Every engine ships a `fmt(n, decimals)` that returns `"—"` for non-finite values,
strips trailing zeros, and switches to exponential outside
`1e-4 … 1e9`. Currency uses `toLocaleString` with 2 fixed decimals.

## 6.4 `core/validate.ts`

Shared numeric guards: required, positive, non-zero, range, integer. Messages are
written for a machinist, e.g. *"Wall thickness (6) must be less than half the
outside diameter (25)."* — never "Invalid input".

## 6.5 `core/math-symbols.ts`

`formatMath(x)` renders `*`→`×`, `sqrt`→`√`, `pi`→`π`, `deg`→`°`, superscripts
for `^2`/`^3`, used by `FormulaDisplay`.

## 6.6 `backup/manager.ts`

```ts
APP_KEYS = [every localStorage key the app owns]
interface BackupData { version; exportedAt; data: Record<string, string|null> }
createBackup() · downloadBackup() · validateBackup(content) → {ok, error?, backup?}
restoreBackup(backup) · clearAllData() · getStorageSize() · formatBytes(bytes)
```

`validateBackup` must reject a JSON file that is not a MachinistPro backup with a
readable reason before any key is overwritten.
---

# PART 7 — APPLICATION SHELL

## 7.1 Root route (`routes/__root.tsx`)

Wraps everything in `QueryClientProvider`, `ClientProviders`, `HeadContent`,
`Scripts`. Renders, in order: `AnnouncementBanner`, `ToastContainer`, `Outlet`.
Provides:

- **404 component** — big `404`, "Page not found", a "Go home" button.
- **Error boundary** — "This page didn't load" with *Try again*
  (`router.invalidate()` + `reset()`) and *Return home*; reports the error via
  `reportLovableError(error, { boundary: "tanstack_root_error_component" })`.

`src/server.ts` wraps the SSR entry to catch **h3-swallowed 500s**: h3 turns an
in-handler throw into a normal JSON 500 body `{"unhandled":true,"message":"HTTPError"}`
that a try/catch never sees. Detect that body shape, log the real captured error,
and return a branded HTML error page instead.

## 7.2 Public shell

Sticky nav, `z-40`, `border-b border-dark-700/40 bg-dark-950/80 backdrop-blur-xl`:
logo left; right side has a green outlined **Buy Subscription** WhatsApp link
(hidden below `sm`) and **Sign In** — or **Dashboard** when authenticated.

## 7.3 Dashboard shell (`routes/dashboard/route.tsx` → `pages/dashboard/layout.tsx`)

Wrapped in `ProtectedRoute`. Layout: `Sidebar` + `Header` + content + `BottomNav`.

**Sidebar** — four collapsible sections built from the module registry:

```ts
const SECTIONS = [
  { key: "calculators", title: "Calculators", items: calculatorModules, defaultOpen: true },
  { key: "reference",   title: "Reference",   items: referenceModules,  defaultOpen: true },
  { key: "workspace",   title: "Workspace",   items: workspaceModules,  defaultOpen: true },
  { key: "system",      title: "System",      items: systemModules,     defaultOpen: true },
];
```

- Section keys are **explicit strings**, never derived from the title by
  `toLowerCase()` — a title gaining a space would silently break the stored state.
- Open/closed state persists to `localStorage["mp_sidebar_sections"]`; the
  initial state is **derived from `SECTIONS`** so a new section can never be
  omitted and default to closed, and stored values are validated as booleans
  against known keys before use.
- Above the sections: a **Dashboard** link, and an **Admin Panel** link rendered
  only when `user.isAdmin`.
- Active route is highlighted; the collapsed rail shows icons with tooltips
  (a truncated label in the open sidebar may be hiding text, so the tooltip
  carries the full name).

**Header** — mobile sidebar toggle, global search, theme toggle (with a title of
"Switch to light/dark theme"), notifications, settings link, sign-out.

> **Trial sign-out confirmation.** If the session is a trial, signing out opens a
> dialog first, with a checkbox acknowledging that the trial keeps running on its
> original clock. Users otherwise assume signing out costs them their remaining
> days and never sign out.

**BottomNav** (mobile only, `pb-safe`):
`Home /dashboard` · `Calc /dashboard/scientific` · `Favorites` · `History` · `Settings`.

## 7.4 `ProtectedRoute`

On mount, validates the session server-side once (guard with a ref so it cannot
double-fire). While checking, render "Verifying session…" with the logo. On
failure, redirect to `/login`.

**It must also handle the authenticated → signed-out transition:** after
`logout()` resets the store, the main effect short-circuits and the component
would otherwise sit on "Verifying session…" forever. Track that the user *was*
authenticated and, when the user becomes null, `router.replace("/login")`
immediately.

## 7.5 Global search

`searchModules(query)` over the registry, scoring:

| Match | Points |
|---|---|
| module name contains the whole query | +100 |
| shortName contains the whole query | +80 |
| any keyword contains a query word | +50 (per word) |
| name+shortName+description+keywords contains a query word | +10 (per word) |

Filter `score > 0`, sort descending.

---

# PART 8 — DATABASE (Supabase Postgres)

All tables have **RLS enabled**, all grants go to `service_role`, and the
sensitive ones carry an explicit deny policy for clients.

```sql
-- ── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text,
  password_hash text NOT NULL,
  subscription text NOT NULL DEFAULT 'Standard',
  expiry_date timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  hwid text,
  allow_multi_device boolean NOT NULL DEFAULT false,
  device_limit integer NOT NULL DEFAULT 1
    CHECK (device_limit >= 1 AND device_limit <= 100),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access app_users"
  ON public.app_users FOR SELECT TO authenticated USING (false);

-- ── Sessions (token hashes only) ────────────────────────────────────────────
CREATE TABLE public.sessions (
  token_hash text PRIMARY KEY,            -- sha256(pepper || '|' || rawToken)
  user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,
  username text NOT NULL,
  subscription text NOT NULL DEFAULT 'Standard',
  expiry_date text,
  is_trial boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  remember_me boolean NOT NULL DEFAULT false,
  hwid text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX idx_sessions_username ON public.sessions(username);
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access sessions"
  ON public.sessions FOR SELECT TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.prune_expired_sessions()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.sessions WHERE expires_at < now() RETURNING 1;
$$;

-- ── Device registry (licence slots) ─────────────────────────────────────────
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  hwid text NOT NULL,
  user_agent text, label text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hwid)
);
CREATE INDEX user_devices_user_id_idx ON public.user_devices(user_id);
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access user_devices"
  ON public.user_devices FOR SELECT TO authenticated USING (false);

-- ── Site settings ───────────────────────────────────────────────────────────
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access app_settings"
  ON public.app_settings FOR SELECT TO authenticated USING (false);

INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance',  '{"enabled": false, "message": "MachinistPro is temporarily under maintenance. Please check back shortly."}'::jsonb),
  ('announcement', '{"enabled": false, "message": ""}'::jsonb);

-- ── Trial anti-bypass ───────────────────────────────────────────────────────
CREATE TABLE public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL UNIQUE,
  ip_hash text, user_agent text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  trial_used boolean NOT NULL DEFAULT false,
  trial_user_id uuid,
  trial_started_at timestamptz,
  trial_expires_at timestamptz
);
CREATE INDEX idx_device_ip_hash ON public.device_fingerprints(ip_hash);

CREATE TABLE public.trial_ip_log (
  ip_hash text PRIMARY KEY,
  trial_count int NOT NULL DEFAULT 0,
  first_trial_at timestamptz NOT NULL DEFAULT now(),
  last_trial_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_trials (
  user_id uuid PRIMARY KEY,
  device_fingerprint_id uuid REFERENCES public.device_fingerprints(id),
  fingerprint_hash text, ip_hash text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
);
-- RLS on all three; service_role only, plus USING(false) selects for clients.

-- ── Profiles (optional user metadata) ───────────────────────────────────────
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, email text, display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- own-row read/insert/update policies for authenticated users.
```

---

# PART 9 — AUTH, LICENSING, TRIALS

This is a **custom licence system**, not Supabase Auth.

## 9.1 Password hashing (`lib/password.ts`)

PBKDF2-SHA256, format `pbkdf2$<iterations>$<saltHex>$<hashHex>`, 16-byte random
salt, 32-byte derived key.

```
ITERATIONS = 100000
MAX_WEBCRYPTO_ITERATIONS = 100000
```

> Cloudflare Workers' WebCrypto rejects PBKDF2 iteration counts **above 100000**
> ("iteration counts above 100000 are not supported"). New hashes therefore use
> exactly 100000 via WebCrypto; legacy 120000-iteration hashes stay verifiable
> through a pure-JS `@noble/hashes` fallback.

```ts
needsRehash(stored): boolean          // true unless prefix "pbkdf2" and iters === 100000
hashPassword(pw): Promise<string>
verifyPassword(pw, stored): Promise<boolean>   // constant-time XOR compare, never early-return
```

## 9.2 Device identity (`lib/fingerprint.ts` client, `lib/device-server.ts` server)

The client collects signals — **not a trust boundary**, the server re-hashes with
IP, UA and a pepper:

```ts
DeviceSignals { screen, tz, lang, platform, hardware, canvas, webgl, fonts }
```

- `screen` = `WxHxcolorDepth`
- `tz` = resolved IANA timezone
- `lang` = `navigator.languages` joined, capped at 32 chars
- `hardware` = `${hardwareConcurrency}c/${deviceMemory}g`
- `canvas` = last 96 chars of a `toDataURL()` from a fixed 240×60 draw
  (orange rect, `MachinistPro-fp` text, stroked arc)
- `webgl` = `UNMASKED_VENDOR|UNMASKED_RENDERER` via `WEBGL_debug_renderer_info`, ≤200 chars
- `fonts` = which of Arial, Helvetica, Times, Courier, Verdana, Georgia, Comic
  Sans MS, Impact change the width of a 72px monospace span

Every collector is individually try/caught, returning `"err"` / `"no-webgl"` so
one blocked API cannot break sign-in.

Server side, validated by a zod schema with per-field length caps:

```ts
pepper() = APP_PEPPER || TRIAL_PEPPER || SESSION_PEPPER
         || SUPABASE_SERVICE_ROLE_KEY.slice(0,32) || "mp-fallback-pepper-v1"

extractIp(req) = cf-connecting-ip || first x-forwarded-for || x-real-ip || "0.0.0.0"
hashIp(ip)     = sha256(pepper + "::ip::" + ip)

hashFingerprint(sig, ua, ipHash)  // trial identity — INCLUDES ua + ipHash
  = sha256(pepper + "::" + [screen,tz,lang,platform,hardware,canvas,webgl,fonts,ua,ipHash].join("|"))

hashHwid(sig, ua)                 // licence identity — DELIBERATELY EXCLUDES ip
  = sha256(pepper + "::hwid::" + [screen,tz,platform,hardware,canvas,webgl,fonts,ua].join("|"))
```

> HWID excludes the IP on purpose: a paid client must keep working when their
> network changes, while staying bound to the physical machine/browser profile.
> The trial fingerprint includes it, because recycling trials is the thing being
> prevented.

## 9.3 Sessions (`lib/session-server.ts`)

```
RAW_TOKEN_BYTES = 32                       // CSPRNG hex handed to the client
SESSION_TTL_DEFAULT_MS  = 24 h
SESSION_TTL_REMEMBER_MS = 30 days
SESSION_TTL_TRIAL_MS    = 14 days          // aligns with the trial window
hashSessionToken(raw) = sha256(`${pepper()}|${raw}`)
```

```ts
issueSession(opts): { token, expiresAt }
validateSession(rawToken): SessionRecord | null
revokeSession(rawToken) · revokeUserSessions(userId)
```

Rules:

- **Only the hash is stored.** The raw token is never logged and never persisted
  server-side, so a database dump cannot mint sessions.
- `validateSession` rejects tokens shorter than 16 chars without a query.
- An expired row is **deleted lazily** during validation, then treated as invalid.
- Rights are **re-read from `app_users` on every validation**: a deactivated,
  expired, or deleted account kills its live sessions immediately, and an admin
  promotion takes effect without signing out.
- Insert failures log with the username and throw *"Could not create a session.
  Please try again."*

## 9.4 Login — `POST /api/auth/login`

Body (zod): `{ username: 1–200, password: 1–200, rememberMe?: boolean, signals?: ClientSignals }`.

1. **Look up by username, then by email — two separate queries.**

   > Never one `.or("username.ilike.X,email.ilike.X")` ending in `maybeSingle()`.
   > That has two faults: it errors when more than one row matches, and one
   > identifier legitimately can match two rows (the account whose *username* is
   > that string, and another carrying it as an *email*) — the error was
   > discarded with the row, so both holders were told their password was wrong,
   > permanently, with nothing saying why. Username is unique, so asking about it
   > first and alone settles the ordinary case.
   >
   > The identifier must be passed as an **operand** (`.ilike(column, ident)`),
   > never interpolated into a filter string, where a comma starts another
   > condition and `*` is a wildcard. PostgREST has no ESCAPE clause for `ilike`,
   > so `%` and `_` still widen the pattern — therefore **re-check the match
   > exactly** (case-insensitively) in JS. Order by `created_at ASC`, limit 5,
   > and if more than one exact match exists, log it and use the oldest.

2. `verifyPassword`. Unknown user and wrong password both return the same
   `"Invalid username or password"` (401).
3. If `needsRehash(user.password_hash)`, re-hash transparently and update the
   row; a rehash failure is logged and ignored, never blocking the login.
4. `is_active === false` → `"This account has been suspended."` (403).
5. `expiry_date` in the past → `"Your subscription has expired."` (403).
6. **Device allowance:**
   - `hwid = signals ? hashHwid(signals, ua) : null`, `limit = max(1, device_limit)`
   - `allow_multi_device` → skip all checks.
   - No `hwid` → `"Device verification failed. Please retry in a normal browser window."` (403)
   - Known device → update `last_seen`.
   - Unknown device with a free slot → insert into `user_devices`; if
     `app_users.hwid` is null, backfill it.
   - Unknown device, no free slot → 403 with
     `limit === 1`: *"This account is locked to another device. Ask the
     administrator to reset your device (HWID)."*
     otherwise: *"This account has already been activated on N devices. Ask the
     administrator to free a device slot."*
   - `limit === 1` → `revokeUserSessions(user.id)` so one licence keeps exactly
     one live session.
7. Issue the session, stamp `last_login_at`, respond
   `{ success, sessionToken, username, subscription, expiry, isAdmin }`.
8. Any thrown error → 500 *"Authentication service is unavailable. Please try again."*

## 9.5 Other auth routes

- `POST /api/auth/session` — `{ sessionToken }` → `{ valid, user? }`
- `POST /api/auth/logout` — deletes the row for that token hash; always 200
- `GET /api/auth/health`, `GET /api/health` — environment/connectivity checks
- All `/api/*` responses carry `Cache-Control: no-store`.

## 9.6 Device trial (`lib/trial.functions.ts`)

```
TRIAL_DAYS = 14
MAX_TRIALS_PER_IP = 3
```

Two server functions, both taking `{ signals }`:

**`getDeviceTrialStatus`** → `{ hasTrial: false }` or
`{ hasTrial: true, startedAt, expiresAt, daysLeft, active }` where
`daysLeft = max(0, ceil((expires - now) / 86400000))`.

**`startDeviceTrial`**:

- If this device already has a trial and it is **still running**, *resume the same
  window* — issue a session with `subscription: "Trial (N days left)"` and the
  original `expiresAt`. Signing out must never cost the user their trial, and
  restarting must never extend past the original 14 days.
- If the device's trial has **expired**, refuse.
- Otherwise check `trial_ip_log`: at `MAX_TRIALS_PER_IP` refuse with a reason.
- Otherwise create/update the fingerprint row (`trial_used`, `trial_started_at`,
  `trial_expires_at = now + 14 days`), increment the IP counter, write
  `user_trials`, and issue a 14-day trial session.

Client state (`useDeviceTrial` hook, shared by the landing page and login page so
the button behaves identically in both):

```ts
{ state: "loading" } | { state: "none" } | { state: "active", daysLeft, expiresAt }
| { state: "expired" } | { state: "blocked", reason }
```

CTA label: `"Start 14-Day Free Trial"`, or `"Continue Trial · N days left"` when
active. `TrialBanner` shows remaining days; **paid accounts never see trial
messaging** (detect via `localStorage["mp_trial"] === "1"` on the session).

---

# PART 10 — ADMIN PANEL (`/dashboard/admin`)

Server functions in `lib/admin.functions.ts`, each **re-checking admin rights**
from the database and returning the constant `NOT_AUTHORISED = "Not authorised"`
otherwise:

```
adminListUsers · adminCreateUser · adminUpdateUser · adminDeleteUser
adminListDevices · adminRemoveDevice
adminGetSettings · adminSetSetting
```

Page sections:

1. **Stat tiles** — Clients (cyan), Active (green), Live sessions, Trials issued.
2. **Site Controls**
   - *Maintenance Mode*: toggle + message ("Message shown to visitors"). When on,
     a maintenance screen replaces the site for everyone.
   - *Announcement Banner*: toggle + message shown at the top of the site for
     every visitor, dismissible per browser.
   - Both read/written through `app_settings`; `getSiteSettings` is a public
     server function that **falls back to defaults on any error** — a banner is
     never worth breaking the site for.
3. **Create Login Credentials** — username, password (generate + reveal), email
   (optional), plan (e.g. "Pro"), expiry date, device limit, `is_admin`,
   `allow_multi_device`. On success, offer copy-to-clipboard of the credentials
   with a toast.
4. **Clients (N)** — search by username/email/plan, status filters, and per-row:
   - Set a new password
   - Edit account details (plan, expiry — placeholder "none")
   - **Device allowance** — list registered devices (hwid, user agent, first/last
     seen), remove one to free a slot, change `device_limit`
   - Suspend / reactivate (`is_active`)
   - Delete (confirmation dialog: "Delete this client?")

---

# PART 11 — MODULE REGISTRY (`src/config/modules.ts`)

One registry drives the sidebar, the dashboard grid, and global search.

```ts
type ModuleColor = "cyan"|"blue"|"purple"|"green"|"amber"|"red"|"pink"|"orange";
type ModuleStatus = "available"|"coming-soon"|"locked"|"beta";
type ModuleCategory = "calculators"|"tools"|"reference"|"system";

interface ModuleConfig {
  id: string; name: string; shortName?: string; description: string;
  icon: LucideIcon; href: string; color: ModuleColor; status: ModuleStatus;
  category: ModuleCategory; keywords: string[]; version?: string;
}

export const calculatorModules, referenceModules, workspaceModules, systemModules;
export const allCalculatorModules = [...calculatorModules, ...referenceModules];
export const allModules = [...all four];
export function searchModules(q) · getModuleById(id) · getModulesByCategory(cat)
export const moduleColors: Record<ModuleColor, {bg,border,text,glow}>;
```

**Complete registry contents:**

| id | name / shortName | href | icon | colour | status | category |
|---|---|---|---|---|---|---|
| `scientific` | Calculator | `/dashboard/scientific` | Calculator | cyan | available | calculators |
| `converter` | Unit Converter / Converter | `/dashboard/converter` | ArrowRightLeft | blue | available | calculators |
| `weight` | Material Weight & Cost / Weight & Cost | `/dashboard/weight` | Weight | purple | available | calculators |
| `geometry` | Geometry Calculator / Geometry | `/dashboard/geometry` | Hexagon | amber | available | calculators |
| `machining` | Machining Calculator / Machining | `/dashboard/machining` | Wrench | red | available | calculators |
| `cnc` | CNC Cycles / CNC | `/dashboard/cnc` | Cpu | purple | available | calculators |
| `level` | Spirit Level / Level | `/dashboard/level` | Compass | green | available | calculators |
| `engineering` | Engineering Calculator / Engineering | `/dashboard/engineering` | FunctionSquare | pink | available | calculators |
| `industrial` | Industrial Suite / Industrial | `/dashboard/industrial` | Factory | green | available | calculators |
| `electrical` | Electrical Suite / Electrical | `/dashboard/electrical` | Zap | amber | available | calculators |
| `formulas` | Engineering Constants / Constants | `/dashboard/formulas` | BookOpen | orange | available | reference |
| `tolerances` | Tolerances & GD&T / Tolerances | `/dashboard/tolerances` | Settings | blue | available | reference |
| `materials` | Engineering Database / Database | `/dashboard/materials` | Database | purple | available | reference |
| `tap-drill` | Tap Drill Chart / Tap-Drill | `/dashboard/tap-drill` | Wrench | amber | available | reference |
| `dxf-converter` | CAD Converter / Converter | `/dashboard/dxf-converter` | ScanLine | cyan | **beta** (v0.2) | tools |
| `workspace` | Workspace / Projects | `/dashboard/workspace` | BookOpen | cyan | available | tools |
| `favorites` | Favorites | `/dashboard/favorites` | Star | amber | available | system |
| `history` | History | `/dashboard/history` | Clock | blue | available | system |
| `settings` | Settings | `/dashboard/settings` | Settings | cyan | available | system |

Two route names are **deliberately kept** and must not be "tidied":

- `/dashboard/scientific` — a dozen entries in the Formulas database deep-link to it.
- `/dashboard/dxf-converter` — existing links point at it, though the tool is now
  called CAD Converter.

There is **one** weight/cost entry, not two. A separate "Cost" entry pointing at
`/dashboard/pricing` only redirected to the same screen, so the sidebar offered
two routes to one page.

Keywords must be generous — they are the search index. Example for `weight`:
`weight, material, mass, density, steel, aluminum, copper, metal, alloy, cost,
price, estimate, budget, quote, pricing, fabrication, bar, tube, pipe, plate,
sheet, beam, angle, channel, hex`.

---

# PART 12 — DASHBOARD HOME (`/dashboard`)

- **Greeting** by local hour: 05–12 "Good morning" (Sun), 12–17 "Good afternoon"
  (CloudSun), 17–21 "Good evening" (CloudSun), else "Good night" (Moon), with the
  full date and time.
- **Quick bar** — six chips in usage order:
  `scientific, converter, weight, machining, geometry, formulas`.

  > Only the **order** is hard-coded. Label, href, and colour are read from the
  > registry via `getModuleById`, and an id that no longer exists or is not
  > `available` drops out — hand-written entries had already drifted, three of
  > them disagreeing with the sidebar about a tool's name.

- **Module grid** — every `available` module from `allCalculatorModules` as a
  `ModuleCard`.
- **Activity cards** — Recent (last 5 history entries, each linking back to the
  module that produced it) and Favorites (5).
- **Stat tiles** — counts pulled from live data (`FORMULAS.length`,
  `MATERIAL_PROFILES.length`, module count), never hard-coded numbers.
---

# PART 13 — MODULE: CALCULATOR (`/dashboard/scientific`, cyan)

Nine modes in a horizontally scrollable **mode strip** with prev/next arrow
buttons, keyboard arrow support, and `scrollIntoView` on the active chip:

| id | name | description | icon |
|---|---|---|---|
| `standard` | Standard | Everyday arithmetic | Calculator |
| `scientific` | Scientific | Advanced functions | FlaskConical |
| `engineering` | Engineering | ENG notation & SI | Wrench |
| `statistics` | Statistics | Data & regression | BarChart3 |
| `complex` | Complex | Real & imaginary | Sigma |
| `programmer` | Programmer | Bases & bitwise | Binary |
| `matrix` | Matrix | Linear algebra | Grid3X3 |
| `equation` | Equation | Solve equations | FunctionSquare |
| `graphing` | Graphing | Advanced 2D plots | ChartSpline |

## 13.1 Expression engine (`lib/calculator/`)

Pipeline: **tokenize → insert implicit multiplication → shunting-yard to RPN →
evaluate RPN**.

```ts
// tokenizer.ts
tokenize(expr): Token[]                 // {type:"number"|"operator"|"function"
                                        //  |"constant"|"paren"|"comma", value, position}
insertImplicitMultiplication(tokens)    // 2π → 2*π, 3(4) → 3*(4), )( → )*(
normalizeOperator(ch)                   // ×→*, ÷→/, −→-

// parser.ts
toRPN(tokens): Token[]                  // precedence + right-assoc ^
evaluateRPN(rpn, angleMode): number

// engine.ts
evaluate(expr, angleMode): number
formatResult(n) · formatExpression(s)
createCalculationResult(expr, result, mode, angleMode)
validateParentheses(s) · countOpenParens(s) · autoCloseParens(s)
endsWithOperator(s) · endsWithNumber(s) · lastCharIsDecimal(s) · currentNumberHasDecimal(s)
toFriendlyMessage(err)                  // never surface parser jargon

// functions.ts
FUNCTIONS, FUNCTION_ALIASES             // sin cos tan asin acos atan sinh cosh tanh
                                        // ln log log2 sqrt cbrt abs exp fact ...
// constants.ts
CONSTANTS, CONSTANT_DISPLAY, DEFAULT_PRECISION, DISPLAY_PRECISION,
MAX_SAFE_NUMBER, MIN_SAFE_NUMBER, DEG_TO_RAD, RAD_TO_DEG, GRAD_TO_RAD, RAD_TO_GRAD
```

Angle mode is `"deg" | "rad" | "grad"` and applies to every trig call and
inverse-trig result.

## 13.2 Advanced modes (`lib/calculator/advanced.ts`, mathjs-backed)

```ts
SI_PREFIXES                       // y…Y with symbol, name, exponent
engineeringFormat(value, sigFigs = 6, exponentShift = 0)
normalizeEngineeringExpression(expr) · evaluateEngineeringExpression(expr)
convertSIPrefix(value, from, to)
parseRequiredNumber(input, label)  // throws a labelled, human message
formatEngineeringNumber(value, sigFigs = 12)

cartesianToPolar(x, y, angleMode, angleRange)   // angleRange: "signed" | "positive"
polarToCartesian(r, theta, angleMode)
decimalToDMS(deg, secondPlaces = 2) · formatDMS · parseDMS(text)

statistics(values)          // n, sum, mean, median, mode, variance, sd (sample+population),
                            // min, max, range, quartiles
linearRegression(points)    // slope, intercept, r, r²
evaluateComplex(expr) · complexDetails(re, im)      // modulus, argument, conjugate, polar form
parseMatrix(text) · matrixOperation(a, op, b)       // add, sub, mul, det, inv, transpose
solvePolynomial(coeffs)                              // quadratic, cubic, general roots
programmerOperation(a, b, op, base: 2|8|10|16, wordSize: 8|16|32|64)
                            // AND OR XOR NOT NAND NOR shifts, two's-complement aware
sampleGraph(expr, range)    // returns GraphSeries; supports cartesian, polar, parametric
parsePointList(expr): Point[] | null
formatAdvanced(value): string
```

## 13.3 UI

- `PremiumDisplay` — expression line (small, grey, right-aligned), result line
  (large, monospace, cyan), `calc-display-glow`, angle-mode and memory indicators.
- `PremiumKeypad` — mode-specific pads, `calc-button-glow`, ripple on press.
- `HistoryPanel` — this calculator's own recent results, tap to reuse.
- `AdvancedWorkspaces` — multi-line scratch area for statistics/matrix input.
- Every result is written to the shared history store (see §5.6).

---

# PART 14 — MODULE: UNIT CONVERTER (`/dashboard/converter`, blue)

## 14.1 Data model

```ts
interface UnitDef {
  id; name; symbol; aliases: string[];
  toBase:   number | ((v:number)=>number);   // → category base unit
  fromBase: number | ((v:number)=>number);   // base → this unit
}
interface CategoryDef {
  id; name; icon;            // lucide icon name
  baseUnit: string; units: UnitDef[];
  group: "basic"|"engineering"|"electrical"|"computing"|"fluid"|"chemistry"|"construction";
}
```

Linear units are built by a helper `u(id, name, symbol, toBase, aliases)` that
sets `fromBase = 1 / toBase`. **Temperature uses functions**, not factors.

`convert(value, from, to)` routes value → base → target, short-circuiting when
`from.id === to.id`.

`formatValue(n)`: `"NaN"`/`"∞"`/`"-∞"` guarded; exponential (8 dp) outside
`1e-6 … 1e12`; otherwise 10 significant digits with trailing zeros stripped.

## 14.2 The 31 categories

Length, Area, Volume, Mass, Time, Temperature, Speed, Pressure, Force, Torque,
Energy, Power, Density, Frequency, Angle, Acceleration, Flow Rate, Dynamic
Viscosity, Kinematic Viscosity, Thermal Conductivity, Stress/Pressure, Moment of
Inertia, Fuel Consumption, Voltage, Current, Resistance, Capacitance, Inductance,
Electric Charge, Data Size, Data Rate.

Reference — Length must include: m (base), km, cm, mm, µm, nm, mi 1609.344,
yd 0.9144, ft 0.3048, in 0.0254, nmi 1852, mil/thou 2.54e-5, dm 0.1, with
aliases for both spellings (`metre`/`meter`) and the `"` symbol for inches.
Temperature carries Kelvin (base), Celsius, Fahrenheit, Rankine as function
pairs. Fuel Consumption carries MPG (US) and MPG (Imperial) as separate
inverse-relationship units.

## 14.3 UI

Category picker (grouped), from/to selects, live bidirectional conversion,
swap button, copy button, search across unit names, symbols and aliases
(`searchUnits`, `searchCategories`), and a recents list. A "Clear" action resets
the input.

---

# PART 15 — MODULE: MATERIAL WEIGHT & COST (`/dashboard/weight`, purple)

## 15.1 Types

```ts
Material { id, name, density /* kg/m³ */, category: "ferrous"|"nonferrous"|"plastic", description }
ShapeDef { id, name, group: "solid"|"hollow"|"structural"|"sheet",
           fields: DimensionField[], volume(dims /* metres */): number /* m³ */, formula: string }
DimensionField { id, label, placeholder, unit: "length", kind?: "thickness" }

DimUnit = "mm"|"cm"|"m"|"in"|"ft";  DimUnitChoice = DimUnit | "ga"
WeightUnit = "g"|"kg"|"ton"|"lb"|"oz"
VolumeUnit = "mm3"|"cm3"|"m3"|"l"|"ml"|"in3"|"ft3"|"galUS"|"galImp"

DIM_TO_METRE = { mm:.001, cm:.01, m:1, in:.0254, ft:.3048 }
KG_FACTOR    = { g:1000, kg:1, ton:.001, lb:2.20462262, oz:35.2739619 }
M3_FACTOR    = { mm3:1e9, cm3:1e6, m3:1, l:1000, ml:1e6,
                 in3:61023.7441, ft3:35.3146667, galUS:264.172052, galImp:219.969157 }
```

**Each dimension carries its own unit.** Stock is rarely measured in one unit
throughout — a 30 mm round bar comes in 4 ft lengths — so `calculateWeight`
accepts either a single `DimUnit` or a per-field `Record<fieldId, DimUnitChoice>`.

## 15.2 The 21 shapes (volume in m³ from metre inputs)

**Solid**

| id | name | fields | volume | formula shown |
|---|---|---|---|---|
| `round_bar` | Round Bar | d, l | `π/4·d²·l` | `V = π/4 × D² × L` |
| `square_bar` | Square Bar | a, l | `a²·l` | `V = A² × L` |
| `hex_bar` | Hex Bar | af, l | `(√3/2)·af²·l` | `V = (√3/2) × AF² × L` |
| `flat_bar` | Flat Bar / Plate | w, **t**, l | `w·t·l` | `V = W × T × L` |
| `plate` | Plate | w, h, **t** | `w·h·t` | `V = W × H × T` |
| `block` | Block | w, h, l | `w·h·l` | `V = W × H × L` |
| `cylinder` | Cylinder | d, h | `π/4·d²·h` | `V = π/4 × D² × H` |
| `sphere` | Sphere | d | `π/6·d³` | `V = π/6 × D³` |

> **Hex bar is measured across flats.** `(3√3/2)·R²` is the area from the
> across-*corners* radius; measured across flats, `AF/2` is the inradius, giving
> `2√3·(AF/2)² = (√3/2)·AF²`. Using the wrong one makes every hex bar 25% light —
> 30 mm steel reads 4.59 kg/m against the 6.12 kg/m in the stock tables.

**Hollow** — every one validates the wall before computing:

| id | fields | volume | guard |
|---|---|---|---|
| `pipe` | od, id, l | `π/4·(od²−id²)·l` | id < od |
| `tube` | od, **wt**, l | `π/4·(od²−(od−2wt)²)·l` | `wt > 0` and `wt < od/2` |
| `hollow_square` | a, **t**, l | `(a²−(a−2t)²)·l` | `t < a/2` |
| `hollow_rect` | w, h, **t**, l | `(w·h−(w−2t)(h−2t))·l` | `t < w/2` and `t < h/2` |

> A wall thicker than half the OD bores past the centreline: `id` goes negative
> but `OD²−ID²` stays positive, so the raw formula answers a large,
> confidently-wrong volume instead of failing. Errors read like
> *"Wall thickness (30) must be less than half the outside diameter (25)."*

**Structural** — `angle` (`(a·t+(b−t)·t)·l`), `channel`, `i_beam`, `t_section`,
each with web/flange thicknesses flagged `kind: "thickness"`.
**Sheet** — `sheet` with a gauge-capable thickness.

## 15.3 Gauge support (`materials/gauge.ts`)

Thickness fields — and only thickness fields — may be entered as a gauge number.
Four standards:

```
steel      → "Steel (MSG)"          short "Steel"
galvanized → "Galvanised steel"     short "Galv."
stainless  → "Stainless steel"      short "Stainless"
aluminum   → "Aluminium / brass / copper (B&S)"   short "Alum./B&S"
```

```ts
gaugeNumbers(standard) · gaugeRange(standard) → {min,max}
gaugeToMetres(gauge, standard): number | null   // null if not an integer or not in table
gaugeToMm(gauge, standard) · suggestGaugeStandard(materialId)
```

Errors are specific: *"Thickness: gauge is a whole number — there is no 14.5
gauge."* / *"Thickness: 42 gauge is outside this standard (3–38)."*

## 15.4 Engine

```ts
dimToMetres(value, unit, gaugeStandard): number | null
dimError(field, value, unit, gaugeStandard): string | null
calculateWeight(shape, material, dims, dimUnit|dimUnitMap, weightUnit, gaugeStandard="steel")
   → { volume_m3, weight_kg, displayWeight, weightUnit } | null
calculateCost(weightKg, cost): CostResult
autoVolumeUnit(v_m3)   // ≥1 → m3, ≥1e-3 → l, ≥1e-6 → cm3, else mm3
toVolumeUnit(v_m3, unit)
fmt(n, decimals=4) · fmtCurrency(n)
```

**Cost model** (`CostInputs { quantity, pricePerKg, wastePct, discountPct, taxPct }`):

```
totalWeight   = unitWeight × quantity
materialCost  = totalWeight × pricePerKg
wasteCost     = materialCost × wastePct/100
subtotal      = materialCost + wasteCost
discount      = subtotal × discountPct/100
taxableAmount = subtotal − discount
tax           = taxableAmount × taxPct/100
grandTotal    = taxableAmount + tax
costPerItem   = grandTotal / quantity
```

> Volume auto-selects its unit because the span is enormous — a grub screw and a
> header tank are both "volume". Quote it the way a person would: mm³ for an
> insert, litres for a tank.

## 15.5 Material database (36 entries)

`Material { id, name, density, category, description }`, grouped
`ferrous | nonferrous | plastic`:

- **Ferrous** — mild_steel (A36), c1018, c1045, 4140, d2_tool, ss304, ss316,
  ss420, ss430, cast_iron
- **Non-ferrous** — al1050, al2024-T4, al5052-H32, al5083-H116, al6061-T6,
  al6082-T6, al7075-T6, copper C110, brass C360, bronze C932, ti_gr5,
  magnesium AZ31B, nickel200, inconel718, monel400, zinc, zamak3, lead
- **Plastic** — pvc, abs, nylon, delrin, acrylic, ptfe, hdpe, pc

Plus **custom materials** (`materials/custom.ts`): user-defined name + density
with a unit choice, validated against `DENSITY_MIN`/`DENSITY_MAX`, stored under
`CUSTOM_STORAGE_KEY`, marked by `isCustom(id)` so they can be edited or removed.
`toKgM3` / `fromKgM3` convert between `kg/m³`, `g/cm³`, `lb/in³`, `lb/ft³`.

## 15.6 Page

Shape picker grouped by family with a **dimension diagram** per shape
(`materials/diagrams.ts`), per-field unit selects (mm/cm/in/ft and `ga` on
thickness fields), material selector with category grouping and a custom-material
manager, weight unit toggle (kg/ton/lb/oz), auto volume unit with a manual
override, the formula shown via `FormulaDisplay`, and the full cost breakdown.
Save-to-history and add-to-project on every result.

---

# PART 16 — MODULE: GEOMETRY (`/dashboard/geometry`, amber)

Three tabs.

**2D Shapes** (20): square, rectangle, parallelogram, trapezium, rhombus, kite,
triangle, right_triangle, equilateral, scalene, circle, ellipse, arc, pentagon,
hexagon, heptagon, octagon, nonagon, decagon, polygon_n — each returning area,
perimeter, and shape-specific properties (diagonals, apothem, angles).

**3D Shapes** (12): cube, cuboid, sphere, hemisphere, cylinder, hollow_cyl, cone,
frustum, prism, pyramid, torus, capsule — volume, surface area, lateral area.

**Coordinate tools** (`geometry/coord.ts`):

```
distance(p1,p2) · midpoint · slope · lineEquation · distance3D
cartesianToPolar / polarToCartesian
cartesianToCylindrical / cylindricalToCartesian
cartesianToSpherical / sphericalToCartesian
parsePoints(text) · hasDanglingCoordinate(text) · polygonStats(points)
```

Sub-modes: Two Points (Cartesian) → Distance, Midpoint, Slope, Angle of line,
Line equation · Cartesian ⇄ Polar (r, θ) · Cartesian → Cylindrical (ρ, θ, z) ·
Cartesian → Spherical (ρ, θ azimuth, φ polar) · 3D Distance · Polygon from a
pasted vertex list → Vertices, Area (shoelace), Perimeter, Sum of interior angles.

`hasDanglingCoordinate` catches an odd trailing number in the paste and warns
rather than silently dropping it. Length units convert on the fly via
`LENGTH_UNITS`, `lengthFactor`, `dimensionOf`, `convertResult`.

---

# PART 17 — MODULE: MACHINING (`/dashboard/machining`, red)

Tabs: **RPM · Feed Rate · Milling · Turning · Drilling · Threads · Tapping ·
Bolt Circle · Taper · Time**.

## 17.1 Engine (all metric internally; UI converts at the boundary)

```ts
calcRPM(Vc_mMin, D_mm)            = Vc·1000 / (π·D)
calcSurfaceSpeed(rpm, D_mm)       = π·D·rpm / 1000            // m/min
calcFeedRate(rpm, z, fz_mm)       = rpm·z·fz                  // mm/min
calcChipLoad(vf, rpm, z)          = vf / (rpm·z)
calcMachiningTime(L, vf, passes)  = L·passes / vf             // min
calcMRR(ap, ae, vf)               = ap·ae·vf / 1000           // cm³/min (milling)
calcTurningMRR(ap, f, Vc)         = ap·f·Vc                   // cm³/min
```

> Turning does **not** use the milling form: a turning tool sweeps an annular
> ring, so the cutting speed carries the length of cut.

**Threads**

```ts
calcTapDrill(major, pitch, threadPct = 75) = major − pitch·(threadPct/75)
calcMinorDiaInternal(major, pitch) = major − 1.0825·pitch   // D1 — nut minor (tap/bore clears)
calcMinorDiaExternal(major, pitch) = major − 1.2269·pitch   // d3 — screw minor (threading tool)
calcThreadDepthExternal(pitch)     = 0.61345·pitch          // cross-slide infeed
```

> A thread has **two** minor diameters and they are not interchangeable — they
> differ by `0.1444 × pitch`. Returning `D1` under the bare name "minor diameter"
> made the same M8 read 6.466 on one page and 6.647 on another. Both are exposed,
> each named for the job it belongs to.

**Drilling**

```ts
calcDrillFeedPerRev(D, feedFactor) = D · feedFactor   // feed scales with diameter —
                                     // a value that suits a 12 mm drill snaps a 3 mm one
calcDrillPointDepth(D, pointAngle = 118) = (D/2) / tan(pointAngle/2)   // ≈0.3·D at 118°
calcDrillThroughDepth(depth, D, angle)   = depth + pointDepth
```

**Power and torque**

```ts
calcCuttingPower(MRR_cm3min, kc_Nmm2) = MRR·kc / 60000       // kW
calcSpindlePower(Pc_kW, efficiency = 0.8) = Pc / efficiency
calcSpindleTorque(P_kW, rpm) = 9550·P / rpm                  // N·m
kwToHp(kw) = kw / 0.7457
```

**Surface finish**

```ts
calcSurfaceFinishRa(f_mm, r_mm) = (f² / (32·r)) · 1000       // µm
calcFeedForRa(Ra_um, r_mm)      = √((Ra/1000)·32·r)          // inverse
```

**Radial chip thinning**

```ts
calcChipThinningFactor(ae, D)
  = ae >= D/2 ? 1 : D / (2·√(D·ae − ae²))
```

**Bolt circle** — `calcBoltCircle(holeCount, pitchDia, startAngle = 0)` returns
`{index, angle, x, y}` per hole, anticlockwise from the start angle as on a
drawing. Throws for non-integer or <1 holes, >200 holes, or a non-positive PCD.
Axis crossings are snapped: `cos(90°)` lands on `6.1e-17`, not 0.

**Taper** — `calcTaper(largeDia, smallDia, length)` →
`{ taperPerMm, taperPerFoot_mm (×304.8), includedAngle_deg = 2·atan((Δd/2)/L),
compoundAngle_deg = included/2 }`.

**Unit helpers** — `inToMm ×25.4`, `sfmToSmm ×0.3048`, `ipmToMmMin ×25.4`, and inverses.

## 17.2 Cutting speed bands

Materials carry speed bands **per tool material per operation**:

```ts
speedBand(material, tool, operation, units): { min, max }
defaultCuttingSpeed(...)   // band midpoint, rounded to a dial-able number:
                           //   ≥100 → nearest 5, else nearest 1
```

> Every screen used to reach into the material for a bare `smm`/`sfm` pair —
> an HSS figure with nothing saying so. Going through `speedBand` means a screen
> **cannot read a speed without stating what the tool is made of**.
> `TOOL_MATERIALS` covers HSS, carbide, coated carbide, ceramic, etc.

**User overrides** (`machining/speed-overrides.ts`): a shop can replace any
material/tool/operation band. Persisted under `SPEED_STORAGE_KEY`, validated
against `SPEED_MIN`/`SPEED_MAX`, keyed by `overrideKey(material, tool, op)`, with
`effectiveBand()` merging override over default and `bandsAreIdentical()` used to
drop a redundant override.

## 17.3 Spindle limit — required behaviour

```ts
overSpindleLimit(rpm, maxRpm) = maxRpm > 0 && rpm > maxRpm
cappedSurfaceSpeed(maxRpm, D) = calcSurfaceSpeed(maxRpm, D)
clampToSpindle(rpm, maxRpm)   = overSpindleLimit(rpm, maxRpm) ? maxRpm : rpm
```

> A 3 mm cutter in aluminium asks for ~19,000 RPM; most machines stop between
> 6,000 and 10,000. **Everything downstream of spindle speed — feed, removal
> rate, power, cycle time — must be computed from the clamped RPM**, not the
> requested one. A feed calculated against an unreachable RPM is wrong in the
> dangerous direction: feed per tooth ends up far heavier than intended once the
> spindle tops out. `maxRpm = 0` means "not stated", so nothing is clamped, and
> the UI shows the achieved surface speed alongside the requested one.

## 17.4 Tapping (`machining/tapping.ts`)

> A tap is the one tool guaranteed to break if the feed is wrong, and it breaks
> *inside* a part that already has all its other work in it. The tap is screwed
> into its own thread and advances exactly one pitch per revolution — the feed is
> not a choice. Geometry here is exact; speeds are not (they depend on tap,
> coating, coolant and holder rigidity), so speeds are **asked for, not assumed**.

```ts
tapFeedRate(pitch_mm, rpm) = pitch · rpm            // mm/min, directly
tapRpmForFeed(pitch, vf)   = vf / pitch
pitchFromTpi(tpi)          = 25.4 / tpi

TAP_FORM_CONSTANT = 76.98                            // 60° thread form
engagementFromDrill(major, pitch, drill) = 76.98·(major − drill)/pitch
tapDrillForEngagement(major, pitch, pct)  = major − pct·pitch/76.98
ENGAGEMENT_TYPICAL = 75 · ENGAGEMENT_HIGH = 85
engagementIsRisky(pct) = pct > 85
```

> Checks against the chart: M6×1 at 75% → 5.03 (chart 5.0); M8×1.25 → 6.78
> (chart 6.8); M10×1.5 → 8.54 (chart 8.5). Going 60% → 100% engagement roughly
> **triples** tap torque and buys a few percent of thread strength — the fastener
> fails in the bolt long before the thread strips. Shops cut 65–75%.

```ts
LEAD_THREADS = { bottoming: 1.5, plug: 3–5, taper: 8–10 }   // by TapStyle
tapLeadLength(pitch, style) = pitch · LEAD_THREADS[style]
tapTravelForFullThread(...)      // full-thread depth + lead
blindHoleShortfall(...)          // how much deeper the hole must be drilled
tapTurns(...) · tapCycleTimeMin(...)
TAPPING_SPEED_FRACTION · suggestedTapSpeed(...)
```

A taper tap cannot finish a blind hole a plug tap can — the UI must say so when
the shortfall is positive.

---

# PART 18 — MODULE: CNC CYCLES (`/dashboard/cnc`, purple)

Tabs: **G02 · G03 · G71 (OD Rough) · G72 (Facing) · G73 (Pattern) · G74 (Peck
Drill) · G75 (Groove) · G76 (Thread) · G90·G92·G94 · Backplot**.

## 18.1 G71 — the reference implementation

```
G71 U(Δd) R(e)
G71 P(ns) Q(nf) U(Δu) W(Δw) F(f)
```

> The two `U` words are different things, and that is the usual trap:
> **U on the first line is depth of cut per pass, a RADIUS value.**
> **U on the second line is the finishing allowance in X, a DIAMETER value.**
> In this codebase every diameter is a diameter, every depth is a radius value,
> and the type names say which at every step.

```ts
interface G71Input {
  stockDiameter; finishDiameter; length;      // mm, length entered positive
  depthOfCut;                                 // radius value
  finishAllowanceX;                           // diameter value
  finishAllowanceZ; retract;                  // W and R
  type?: "I" | "II";
  internal?: boolean;                         // bore instead of turn
}
```

> **Internal work inverts everything.** `stockDiameter` becomes the existing hole
> (drilled, cored or cast), passes open outwards instead of cutting down, and
> roughing stops *inside* the finished bore. That is why the finishing allowance
> is written **negative** on the second G71 line for internal work — a positive U
> on a bore leaves the allowance on the wrong side and the finishing pass cuts
> nothing at all.

> **Type I vs Type II.** Type I needs the diameter to run one way along the part
> and is selected by the first block after P carrying only an X word. Type II is
> selected by that block carrying **both X and Z** and will rough a profile that
> dips and rises — the pockets a Type I cycle drives straight through.
> `requiredType(points)` decides, and the UI must warn when the profile needs
> Type II.

Public API:

```ts
calculateG71(input, profile?) → { passes: G71Pass[], ... }
   // G71Pass { pass, diameter, depth, z, spans: CutSpan[] }
reachableZ(points, passDiameter, limitZ) · profileDiameterAt(points, z, internal)
reachableSpans(...)          // a Type II pass has several spans with metal standing between
profileCoordinates(steps, internal) · profileBlocks(...) · profileReversal(points)
profileLength(steps) · generateG71Code(...) · profileDrawing(...)
arcGeometry(...) · arcPoints(...) · cornerFillet(...) · cornerChamfer(...)
```

Profile input is a list of `ProfileStep`s (face, taper, radius, chamfer,
straight) producing `ProfilePoint[]`; the page shows a scaled profile drawing,
the coordinate table, and the finished program blocks with copy.

## 18.2 The other cycles

| Cycle | API | Notes |
|---|---|---|
| G72 facing | `calcG72`, `generateG72Code`, `faceProfileCoordinates`, `facingReach` | roughing parallel to X |
| G73 pattern repeat | `calcG73`, `patternOversize`, `generateG73Code` | for near-net forged/cast stock |
| G74 peck drill | `calcG74`, `generateG74Code` | |
| G75 grooving | `calcG75`, `generateG75Code` | |
| G76 threading | `calcG76`, `generateG76Code`, `threadHeight`, `THREAD_FORMS` | forms: ISO metric 60°, Unified 60°, Whitworth 55°, Trapezoidal 30° (Tr) |
| G70 finish | `generateG70Code` | |
| G90/G92/G94 | `SIMPLE_CYCLES`, `calcSimpleCycle`, `generateSimpleCycleCode` | G90 — Turning: one straight or tapered turning pass per block. G92 — Threading: one threading pass per block, depth by depth. G94 — Facing: one facing pass per block. |

Helpers: `word(letter, value)` formats an address **always with a decimal point**;
`microns(value)` exists for the checker's use.

## 18.3 Program checker (`cnc/check.ts`) — safety-critical

```ts
interface Diagnostic { line: number; severity: "error"|"warning"; code: string;
                       message: string; text: string }
checkProgram(source): Diagnostic[]
DISTANCE_ADDRESSES = ["X","Z","U","W","I","K","R"]
CONTOUR_CYCLES = [70,71,72,73]
CUTTING_CYCLES = [70,71,72,73,74,75,76,90,92,94]
```

Rule codes to implement:

| code | severity | meaning |
|---|---|---|
| `missing-decimal` | **error** | a distance address written without a decimal point — a Fanuc reads it in **microns**, so `X52` asks for a 0.052 mm bar |
| `unbalanced-comment` | error | `(` without `)` on a line |
| `no-tool` | warning | cutting before any T word |
| `no-spindle` | warning | cutting with no M03/M04 |
| `no-speed` | warning | cutting with no S word |
| `no-feed` | warning | a feed move with no F word in effect |
| `no-feed-mode` | warning | no G98/G99 (or G94/G95) feed mode set |
| `arc-without-centre` | error | G02/G03 with neither R nor I/K |
| `arc-radius-too-small` | error | R smaller than half the chord |
| `pq-block-missing` | error | G71/G72/G73 P or Q pointing at a sequence number that does not exist |
| `needs-type-ii` | warning | the profile dips and rises but the block after P has only X |
| `pattern-turns-back` | warning | a G73 pattern that reverses on itself |
| `no-nose-radius-comp` | warning | a profile with arcs/tapers cut without G41/G42 |
| `no-program-end` | warning | no M30/M02 |

Modal state must be tracked across blocks (motion mode, feed, speed, tool,
spindle) — a warning must not fire because the F word was on an earlier line.

## 18.4 Backplot + lathe simulation

```ts
// cnc/parse.ts
parseGCode(source): GMove[]        // absolute/incremental, modal motion, arcs
centreFromRadius(...) · arcSweep(...) · arcPointAt(...) · pathBounds(moves)

// cnc/simulate.ts
type MoveKind = "rapid" | "feed" | "retract";
type CutStyle = "turn" | "face" | "groove" | "bore";
createStock(stockDiameter, length, samples = 240): StockModel
createNearNetStock(...)                // for G73
toolpathFromProgram(...) · stockFromProgram(...)
applyCut(stock, move) · simulate(...)
buildG71Toolpath … buildG76Toolpath, buildSimpleToolpath
```

Canvas viewport 620×300 with 30px padding. Controls: Play, Pause, Step forward,
Step back, Rewind, Reset. Rapids, feeds and retracts are drawn distinctly. The
checker's diagnostics render beside the plot with line numbers and the offending
text.

> **The built-in sample program must be written with explicit decimals on every
> word.** An earlier sample used `X52`, `Z-15`, `U2` — as the first thing anyone
> sees on this page it taught the exact habit the checker warns about, and the
> checker flagged all eleven of them on its first run.

Sample program (`SAMPLE`), a three-step shaft:

```
(THREE STEP SHAFT)
G21 G97 S900 M03
T0101
G00 X52.0 Z2.0
G71 U2.0 R1.0
G71 P100 Q110 U0.5 W0.1 F0.25
N100 G00 X20.0
     G01 Z-15.0
     …
```

---

# PART 19 — MODULE: SPIRIT LEVEL (`/dashboard/level`, green)

Turns the phone into an inclinometer for machine beds, vices, and tramming.
Reads `DeviceOrientationEvent` / gravity, with an explicit iOS permission prompt.

```ts
interface Tilt { pitch: number; roll: number }        // degrees
NO_CALIBRATION = { pitch: 0, roll: 0 }
normaliseAngle(a) · applyCalibration(raw, cal)
totalTilt({pitch,roll})  = hypot(pitch, roll), to 4 dp
    // the steepest slope regardless of which way it runs. Two axes each a
    // degree out is NOT one degree out of level.

slopeDirection({pitch,roll}) = atan2(roll, −pitch) in degrees, normalised to [0,360)
    // Direction the surface falls away, clockwise from "away from you".
    // Pitch is positive nose-up, which raises the far edge and drops the near
    // one — so a positive pitch falls BACK towards the user: 180°, not 0°.
    // Taking pitch at face value pointed the arrow at the high side on the
    // front-to-back axis while the bubble correctly went the other way, and it
    // read plausibly until you stood at the end of the machine.

SLOPE_UNITS = deg | mmm (mm/m) | inft (in/ft) | arcmin | ratio
formatSlope(degrees, unit, places = 2)

LEVEL_TOLERANCE_DEG = 0.15
isLevel(tilt, tolerance = 0.15)

smooth(history, sample, window = 8) · averageTilt(history)   // sensor noise
```

Mode and orientation handling:

```ts
type LevelMode = "surface" | "edge";
detectMode(gravity, …)                 // flat on a face vs stood on an edge
edgeOrientation(g): "portrait" | "landscape"
toViewFrame(g, screenAngle) · currentScreenAngle()
RESTING_EDGE_LABELS: { bottom, top, left, right }
restingEdge(g) · edgeBeamAngle(g) · lowSide(g, tolerance) · edgeAngle(g) · plumbAngle(g)
gravityToTilt(g)
ballOffset(tilt, range = 5) · bubbleOffset(tilt, range = 5) · edgeBubble(g, range = 5)
```

**UI** — mode tabs *Flat · On end · On side*; animated bubble vials
(`components/level/vials.tsx`) driven by the live gravity vector; a large angle
readout with the chosen slope unit; a **Calibrate / Zero** button storing the
current tilt as the calibration; a green "LEVEL" state inside tolerance; and the
low side named in words.

---

# PART 20 — MODULE: ENGINEERING (`/dashboard/engineering`, pink)

All SI internally. Tabs and their exact formulas:

**Stress** — `σ = F/A`, `τ = V/A`, `ε = ΔL/L₀`, `γ = Δx/L`, `σ = E·ε`

**Beams**

| case | reaction | max moment | max deflection |
|---|---|---|---|
| Simply supported, central point load | `P/2` | `P·L/4` | `P·L³/(48·E·I)` |
| Simply supported, UDL | `w·L/2` | `w·L²/8` | `5·w·L⁴/(384·E·I)` |
| Cantilever, end point load | — | `P·L` | `P·L³/(3·E·I)` |
| Cantilever, UDL | — | `w·L²/2` | `w·L⁴/(8·E·I)` |

Bending stress `σ = M·y/I`.

**MOI** — rectangle `b·h³/12`, circle `π·d⁴/64`, hollow circle `π(D⁴−d⁴)/64`,
triangle `b·h³/36`, section modulus `S = I/y`.

**Torque / Shaft** — `T = P·60/(2π·n)`, `P = 2π·n·T/60`,
solid torsional stress `16T/(π·d³)`, hollow `16·T·D/(π(D⁴−d⁴))`,
angle of twist `θ = T·L/(G·J)` (radians), polar MOI solid `π·d⁴/32`,
hollow `π(D⁴−d⁴)/32`.

**Springs** — `k = G·d⁴/(8·D³·n)`, `x = F/k`, `U = ½·k·x²`.

**Fasteners** — ISO metric tensile stress area
`At = π/4·(d − 0.9382·pitch)²`, proof load `At·Sp`, tightening torque
`T = K·d·F`, safety factor `proofLoad/appliedLoad`.

**Fluid** — `Q = A·v`, `Re = ρ·v·D/µ`, Darcy–Weisbach pressure drop
`Δp = f·(L/D)·(ρ·v²/2)`, hydraulic power `Q·Δp`, pipe velocity `4Q/(π·D²)`.

**Thermal** — `Q = m·c·ΔT`, `ΔL = α·L₀·ΔT`, efficiency `(Wout/Qin)·100`,
conduction `k·A·ΔT/L`.

**Machine Design** — factor of safety `ultimate/actual`, bearing life
`(C/P)^p · 10⁶` revolutions (p = 3 ball, 10/3 roller), gear ratio `N2/N1`,
belt speed `π·D·n/60000` m/s, flywheel energy `½·I·ω²`.

---

# PART 21 — MODULE: INDUSTRIAL SUITE (`/dashboard/industrial`, green)

**Sheet Metal**

```
Bend allowance   BA   = (π/180)·θ·(R + K·T)
Outside setback  OSSB = (R + T)·tan(θ/2)
Bend deduction   BD   = 2·OSSB − BA
Min bend radius  R_min ≈ T (mild steel, rule of thumb)
Neutral axis     e = R + K·T
Cylinder blank   L = π·(D − T)
```

**Flat pattern — the leg convention is part of the signature, not a preference:**

```
flange legs (measured to the tangent point):  L = Leg1 + Leg2 + BA
outside legs (measured to the mould line):    L = Leg1 + Leg2 − BD
```

> These are two different parts. A flange length runs from the edge to where the
> flat stops and the radius begins; an outside dimension runs to the mould line —
> the corner the faces would meet at if the bend were sharp. The same "50 and 50"
> unfolds to lengths differing by the whole bend deduction — 10 mm apart on a 90°
> bend in 2 mm with a 3 mm radius, which is a scrapped blank. Adding BA to
> outside dimensions double-counts the corner; the function signature must make
> that mistake unreachable by accident.

**Welding** — throat `a = s·0.707`; fillet volume per length `0.5·s²·L` (mm³);
weld weight `V·ρ/10⁹` kg; electrodes `weldWeight/(rodWeight·efficiency)`;
gas `flow × arcTime`.

**Hydraulics** — `F = P·A` (Pa, m² → N); `A = π/4·D²`;
pump flow `Q = V·n/1000` (cc/rev, RPM → L/min);
power `P = Q·Δp/600` (L/min, bar → kW); oil volume `A·stroke`.

**Pneumatics** — `F = P·A·η`; air per cycle `A·stroke·2·(P_abs/P_atm)`;
compressor capacity `V_cycle · cycles/min`.

**Pipe** — area `π/4·(OD²−ID²)`; weight/length `A·ρ`; internal volume/length
`π/4·ID²`; outer surface/length `π·OD`; flow velocity `Q/A`.

**Gears** — `D = m·Z`; `m = D/Z`; `DP = Z/D` (teeth per inch);
centre distance `(D1+D2)/2`; ratio `Z2/Z1`.

**Belts** — open belt length `L = 2C + π(D1+D2)/2 + (D2−D1)²/(4C)`;
pulley ratio `n1/n2 = D2/D1`; belt speed `π·D·n/60000` m/s;
centre distance from length (approx) `C = (L − π(D1+D2)/2)/2`.

---

# PART 22 — MODULE: ELECTRICAL SUITE (`/dashboard/electrical`, amber)

Tabs: **Motor & Drive · Power Factor · Cable & Circuit · Theory · EDM**.

## 22.1 Theory

```
V = I·R · I = V/R · R = V/I
P = V·I · P = I²·R · P = V²/R · kWh = W·h/1000
series ΣR · parallel 1/Σ(1/R) · current & voltage dividers
XL = 2πfL · XC = 1/(2πfC) · Z = √(R² + (XL−XC)²) · φ = atan((XL−XC)/R)
f₀ = 1/(2π√(LC)) · Q = (1/R)·√(L/C)
```

## 22.2 Power and motors

```
phaseFactor(phase) = three ? √3 : 1
S = V·I·phaseFactor · P = S·pf · Q = √(S² − P²) · pf = P/S
currentFromPower(P, V, pf, phase)
pfCorrectionKvar(P, pfFrom, pfTo) = P·(tan(acos pfFrom) − tan(acos pfTo))
correctionCapacitance(kvar, V, f, …)

motorFullLoadCurrent(...) · motorInputPower = shaft/η · motorLosses = shaft(1/η − 1)
motorTorque = P·60/(2πn) · powerFromTorque = T·2πn/60
synchronousSpeed = 120·f/poles · slip = (ns − n)/ns · speedFromSlip
STAR_DELTA_RATIO = 1/3 → starDeltaStartCurrent, starDeltaStartTorque
startingCurrent = FLC × multiple

W_PER_HP_MECHANICAL = 745.6998715822702      // US / UK nameplate "HP"
W_PER_HP_METRIC     = 735.49875              // PS, CV, pk — EU / JP nameplate
hpToWatts(hp, standard = "mechanical") · wattsToHp(w, standard)
```

> **There are two horsepowers on motor nameplates and they are not the same.**
> The gap is 1.4% — small enough to look like rounding, large enough to size a
> starter one frame short. Keep the two constants separate so no call site can
> average them by accident, and make the UI state which one is in use.

UI toggles: Three phase / Single phase · kW / Horsepower (mechanical or
"Metric — PS / CV, 735.5 W (EU, JP)") · 50 Hz / 60 Hz · Delta / Star.

## 22.3 Cable sizing (`electrical/sizing.ts` + `tables.ts`)

Two standards, both real tables:

- **IEC / BS 7671 — mm²** — `IEC_SIZES`, `IEC_AMPACITY_CU_METHOD_C`,
  `IEC_AMBIENT_PVC`, `IEC_GROUPING`, `IEC_BREAKERS = [6,10,13,16,20,25,32,40,50,63,80,100,125]`
- **NEC — AWG** — `AWG_SIZES`, `NEC_AMPACITY_CU`, `NEC_AMBIENT_75C`,
  `NEC_SMALL_CONDUCTOR_CAP`, `NEC_BREAKERS`

```ts
RESISTIVITY, TEMP_COEFFICIENT
conductorResistance(length, area, material) · resistanceAtTemp(r20, tempC, material)
voltageDrop(...) · voltageDropPercent(drop, nominal) · areaForVoltageDrop(...)
conductorPowerLoss(...)
ambientFactor(...) · iecGroupingFactor(n) · necGroupingFactor(n)
iecDeratedAmpacity(...) · necDeratedAmpacity(...) · necMaxOvercurrent(...)
nextBreakerUp(a) · nextBreakerDown(a)
maxFillFraction(conductors) · conduitFill(...)
sizeCableIec(input): SizingResult · sizeCableNec(input): SizingResult
```

`SizingResult` returns the chosen size plus **every candidate considered** with
why it passed or failed (ampacity after derating, voltage drop, breaker
coordination), so the user can see the reasoning rather than a bare answer.

UI options: Copper / Aluminium (16 mm²+) · insulation 60 °C (equipment ≤100 A) /
75 °C / 90 °C (derate from only) · ambient temperature · number of grouped
circuits · run length · load · target volt-drop %.

## 22.4 EDM

> Two kinds of number live here and they are **not** equally trustworthy. The
> geometry is exact — kerf, wire offset, electrode undersize and minimum corner
> radius follow from the spark gap and the tool size and are right on any
> machine. Process rates are not: removal rate, wear ratio and the gap a setting
> actually opens depend on the generator, dielectric, filtration, flushing,
> electrode and workpiece. Every function touching those **takes them as
> arguments instead of assuming them**, and any default is labelled *typical*.
> Cut a test piece.

**Wire EDM**

```
wireOffset(d, gap)        = d/2 + gap
kerfWidth(d, gap)         = d + 2·gap
minInternalRadius(d, gap) = wireOffset            // the wire centre cannot get closer
cornerFits(d, gap, R)     = R >= minInternalRadius
maxWireForRadius(R, gap)  = 2(R − gap)
startHoleDiameter(d, clearancePerSide)
taperOffset(h, θ) = h·tan θ · taperAngle(h, offset)
cutArea · cutTimeMin · totalCutTimeMin · wireConsumedM · wireMassKg
BRASS_WIRE_DENSITY
```

> Programming the wire radius and forgetting the gap leaves every feature oversize
> by twice the gap — on 0.25 mm wire with a 0.04 mm gap that is 0.08 mm on a slot
> width, and it is not found until inspection.

**Sinker EDM** — `passOffset`, `electrodeUndersize`, `resultingCavity`,
`orbitRadius`, `sinkerMRR`, `sinkerTimeMin`, `wearRatioPercent`,
`electrodeWearVolume`, `electrodesNeeded`.

**Surface** — `vdiToRa`, `raToVdi`, `raToMicroinch`, `microinchToRa`,
`raToRzApprox` with `RZ_FROM_RA_TYPICAL`.
---

# PART 23 — MODULE: ENGINEERING CONSTANTS (`/dashboard/formulas`, orange)

A searchable library of **~177 formulas and constants** split across
`database.ts` (core, ~47) and `database-extended.ts` (~130).

```ts
type FormulaCategory =
  | "algebra" | "geometry" | "trigonometry" | "statistics" | "machining"
  | "turning" | "milling" | "drilling" | "threading" | "material"
  | "sheet_metal" | "pipe" | "electrical" | "physics" | "mechanics"
  | "thermal" | "fluid" | "calculus" | "finance" | "chemistry"
  | "gdt" | "welding" | "gears" | "unit";

interface FormulaEntry {
  id; name; category;
  expression: string;        // e.g. "x = (−b ± √(b²−4ac)) / 2a"
  description: string;
  variables: { symbol; name; unit? }[];
  example: { description; inputs: Record<string, number>; result: string };
  notes?: string;
  related?: string[];        // other formula ids
  calcLink?: string;         // deep link into the calculator that does this
  keywords: string[];
}
```

Shape of an entry (copy this style exactly):

```ts
{
  id: "quadratic", name: "Quadratic Formula", category: "algebra",
  expression: "x = (−b ± √(b²−4ac)) / 2a",
  description: "Solves ax² + bx + c = 0 for x.",
  variables: [v("a","Coefficient a"), v("b","Coefficient b"), v("c","Coefficient c")],
  example: { description: "2x²+5x+3=0", inputs: {a:2,b:5,c:3}, result: "x = −1 or x = −1.5" },
  keywords: ["quadratic","equation","roots","polynomial","solve"],
  calcLink: "/dashboard/scientific",
}
```

Exports: `FORMULAS`, `FORMULA_MAP`, `searchFormulas(q)`,
`getFormulasByCategory(cat)`, `CATEGORY_LABELS`, `CATEGORY_GROUPS`.

**Every entry must carry a worked example**, and there is a test
(`examples.test.ts`) asserting the stated example actually evaluates to the
stated result. `calcLink` deep-links into the matching calculator — this is why
`/dashboard/scientific` must keep its route name.

Page: search box, category chips grouped by discipline, and expandable cards
showing expression (rendered with `formatMath`), variables with units, the
example, notes, related formulas, and a "Open calculator" link.

---

# PART 24 — MODULE: TOLERANCES & GD&T (`/dashboard/tolerances`, blue)

Tabs: **ISO Fits · GD&T · Surface & Numbers**.

## 24.1 ISO 286 hole-basis fits (`tolerances/iso-fits.ts`)

All values in micrometres. Diameter ranges (mm):

```
[0,3] [3,6] [6,10] [10,18] [18,30] [30,50] [50,80] [80,120] [120,180] [180,250] [250,315] [315,400]
```

IT grades (µm per range):

```
IT6:  6  8  9 11 13 16 19 22 25 29 32 36
IT7: 10 12 15 18 21 25 30 35 40 46 52 57
IT8: 14 18 22 27 33 39 46 54 63 72 81 89
IT9: 25 30 36 43 52 62 74 87 100 115 130 140
IT11:60 75 90 110 130 160 190 220 250 290 320 360
```

Shaft fundamental deviations (µm per range):

```
c: -60 -70 -80 -95 -110 -120 -140 -150 -170 -180 -200 -210
d: -20 -30 -40 -50 -65 -80 -100 -120 -145 -170 -190 -210
e: -14 -20 -25 -32 -40 -50 -60 -72 -85 -100 -110 -125
f:  -6 -10 -13 -16 -20 -25 -30 -36 -43 -50 -56 -62
g:  -2  -4  -5  -6  -7  -9 -10 -12 -14 -15 -17 -18
h:   0 … 0
js:  ±IT/2 (special case)
k:   0  1  1  1  2  2  2  3  3  4  4  4
m:   2  4  6  7  8  9 11 13 15 17 20 21
n:   4  8 10 12 15 17 20 23 27 31 34 37
p:   6 12 15 18 22 26 32 37 43 50 56 62
r:  10 15 19 23 28 34 41 48 55 63 70 78
s:  14 19 23 28 35 43 53 59 68 79 88 98
```

Two rules that must be implemented exactly:

> **Range boundaries are inclusive at the top.** ISO 286 steps read "over X up to
> **and including** Y". Treating the top as exclusive pushes every common size —
> 3, 6, 10, 18, 30, 50 — into the next step and widens the band: 30 H7 reads
> 0/+25 µm where the standard gives 0/+21 µm. Use `>= min && <= max`.

> **Shafts a–h are tabulated by their upper deviation (es); j–z by their lower
> (ei).** Deciding by the *sign* of the table value misreads `k` at the sizes
> where it is exactly 0. Use an explicit set:
> `UPPER_DEVIATION_LETTERS = {a,b,c,d,e,f,g,h}`.

```ts
calcFit(nominalDia, holeLetter, holeGrade, shaftLetter, shaftGrade): FitResult
FitResult {
  nominalDia, holeUpper, holeLower, shaftUpper, shaftLower,   // µm
  maxClearance, minClearance,        // negative minClearance = interference
  fitType: "clearance"|"transition"|"interference",
  holeMax, holeMin, shaftMax, shaftMin,   // mm
  holeTolerance, shaftTolerance
}
COMMON_FITS = [
  H7/h6 "Sliding fit", H7/g6 "Close running fit", H8/f7 "Free running fit",
  H9/d9 "Loose running fit", H11/c11 "Very loose fit",
  H7/k6 "Transition fit (location)", H7/m6 "Transition fit (tight)",
  H7/n6 "Transition/light interference", H7/p6 "Light press fit",
  H7/r6 "Medium press fit", H7/s6 "Heavy press fit"
]
SHAFT_LETTERS, AVAILABLE_GRADES
```

UI: nominal diameter, hole letter+grade, shaft letter+grade, a preset picker of
`COMMON_FITS`, and a result panel with the limits in both µm and mm plus a
clearance/interference bar drawn to scale.

## 24.2 GD&T (`tolerances/gdt.ts`)

`GDT_SYMBOLS` and `GDT_CATEGORIES` — the fourteen characteristics grouped as
Form (straightness, flatness, circularity, cylindricity), Profile (line,
surface), Orientation (angularity, perpendicularity, parallelism), Location
(position, concentricity, symmetry), Runout (circular, total) — each with symbol,
name, datum requirement, tolerance-zone description, and usage note.

## 24.3 Surface & Numbers (`tolerances/surface.ts`)

`SURFACE_FINISHES` (N-grades ↔ Ra µm ↔ µin ↔ typical process),
`raToMicroinch` / `microinchToRa`, and `PREFERRED_NUMBERS` (R5/R10/R20/R40 Renard
series).

---

# PART 25 — MODULE: ENGINEERING DATABASE (`/dashboard/materials`, purple)

Tabs: **Materials · Threads · Drills · Cutting Data** — reference data, searchable
and filterable.

```ts
// engdb/materials.ts
interface MaterialProfile {
  id; name; category: "steel"|"aluminum"|"copper"|"other_metal"|"plastic";
  density;                      // kg/m³
  yieldStrength?;               // MPa
  tensileStrength?;             // MPa
  hardness?;                    // "120–160 HB"
  elasticModulus?;              // GPa
  thermalConductivity?;         // W/(m·K)
  electricalConductivity?;      // % IACS
  meltingPoint?;                // °C
  machinability?;               // % (100 = B1112 baseline)
  applications: string; notes?: string;
}
```

Example row — Mild Steel (A36): density 7850, yield 250, tensile 400,
120–160 HB, E 200 GPa, k 51, melting 1425 °C, machinability 72,
applications "Structural, general fabrication, frames, brackets".
Carbon Steel 1018: 7870 / 370 / 440 / 126 HB / 205 / 51 / 1450 / 78.

Also `THREAD_DB` + `THREAD_STANDARDS`, `DRILL_SIZES` + `DRILL_TYPES` +
`DRILL_TYPE_LABELS` (fractional, number, letter, metric), `CUTTING_DATA`,
`MATERIAL_CATEGORIES`, `MATERIAL_MAP`.

> **Cross-module consistency is a tested requirement.** The density a material
> carries here and in `materials/database.ts` must agree, so the same alloy gives
> the same weight in the Weight module and the same figures in the Database.
> `engdb.test.ts` and `materials/consistency.test.ts` enforce it.

---

# PART 26 — MODULE: TAP DRILL CHART (`/dashboard/tap-drill`, amber)

Reference table plus a fast search, sourced from Machinery's Handbook 30th ed.,
ISO 724 / ANSI B1.1 / ASME B1.20.1, with clearance drills per ISO 273.

```ts
type ThreadSystem = "iso-coarse" | "iso-fine" | "unc" | "unf" | "npt" | "bsp";

interface TapDrillEntry {
  id;                    // "m6x1", "unc-1-4-20", "npt-1-8-27"
  system; designation;   // "M6 × 1", "¼-20 UNC", "⅛-27 NPT"
  majorDiaMm; majorDiaIn;
  pitchMm: number | null;      // metric
  tpi: number | null;          // imperial
  tapDrillMm; tapDrillIn;      // "5.0 mm", "#7", "7/32″"
  clearanceCloseMm; clearanceMediumMm; clearanceFreeMm;   // ISO 273
  minorDiaMm; …
}
searchThreads(query, entries?) · filterBySystem(system|"all", entries?) · getThread(id)
formatMm · mmToInches · formatIn
```

Search must be forgiving of how a machinist types at the bench:
`normalise()` lowercases and folds `× ✕ → x`, en/em dashes → `-`, smart quotes →
`" '`, collapses whitespace and commas. Extra aliases map shorthand to entries:

```
"unc-1-4-20" → quarter, 1/4, 0.25, 250      "unc-1-8" → one inch, 1in
"npt-1-8-27" → pipe eighth
m6x1 → 6mm    m8x1-25 → 8mm    m10x1-5 → 10mm    m12x1-75 → 12mm
```

UI: a system filter row (**All** + the six systems), a search box, and a results
table showing designation, major diameter, pitch/TPI, tap drill (mm **and** inch
designation), minor diameter, and the three clearance drills — every figure in
both units.

---

# PART 27 — MODULE: CAD CONVERTER (`/dashboard/dxf-converter`, cyan, **beta v0.2**)

Drop in a file, get CAD geometry back — **entirely on the device, nothing uploaded**.

## 27.1 Format registry (`lib/cad/registry.ts`)

```ts
type FormatKind = "vector" | "raster" | "mesh" | "toolpath" | "data";
interface CadFormat { id; label; extensions: string[]; kind; supported: boolean; advice? }
```

| id | label | extensions | kind | supported |
|---|---|---|---|---|
| `dxf` | DXF drawing | dxf | vector | ✅ |
| `svg` | SVG vector | svg | vector | ✅ |
| `pdf` | PDF drawing | pdf | vector | ✅ |
| `raster` | Image | png jpg jpeg bmp webp gif | raster | ✅ |
| `stl` | STL mesh | stl | mesh | ✅ |
| `gcode` | G-code program | nc gcode tap ngc cnc mpf gco | toolpath | ✅ |
| `coordinates` | Coordinate list | csv txt xyz pts | data | ✅ |
| `dwg` | DWG drawing | dwg | vector | ❌ |
| `step` | STEP / IGES model | step stp iges igs | mesh | ❌ |
| `native` | Native CAD part | sldprt sldasm ipt iam prt catpart 3dm dgn f3d | mesh | ❌ |

Unsupported formats are **recognised, not crashed on**, and carry advice:

- DWG — *"DWG is AutoCAD's own closed format and cannot be read on the device. In
  AutoCAD, LibreCAD, or the free ODA File Converter, save the drawing as DXF and
  bring that here."*
- STEP/IGES — *"STEP and IGES describe solids with curved surfaces, which needs a
  geometry kernel this app does not carry. Export the part as STL from your CAD
  and bring that here — a cross-section of it can be taken."*
- Native — *"This is a single CAD package's own format. Export it as STL, DXF or
  PDF from the program that made it."*

```ts
extensionOf(name) · formatFor(name) · ACCEPTED (the input accept string)
loadDrawing(file): Promise<Drawing>   // { format, summary, paths, warnings }
toSvgFile(paths)
```

## 27.2 Importers

- **DXF** (`dxf-import.ts`) — LINE, CIRCLE, ARC, LWPOLYLINE (incl. **bulge**
  arcs), POLYLINE (old-style), SPLINE, ELLIPSE, and **BLOCK/INSERT** expansion
  with transforms. Fixtures exist for blocks, bulges, curves, old polylines and
  primitives.
- **SVG** (`parseSvg`) — path/line/rect/circle/polyline/polygon with full
  `transform` matrix support (`parseTransform`, `multiply`, `applyMatrix`).
- **PDF** (`pdf-import.ts`) — pdf.js operator-list walk extracting real vector
  paths, not a raster of the page.
- **Raster** (`traceRasterContours`, `centerline.ts`) — `otsuThreshold` →
  `binarize` → `thin` (skeletonise) → `traceCenterlines`, with
  `meanStrokeWidth` and `looksLikeLineDrawing` to warn when a photo is not a
  line drawing.
- **STL** (`stl-import.ts`) — `parseStl` (binary + ASCII), `sliceStl` at a Z
  height, `flattenStl` for an outline.
- **G-code** (`gcode-import.ts`) — `parseGcode` → paths, `subpathToPaths`.
- **Coordinates** (`parseCoordinateText`) — CSV/TXT/XYZ/PTS point lists.

## 27.3 Geometry post-processing (`lib/dxf-converter.ts`)

```ts
DxfPoint · DxfPath · DrawingBounds · CadGeometryStats
LinePrimitive · ArcPrimitive · SplinePrimitive · CadPrimitive
isFullTurn(arc)
fitPrimitives(path, tolerance)       // polyline → lines + arcs + splines
analyzeCadGeometry(paths, tolerance = 0.8)
toSvgPathData(paths, tolerance) · getBounds(paths) · isTraced(paths)
createDxf(...)      // modern DXF
createDxfR12(...)   // R12 fallback for old controls and cheap CAM
```

## 27.4 Page flow

1. **Drop a file** — drag-and-drop zone + file input using `ACCEPTED`; on load,
   show `Read as {format.label} — {summary}`, plus any warnings.
2. **Set up the drawing** — units, scale, arc-fitting tolerance, centreline
   options for raster input, layer handling.
3. **CAD preview** — pan/zoom SVG render with bounds and entity counts, then
   export **DXF** (modern or R12) or **SVG**.

---

# PART 28 — MODULE: WORKSPACE (`/dashboard/workspace`, cyan)

Real project folders for jobs, assembled from history rather than from each
calculator learning about projects.

```ts
interface Project {
  id; name; client; jobNumber; description;
  company; revision;      // title-block fields — an engineering sheet is not
  preparedBy; checkedBy;  // worth much without a revision and a name on it
  tags: string[];
  createdAt; updatedAt; isPinned; isArchived;
  calculations: SavedCalc[];
  notes: string;          // markdown-like plain text
  variables: ProjectVar[];
}
interface SavedCalc { id; module; moduleLabel; title;
                      inputs: Record<string,string>; outputs: Record<string,string>; createdAt }
interface ProjectVar { id; name; value; unit }
```

`createProject(name, template?)` seeds `revision: "A"`, empty title-block fields,
and `notes: "# Project Notes\n\n"`.

## 28.1 Templates

| id | name | description | variables | notes |
|---|---|---|---|---|
| `cnc_job` | CNC Job | CNC machining job with material and cutting parameters | Material = Aluminum 6061, Stock Size (mm), Quantity = 1 pcs | checklist: Material ordered / Program verified / First article approved / Production run complete |
| `fab_estimate` | Fabrication Estimate | Material cost and fabrication estimate | Material, Price/kg ($/kg), Quantity = 1 pcs, Labor Rate ($/hr) | `## Materials / ## Labor / ## Total` |
| `mech_design` | Mechanical Design | Stress analysis and component design | Material, Yield Strength (MPa), Safety Factor = 2.0 | `## Requirements / ## Analysis / ## Results` |
| `material_est` | Material Estimate | Material weight and cost estimation | Material = Mild Steel, Density = 7850 kg/m³ | `## Items / ## Summary` |
| `sheet_metal` | Sheet Metal Project | Sheet metal bending and layout | Material, Thickness (mm), K-Factor = 0.33 | `## Bends / ## Flat Pattern / ## Notes` |

## 28.2 Report engine (`workspace/report.ts`) — pure, therefore testable

```ts
historyToCalc(entry): Omit<SavedCalc,"id"|"createdAt">
alreadyInProject(project, entry): boolean    // same module + title + identical outputs
pairs(map): string                            // "key = value, key = value" on one line
csvCell(value) · csvRow(cells) · projectToCSV(project)
parseProjectJSON(text): Project               // rejects non-project JSON with a reason
fileStem(name)
```

> **CSV quoting is RFC 4180.** Engineering values are full of the characters that
> break a naive join — a comma in "1,200", a quote mark meaning inches, a newline
> in a note. Any cell containing one is wrapped and embedded quotes are doubled.

## 28.3 UI

Project list with pin / duplicate / archive / delete and a template picker on
create. Inside a project, three tabs:

- **Overview** — title block fields, tags, variables table (name / value / unit),
  and saved calculations with per-row remove.
- **Notes** — free-text editor.
- **Report** — a `print-document` engineering sheet: title block (company,
  project, client, job number, revision, prepared by, checked by, date),
  variables table, and every saved calculation with its inputs and outputs, ready
  to print (see §3.8) or export.

**Add from history** (`components/workspace/add-from-history.tsx`) — pick entries
from the shared history and push them into the project, greying out anything
`alreadyInProject`. Export JSON and CSV; import JSON with validation.

---

# PART 29 — SYSTEM MODULES

## 29.1 Favorites (`/dashboard/favorites`)

Pinned modules plus starred history entries, grouped by module, each row
re-openable in the module that produced it.

## 29.2 History (`/dashboard/history`)

Every calculation from every module: module label badge, title, detail line,
relative time, expandable inputs/outputs, copy, star, delete. Search across
titles, details, inputs and outputs. Clear-per-module and clear-all, both
confirmed.

## 29.3 Settings (`/dashboard/settings`)

- **Account** — username, plan, expiry, device; sign out.
- **Data Management** — Local Storage size (`getStorageSize` + `formatBytes`),
  **Export Backup** (downloads a JSON of every app key), **Import Backup**
  (validated before anything is overwritten).
- **Danger Zone** — *Clear Local Data* ("Clear all local data?") and
  *Reset App* ("Reset MachinistPro?"), both requiring explicit confirmation with
  a second click.

---

# PART 30 — PUBLIC PAGES

## 30.1 Landing page (`/`)

`gradient-bg grid-pattern` over `bg-dark-950`. In order:

1. **Nav** — logo, WhatsApp "Buy Subscription", Sign In / Dashboard.
2. **Hero** — version pill `v1.0.0-rc1 — Now Available` with a pulsing dot;
   `<h1>` *"Precision tools for"* / *"modern machinists"* (second line in the
   cyan→blue→purple text gradient); the positioning paragraph; then CTAs —
   authenticated users get **Open Dashboard** + **View Account**, visitors get the
   trial button (`Start 14-Day Free Trial` / `Continue Trial · N days left`) and
   **Sign In**. Blocked trials show the reason in red.
3. **Stat tiles** — four bordered cards with a cyan icon, a big number and an
   uppercase label.
4. **Feature grid** — Scientific Calculator, Unit Converter, Material Weight,
   Geometry Tools, Price Estimator, closing with *"And more engineering tools
   inside"*.
5. **CTA panel** — rounded, bordered, with a gradient wash.
6. **Footer** — About · FAQ · Privacy · Terms · Contact, plus a copyright line.

## 30.2 Login (`/login`)

Username-or-email, password with reveal, remember-me, submit; the trial button;
and distinct inline errors for invalid credentials, suspended account, expired
subscription, and device lock. Shake animation on failure.

## 30.3 `/about`, `/faq`, `/contact`, `/privacy`, `/terms`

Static pages on the shared `InfoPage` layout. Contact carries the WhatsApp deep
link.

## 30.4 Support link (`lib/support.ts`)

```ts
SUPPORT_WHATSAPP_NUMBER = "+92 314 2839944"
whatsappLink(message = "Hi! I'd like to buy a MachinistPro subscription.")
  = `https://wa.me/923142839944?text=${encodeURIComponent(message)}`
```

## 30.5 Site-wide notices

`AnnouncementBanner` reads `getSiteSettings()` and renders a dismissible bar at
the very top for every visitor. Maintenance mode replaces the site with a
maintenance screen. Both fail **open** — any error falls back to defaults rather
than blocking the app.

---

# PART 31 — TESTING REQUIREMENTS

Vitest, test file beside each engine. Minimum coverage:

| Area | Must test |
|---|---|
| `calculator` | tokenizer, implicit multiplication, RPN precedence and right-assoc `^`, angle modes, parenthesis auto-close, friendly errors, statistics/matrix/complex/programmer/polynomial results |
| `converter` | every category round-trips (`convert(convert(v, a, b), b, a) ≈ v`), temperature function pairs, formatting bounds |
| `materials` | every shape's volume against a hand-computed value; hex bar against stock tables (30 mm steel = 6.12 kg/m); wall-thickness guards throw; gauge lookups and out-of-range messages; cost breakdown arithmetic; volume-unit auto-selection; custom material validation; **cross-module density consistency** |
| `machining` | RPM/feed/MRR/power against textbook values; both minor diameters; chip thinning at and below 50% engagement; bolt-circle coordinates incl. axis snapping and the >200/non-integer throws; taper; speed-band overrides; spindle clamping propagating to feed |
| `tapping` | feed = pitch × rpm; engagement constant against chart sizes (M6, M8, M10); lead lengths per tap style; blind-hole shortfall |
| `cnc` | G71 pass list for external and internal; Type II detection; profile coordinates and reversal; every generated cycle's block text; **the checker's `missing-decimal` rule**; arc geometry; profile fuzzing |
| `tolerances` | 30 H7 = 0/+21 µm (boundary inclusivity); `k` shafts at sizes where the deviation is 0; each `COMMON_FITS` preset classifies correctly |
| `electrical` | Ohm/power identities; PF correction; motor FLC and slip; IEC and NEC sizing against known table answers; derating factors; breaker selection |
| `industrial` | bend allowance/deduction; **flat pattern differs correctly between flange and outside legs**; weld weights; gear and belt geometry |
| `geometry` | 2D/3D shape values; coordinate conversions round-trip; polygon shoelace area; dangling-coordinate detection |
| `level` | tilt composition; calibration; slope unit formatting; resting-edge detection from gravity vectors |
| `cad` | each importer against its fixture (`blocks.dxf`, `bulge.dxf`, `curves.dxf`, `oldpoly.dxf`, `primitives.dxf`, `box.stl`, `box-ascii.stl`, `cylinder.stl`, `drawing.pdf`); primitive fitting; DXF/R12 output re-parses |
| `workspace` | CSV quoting (comma, quote, newline); `parseProjectJSON` rejects foreign JSON; `alreadyInProject` |
| `auth` | password hash/verify round-trip, `needsRehash`, session issue/validate/expire/revoke, `/api/auth/health` and `/api/auth/session` handlers, auth store logout clearing storage even when the network call fails |
| `formulas` | every entry's stated example evaluates to its stated result |

---

# PART 32 — CONFIGURATION AND DEPLOYMENT

## 32.1 Environment variables

```
# Supabase — server
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only, never in the client bundle

# Supabase — client mirror (Vite inlines these)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

# Upstream auth identity
MUGHAL_APP_NAME=MachinistPro
MUGHAL_OWNER_ID=
MUGHAL_VERSION=1.0
# MUGHAL_APP_SECRET — pepper fallback

# Peppers — an explicit random 64+ char hex is recommended.
# SESSION_PEPPER falls back to MUGHAL_APP_SECRET, then SUPABASE_SERVICE_ROLE_KEY[0:32]
SESSION_PEPPER=
TRIAL_PEPPER=

# Optional
VITE_GA_ID=
```

Two Supabase clients: `client.ts` (browser, publishable key) and
`client.server.ts` (service role, **dynamically imported inside server handlers
only** so it can never be bundled into client code).

## 32.2 Vercel (`vercel.json`)

```json
{
  "version": 2, "framework": null,
  "installCommand": "npm install", "buildCommand": "npm run build",
  "regions": ["iad1"],
  "headers": [
    { "source": "/api/(.*)", "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" } ] },
    { "source": "/(.*)", "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" } ] }
  ]
}
```

## 32.3 Tooling notes

- `routeTree.gen.ts` is generated — never hand-edit it and exclude it from
  Prettier via `.prettierignore`.
- ESLint flat config with typescript-eslint, react-hooks, react-refresh, and
  prettier; the build must pass `npm run lint` clean.
- Error capture (`lib/error-capture.ts`) + branded error page
  (`lib/error-page.ts`) are installed at the server entry.

---

# PART 33 — ACCEPTANCE CHECKLIST

**Correctness**

- [ ] Every engine has passing Vitest tests, including the specific cases in §31
- [ ] 30 H7 reads 0/+21 µm; hex bar 30 mm steel reads 6.12 kg/m; M8 reports both
      minor diameters (6.647 D1 and 6.466 d3) each labelled for its job
- [ ] Feed, MRR, power and cycle time are computed from the **clamped** spindle
      speed, never the requested one
- [ ] Flat pattern gives different lengths for flange legs and outside legs
- [ ] The CNC checker flags every distance word written without a decimal point,
      and the built-in sample program passes it clean
- [ ] No screen can render `NaN`, `Infinity`, or a blank result; bad input always
      produces a plain-language message

**Product**

- [ ] All 19 registry modules are reachable from the sidebar, the dashboard grid
      and global search, and each computes with correct, unit-labelled results
- [ ] Every calculation writes to the shared history store, and History,
      Favorites and Workspace all populate from it
- [ ] Workspace reports print as a clean A4 engineering sheet (white paper, black
      ink, header repeated across pages, no sidebar)
- [ ] CAD Converter reads DXF, SVG, PDF, images, STL, G-code and coordinate lists
      locally, and gives actionable advice for DWG / STEP / native formats
- [ ] Backup export → clear → import restores every setting and record

**Licensing and security**

- [ ] Trial: 14 days, one per device forever, max 3 per IP, resumes rather than
      restarts, and signing out never costs remaining days
- [ ] Device limit enforced; suspended and expired accounts each get their own
      message; admin changes take effect on live sessions immediately
- [ ] Session tokens exist in the database only as peppered hashes and are never
      logged
- [ ] The service-role key does not appear anywhere in the client bundle
- [ ] Login treats the identifier as an operand, and two accounts sharing an
      identifier cannot lock each other out

**Experience**

- [ ] Works one-handed on a phone at the machine and full-width on a desktop
- [ ] Light and dark themes are both fully legible, including every accent
- [ ] The custom cursor is invisible on touch devices and native cursors return
- [ ] Copy protection never blocks typing, selecting, or copying inside an input
