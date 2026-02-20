---
description: Green Arrow design system rules for all UI development
---

# Green Arrow Design System

**Every** UI element in this project must follow these rules. No exceptions.

## 1. CSS Variables — always use, never hardcode

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0d0d0f` | Page background |
| `--surface` | `#141416` | Card / panel background |
| `--surface-2` | `#1a1a1d` | Elevated surface, hover states |
| `--border` | `rgba(255,255,255,0.07)` | Default border |
| `--border-2` | `rgba(255,255,255,0.12)` | Emphasized border |
| `--green` | `#00d26a` | Primary CTA, accents |
| `--green-dim` | `rgba(0,210,106,0.12)` | Subtle green backgrounds |
| `--text-1` | `#f0f0f2` | Headings, important labels |
| `--text-2` | `#8a8a96` | Body text, secondary labels |
| `--text-3` | `#52525c` | Muted text, placeholders |
| `--font` | DM Sans | All UI text |
| `--mono` | DM Mono | Code, numbers, timestamps |

**❌ Forbidden:** Tailwind color classes like `text-white`, `bg-neutral-900`, `text-[#00E676]`, `border-neutral-800`.  
**✅ Required:** Inline styles with `color: 'var(--text-1)'` or CSS variable references.

## 2. Button Classes

Always use one of these predefined classes — **never style buttons ad-hoc**:

```html
<button class="btn-primary">Primary action</button>
<button class="btn-secondary">Secondary action</button>
<button class="btn-ghost">Ghost / cancel</button>
<button class="btn-danger">Destructive action</button>
```

## 3. Form Inputs

Always use the `.input` class. Do not apply padding, border, or background manually:

```html
<input class="input" type="text" placeholder="..." />
<textarea class="input" />
<select style="background: var(--surface-2); border: 1px solid var(--border); ...">
```

Selects need inline override since they don't pick up `.input` reliably. Use the pattern from the page files.

## 4. Cards

Use the `.card` class for surfaces OR the `sCard` inline style constant:

```tsx
const sCard: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
};
```

## 5. Topbar Actions

Pages that have page-specific action buttons MUST inject them via `useTopbarActions`:

```tsx
const { setActions } = useTopbarActions();

useEffect(() => {
    setActions(<button className="btn-primary" onClick={handleCreate}>Nova Ação</button>);
    return () => setActions(null);
}, [setActions, handleCreate]);
```

Never render a standalone header with action buttons inside the page content area.

## 6. Typography

| Element | Style |
|---|---|
| Page heading | `fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)'` |
| Page subtitle | `fontSize: 13.5, color: 'var(--text-2)', marginTop: 4` |
| Section label | `fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em'` |
| Body text | `fontSize: 13, color: 'var(--text-2)'` |
| Monospace values | `fontFamily: 'var(--mono)', fontSize: 12` |

## 7. Modals

```tsx
<div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
    <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', ... }}>
        {/* Header */}
    </div>
    <div style={{ padding: '20px 22px', ... }}>
        {/* Content */}
    </div>
    <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost">Cancelar</button>
        <button className="btn-primary">Confirmar</button>
    </div>
</div>
```

## 8. Empty States

Use the shared `<EmptyState>` component from `@/components/ui`:

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
    icon={SomeLucideIcon}
    title="Nenhum item ainda"
    description="Descrição clara da situação e como resolver."
    actionLabel="Criar Primeiro Item"
    onAction={() => setView('create')}
/>
```

## 9. Animations

- Entering pages/sections: `className="fade-in"` (defined in globals.css)
- Staggered list entries: `animation: 'fadeUp 0.4s ease Xs both'`

## 10. Do NOT use

- Tailwind `text-white`, `bg-black`, `text-neutral-*` — use CSS variables  
- Tailwind `bg-[#hex]` — use CSS variables  
- `text-[Npx]` — use inline `fontSize`  
- Hardcoded font-family strings — use `var(--font)` / `var(--mono)`  
- The `<Button>` component from `@/components/ui` in page files — use native `<button>` with CSS classes
