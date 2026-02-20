# Green Arrow OS — Design System

## Design Philosophy
**Modern Dark Minimalist.** Inspired by Vercel/Linear. Zero decoration. Maximum signal-to-noise. One accent color only: Cyber Green.

---

## 1. Color Tokens

### Surfaces
| Token | Value | Usage |
|---|---|---|
| `bg-background` | `#000000` | Page root, body |
| `bg-surface` | `#0A0A0A` | Cards, modals, sidebar |
| `bg-surface-hover` | `#171717` | Table row hover, menu hover |

### Borders
| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `neutral-800` / `border-white/5` | All cards, inputs, dividers |

### Typography
| Token | Value | Usage |
|---|---|---|
| `text-primary` | `#FFFFFF` | H1/H2 titles, key data |
| `text-secondary` | `#A3A3A3` (`neutral-400`) | Body copy, labels |
| `text-muted` | `#525252` (`neutral-600`) | Placeholders, inactive |

### Accent & Status
| Token | Value | Usage |
|---|---|---|
| `accent` | `#00E676` | One primary action per screen |
| `status-error` | `#EF4444` | Failed dispatches |
| `status-warning` | `#F59E0B` | Paused, rate limit |

---

## 2. Typography

- **Font Family**: Inter (system-ui fallback)
- **Mono Font**: JetBrains Mono / Fira Code (for logs, IDs, timestamps)
- **Headers**: `font-semibold tracking-tight text-white`
- **Body**: `font-normal text-neutral-400`
- **Mono data**: `font-mono text-xs text-neutral-400`

---

## 3. Component Tokens

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-[#00E676] text-black font-medium rounded-lg px-4 py-2 hover:brightness-110 active:scale-[0.98] transition-all duration-200` |
| Secondary | `bg-transparent border border-neutral-800 text-white rounded-lg px-4 py-2 hover:bg-neutral-900 transition-all duration-200` |
| Ghost | `text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg px-4 py-2 transition-all duration-200` |

### Inputs
```
bg-black border border-neutral-800 text-white rounded-lg px-3 py-2
placeholder:text-neutral-600
focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600
transition-colors duration-200
```

### Cards
```
bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6
```

### Badges
| Status | Classes |
|---|---|
| Online/Running | `bg-[#00E676]/10 text-[#00E676] rounded-full text-xs font-medium px-2.5 py-0.5` + ping dot |
| Error | `bg-red-500/10 text-red-500 rounded-full text-xs font-medium px-2.5 py-0.5` |
| Warning | `bg-amber-500/10 text-amber-500 rounded-full text-xs font-medium px-2.5 py-0.5` |
| Idle | `bg-neutral-800 text-neutral-400 rounded-full text-xs font-medium px-2.5 py-0.5` |

---

## 4. Layout Rules
- **Sidebar**: `w-[220px] bg-black border-r border-neutral-900`
- **Main content**: `flex-1 max-w-6xl mx-auto px-8 py-10`
- **Whitespace**: Minimum `gap-6` between sections, `p-6` minimum in cards

## 5. Rules & Constraints
- ❌ No `box-shadow`, no blur effects, no glassmorphism
- ❌ No gradients on backgrounds
- ✅ One `bg-[#00E676]` primary button per screen only
- ✅ All hover states use `transition-all duration-200 ease-out`
- ✅ All interactive rows: `hover:bg-neutral-800/50 cursor-pointer`
