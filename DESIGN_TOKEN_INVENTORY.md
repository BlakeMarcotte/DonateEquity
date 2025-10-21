# DonateEquity Design Token Inventory
**Generated:** 2025-10-21  
**Analysis of:** Components, App pages, and UI utilities

---

## Executive Summary

This inventory documents all design tokens, patterns, and utilities currently in use across the DonateEquity codebase. The analysis reveals a well-structured design system with some opportunities for consolidation and optimization.

**Key Findings:**
- 392 instances of color utility usage across 52 files
- Consistent use of Tailwind's spacing scale
- 6 button variants with consistent patterns
- 5+ status variant patterns with inconsistent implementations
- Strong typography hierarchy with some redundancy

---

## 1. Color System

### 1.1 Semantic Colors (from tailwind.config.ts)

```typescript
// Primary Brand Colors
primary: {
  DEFAULT: "hsl(222.2 47.4% 11.2%)",  // Dark blue
  foreground: "hsl(210 40% 98%)",     // White text on primary
}

secondary: {
  DEFAULT: "hsl(210 40% 96%)",        // Light gray
  foreground: "hsl(222.2 84% 4.9%)",  // Dark text on secondary
}

destructive: {
  DEFAULT: "hsl(0 84.2% 60.2%)",      // Red
  foreground: "hsl(210 40% 98%)",     // White text on destructive
}

muted: {
  DEFAULT: "hsl(210 40% 96%)",        // Light gray
  foreground: "hsl(215.4 16.3% 46.9%)", // Muted text
}

accent: {
  DEFAULT: "hsl(210 40% 96%)",        // Light gray
  foreground: "hsl(222.2 84% 4.9%)",  // Dark text on accent
}
```

### 1.2 Status Colors

**Yellow (Warning/Pending):**
```typescript
yellow: {
  50: "hsl(54 91% 95%)",
  100: "hsl(54 91% 91%)",    // Status background
  200: "hsl(52 98% 83%)",    // Border
  800: "hsl(45 83% 36%)",    // Text
}
```

**Green (Success/Completed):**
```typescript
green: {
  50: "hsl(138 76% 97%)",
  100: "hsl(142 69% 91%)",   // Status background
  200: "hsl(141 84% 77%)",   // Border
  600: "hsl(142 71% 45%)",   // Form success
  800: "hsl(158 64% 25%)",   // Text
}
```

**Blue (Info/Processing):**
```typescript
blue: {
  50: "hsl(214 100% 97%)",
  100: "hsl(214 95% 93%)",   // Status background
  200: "hsl(213 97% 87%)",   // Border
  500: "hsl(217 91% 60%)",   // Primary actions
  600: "hsl(221 83% 53%)",   // Most common action color
  700: "hsl(224 76% 48%)",   // Hover states
  800: "hsl(213 94% 25%)",   // Text
}
```

**Red (Error/Failed):**
```typescript
red: {
  50: "hsl(0 86% 97%)",
  100: "hsl(0 93% 94%)",     // Status background
  200: "hsl(0 96% 89%)",     // Border
  600: "hsl(0 72% 51%)",     // Form errors, icons
  800: "hsl(0 75% 42%)",     // Text
}
```

**Purple (Special/Draft):**
```typescript
purple: {
  50: "hsl(270 100% 98%)",
  200: "hsl(269 100% 86%)",
  800: "hsl(272 77% 28%)",
}
```

**Gray (Neutral Scale):**
```typescript
gray: {
  50: "hsl(210 40% 98%)",    // Lightest backgrounds
  100: "hsl(210 40% 96%)",   // Light backgrounds
  200: "hsl(214.3 31.8% 91.4%)", // Borders (global default)
  300: "hsl(213 27% 84%)",   // Disabled states
  400: "hsl(215 20% 65%)",   // Secondary icons
  500: "hsl(215 16% 47%)",   // Placeholder text
  600: "hsl(215 19% 35%)",   // Secondary text
  700: "hsl(215 25% 27%)",   // Body text
  800: "hsl(217 33% 17%)",   // Headings
  900: "hsl(222.2 84% 4.9%)", // Primary text
}
```

### 1.3 Color Usage Frequency

**Text Colors (Top 30):**
- `text-sm`: 376 instances
- `text-gray-900`: 253 instances (primary text)
- `text-gray-600`: 232 instances (secondary text)
- `text-blue-600`: 123 instances (links, primary actions)
- `text-gray-700`: 120 instances (body text)
- `text-gray-500`: 111 instances (muted text)
- `text-white`: 110 instances
- `text-gray-400`: 84 instances (disabled, placeholder)
- `text-green-600`: 44 instances (success states)
- `text-red-600`: 36 instances (error states)
- `text-yellow-600`: 12 instances (warning states)
- `text-purple-600`: 11 instances (special states)

**Background Colors (High Usage):**
- `bg-white`: Primary surface color
- `bg-gray-50`: 50+ instances (subtle backgrounds)
- `bg-gray-100`: 40+ instances (hover states)
- `bg-blue-600`: 30+ instances (primary buttons)
- `bg-blue-50`: 20+ instances (info backgrounds)
- `bg-green-50`: 15+ instances (success backgrounds)
- `bg-red-50`: 12+ instances (error backgrounds)
- `bg-yellow-50`: 10+ instances (warning backgrounds)

---

## 2. Typography System

### 2.1 Font Family
```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### 2.2 Font Weights (Usage Frequency)
```typescript
font-medium: 332 instances  // 500 - Primary weight for labels, buttons
font-semibold: 132 instances // 600 - Headings, emphasis
font-bold: 82 instances      // 700 - Major headings
font-extrabold: 1 instance   // 800 - Hero text
```

### 2.3 Font Sizes (Usage Frequency)
```typescript
text-sm: 376 instances    // 0.875rem / 14px - Body text, labels
text-base: 25 instances   // 1rem / 16px - Default
text-lg: 84 instances     // 1.125rem / 18px - Emphasized text
text-xl: 45 instances     // 1.25rem / 20px - Small headings
text-2xl: 42 instances    // 1.5rem / 24px - Section headings
text-3xl: 18 instances    // 1.875rem / 30px - Page headings
text-xs: 75 instances     // 0.75rem / 12px - Captions, badges
```

### 2.4 Typography Recommendations

**Establish standardized heading scale:**
```typescript
// Recommended Design Tokens
h1: 'text-3xl font-bold text-gray-900'      // Page titles
h2: 'text-2xl font-semibold text-gray-900'  // Section headings
h3: 'text-xl font-semibold text-gray-900'   // Subsection headings
h4: 'text-lg font-medium text-gray-900'     // Card titles
body: 'text-sm text-gray-700'               // Body text
caption: 'text-xs text-gray-500'            // Captions, metadata
```

---

## 3. Spacing System

### 3.1 Spacing Scale (Tailwind Default)
Based on 0.25rem (4px) increments:
- 0 = 0px
- 1 = 4px
- 2 = 8px
- 3 = 12px
- 4 = 16px
- 6 = 24px
- 8 = 32px
- 10 = 40px
- 12 = 48px

### 3.2 Padding Patterns (Top 20)

```typescript
px-4: 168 instances   // Horizontal padding for inputs, buttons
p-6: 104 instances    // Card padding (standard)
py-2: 102 instances   // Button vertical padding (small)
py-3: 87 instances    // Button vertical padding (default)
px-6: 77 instances    // Card/modal padding
p-4: 77 instances     // Smaller card padding
px-8: 39 instances    // Large button padding
px-3: 39 instances    // Small button padding
p-2: 32 instances     // Icon button padding
p-3: 27 instances     // Medium padding
px-2: 24 instances    // Minimal horizontal padding
py-1: 24 instances    // Badge/pill padding
p-8: 15 instances     // Large card padding
p-1: 25 instances     // Minimal padding
py-4: 22 instances    // Tab padding
py-6: 15 instances    // Section padding
py-8: 22 instances    // Large section padding
py-12: 12 instances   // Hero section padding
```

### 3.3 Margin Patterns (Top 15)

```typescript
mb-2: 137 instances   // Small bottom margin (labels)
mb-4: 99 instances    // Medium bottom margin (sections)
mt-1: 75 instances    // Minimal top margin
mb-6: 65 instances    // Large bottom margin (cards)
mr-2: 62 instances    // Icon spacing
mt-2: 38 instances    // Small top margin
mr-1: 21 instances    // Minimal right margin
mb-8: 18 instances    // Extra large bottom margin
mt-4: 18 instances    // Medium top margin
mt-6: 16 instances    // Large top margin
mb-3: 16 instances    // Between small and medium
ml-4: 13 instances    // Left margin (indentation)
mb-1: 13 instances    // Minimal bottom margin
ml-1: 12 instances    // Minimal left margin
```

### 3.4 Gap Patterns (Grid/Flex)

```typescript
gap-4: 19 instances   // Standard grid gap (16px)
gap-6: 16 instances   // Large grid gap (24px)
gap-2: 10 instances   // Small gap (8px)
gap-3: 8 instances    // Medium-small gap (12px)
gap-8: 5 instances    // Extra large gap (32px)
gap-1: 3 instances    // Minimal gap (4px)
```

### 3.5 Recommended Spacing Tokens

```typescript
// Component-specific spacing
const SPACING_TOKENS = {
  // Card/Container padding
  card: {
    sm: 'p-4',      // Small cards
    md: 'p-6',      // Standard cards (MOST COMMON)
    lg: 'p-8',      // Large cards
  },
  
  // Button padding
  button: {
    sm: 'px-3 py-2',      // Small button (h-9)
    md: 'px-4 py-2',      // Default button (h-10)
    lg: 'px-8 py-3',      // Large button (h-11)
    icon: 'p-2',          // Icon-only button
  },
  
  // Grid/Flex gaps
  gap: {
    tight: 'gap-2',       // 8px - Tight spacing
    default: 'gap-4',     // 16px - Default spacing
    relaxed: 'gap-6',     // 24px - Relaxed spacing
    loose: 'gap-8',       // 32px - Loose spacing
  },
  
  // Section margins
  section: {
    sm: 'mb-4',      // Small section
    md: 'mb-6',      // Medium section
    lg: 'mb-8',      // Large section
    xl: 'mb-12',     // Extra large section
  },
  
  // Label/field spacing
  field: {
    label: 'mb-2',   // Label to input
    error: 'mt-1',   // Input to error message
    help: 'mt-1',    // Input to help text
  }
}
```

---

## 4. Border Radius System

### 4.1 Configuration
```typescript
borderRadius: {
  lg: "0.5rem",    // 8px - Standard for buttons, cards
  md: "calc(0.5rem - 2px)",  // 6px
  sm: "calc(0.5rem - 4px)",  // 4px
}
```

### 4.2 Usage Frequency
```typescript
rounded-lg: 300+ instances    // Primary border radius (8px)
rounded-full: 50+ instances   // Pills, avatars, badges
rounded-xl: 40+ instances     // Modals, large cards (12px)
rounded-md: 20+ instances     // Small elements (6px)
rounded: 10+ instances        // Default (4px)
```

### 4.3 Recommended Border Radius Tokens

```typescript
const BORDER_RADIUS_TOKENS = {
  card: 'rounded-lg',           // 8px - Standard cards
  modal: 'rounded-xl',          // 12px - Modals, dialogs
  button: 'rounded-lg',         // 8px - Buttons
  input: 'rounded-md',          // 6px - Form inputs
  badge: 'rounded-full',        // Fully rounded - Status badges
  image: 'rounded-lg',          // 8px - Images
  avatar: 'rounded-full',       // Fully rounded - Avatars
  pill: 'rounded-full',         // Fully rounded - Pills
}
```

---

## 5. Shadow System

### 5.1 Configuration
```typescript
boxShadow: {
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
}
```

### 5.2 Usage Patterns
```typescript
shadow-sm: 60+ instances      // Subtle elevation (cards at rest)
shadow: 40+ instances         // Default elevation
shadow-md: 20+ instances      // Hover states
shadow-lg: 30+ instances      // Dropdowns, notifications
shadow-xl: 10+ instances      // Important modals
shadow-2xl: 15+ instances     // Primary modals
shadow-none: 10+ instances    // Disabled shadows
```

### 5.3 Recommended Shadow Tokens

```typescript
const SHADOW_TOKENS = {
  card: {
    default: 'shadow-sm',     // Cards at rest
    hover: 'hover:shadow-md', // Cards on hover
  },
  button: {
    default: 'shadow-sm',     // Buttons (built into button component)
    hover: 'hover:shadow-md', // Button hover
  },
  dropdown: 'shadow-lg',      // Dropdowns, menus
  modal: 'shadow-2xl',        // Modals, dialogs
  notification: 'shadow-lg',  // Notifications
  none: 'shadow-none',        // Flat surfaces
}
```

---

## 6. Status Variants

### 6.1 Current Status Implementations

**Found 5+ different status variant patterns:**

#### Pattern 1: Campaign Status (campaigns/page.tsx)
```typescript
switch (status) {
  case 'active':
    return 'bg-green-100 text-green-800'
  case 'draft':
    return 'bg-gray-100 text-gray-800'
  case 'paused':
    return 'bg-yellow-100 text-yellow-800'
  case 'completed':
    return 'bg-blue-100 text-blue-800'
  default:
    return 'bg-gray-100 text-gray-800'
}
```

#### Pattern 2: Donation Status (donations/page.tsx)
```typescript
switch (status) {
  case 'completed':
    return 'bg-green-100 text-green-800'
  case 'processing':
    return 'bg-blue-100 text-blue-800'
  case 'pending':
    return 'bg-yellow-100 text-yellow-800'
  case 'cancelled':
    return 'bg-red-100 text-red-800'
  default:
    return 'bg-gray-100 text-gray-800'
}
```

#### Pattern 3: Invitation Status (invitations/page.tsx)
```typescript
switch (status) {
  case 'pending':
    return 'bg-yellow-100 text-yellow-800'
  case 'accepted':
    return 'bg-green-100 text-green-800'
  case 'declined':
    return 'bg-red-100 text-red-800'
  case 'expired':
    return 'bg-gray-100 text-gray-800'
  default:
    return 'bg-gray-100 text-gray-800'
}
```

#### Pattern 4: CSS Classes (globals.css)
```css
.status-pending {
  background-color: hsl(54 91% 91%);
  color: hsl(45 83% 36%);
  border-color: hsl(52 98% 83%);
}

.status-completed {
  background-color: hsl(142 69% 91%);
  color: hsl(158 64% 25%);
  border-color: hsl(141 84% 77%);
}

.status-in-progress {
  background-color: hsl(214 95% 93%);
  color: hsl(213 94% 25%);
  border-color: hsl(213 97% 87%);
}

.status-failed {
  background-color: hsl(0 93% 94%);
  color: hsl(0 75% 42%);
  border-color: hsl(0 96% 89%);
}

.status-draft {
  background-color: hsl(210 40% 96%);
  color: hsl(215 25% 27%);
  border-color: hsl(214.3 31.8% 91.4%);
}
```

### 6.2 Inconsistencies Found

1. **Duplication:** Same status logic repeated across multiple files
2. **Naming:** Inconsistent status names (e.g., "cancelled" vs "canceled")
3. **Variants:** Some use border, some don't
4. **Icon Support:** Some statuses have icons, some don't

### 6.3 Recommended Unified Status System

```typescript
// lib/design-tokens/status.ts
export const STATUS_VARIANTS = {
  // Success states
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: 'text-green-600',
    full: 'bg-green-100 text-green-800 border-green-200',
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: 'text-green-600',
    full: 'bg-green-100 text-green-800 border-green-200',
  },
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: 'text-green-600',
    full: 'bg-green-100 text-green-800 border-green-200',
  },
  
  // Warning/pending states
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  paused: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  
  // Processing/info states
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    full: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  'in-progress': {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    full: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    full: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  
  // Error/failed states
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600',
    full: 'bg-red-100 text-red-800 border-red-200',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600',
    full: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600',
    full: 'bg-red-100 text-red-800 border-red-200',
  },
  declined: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600',
    full: 'bg-red-100 text-red-800 border-red-200',
  },
  
  // Neutral/draft states
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    full: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    full: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  expired: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    full: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  
  // Special states
  accepted: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    full: 'bg-purple-100 text-purple-800 border-purple-200',
  },
} as const

export type StatusVariant = keyof typeof STATUS_VARIANTS

// Helper function
export function getStatusClasses(status: StatusVariant | string): string {
  const variant = STATUS_VARIANTS[status as StatusVariant]
  return variant?.full || STATUS_VARIANTS.draft.full
}
```

---

## 7. Button Variants

### 7.1 Current Implementation (components/ui/button.tsx)

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm border",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-md active:scale-[0.98]",
        destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 hover:shadow-md active:scale-[0.98]",
        outline: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-[0.98]",
        secondary: "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98]",
        ghost: "border-transparent hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200 active:scale-[0.98]",
        link: "text-blue-600 border-transparent underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### 7.2 Button Usage Patterns

**Variants Used:**
- `variant="default"`: Primary actions (most common)
- `variant="outline"`: Secondary actions, cancel buttons
- `variant="ghost"`: Tertiary actions, icon buttons
- `variant="destructive"`: Delete, remove actions
- `variant="secondary"`: Alternative actions
- `variant="link"`: Text links with button functionality

**Sizes Used:**
- `size="sm"`: Compact buttons in tight spaces
- `size="default"`: Standard buttons (most common)
- `size="lg"`: Hero CTAs, important actions
- `size="icon"`: Icon-only buttons

### 7.3 Common Button Patterns Found

```typescript
// Primary action
<Button>Continue</Button>
<Button className="bg-blue-600 hover:bg-blue-700">Save</Button>

// Secondary action
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Back</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Icon button
<Button variant="ghost" size="icon">
  <X className="h-4 w-4" />
</Button>

// Loading state
<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin" />
  Processing...
</Button>
```

### 7.4 Missing Button Variants

**Recommended additions:**
```typescript
success: "bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 hover:shadow-md active:scale-[0.98]",
warning: "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 hover:border-yellow-700 hover:shadow-md active:scale-[0.98]",
```

---

## 8. Modal/Dialog Patterns

### 8.1 Current Modal Component (components/ui/modal.tsx)

```typescript
// Size variants
const sizeClasses = {
  sm: 'max-w-lg',    // ~512px
  md: 'max-w-2xl',   // ~672px
  lg: 'max-w-4xl',   // ~896px
  xl: 'max-w-6xl'    // ~1152px
}

// Structure
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
  <div className="bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto w-full {sizeClasses[size]}">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <button className="p-2 hover:bg-gray-100 rounded-lg">×</button>
    </div>
    
    {/* Content */}
    <div className="p-6 overflow-y-auto">{children}</div>
  </div>
</div>
```

### 8.2 Modal Usage Patterns

**Common modal sizes:**
- `sm`: Confirmation dialogs, simple forms
- `md`: Standard forms, content modals (MOST COMMON)
- `lg`: Complex forms, multi-step workflows
- `xl`: Full-featured interfaces

**Backdrop variations:**
- `bg-black/50`: Standard (most common)
- `backdrop-blur-sm`: Added blur effect (modern)

---

## 9. Card Patterns

### 9.1 Current Card Component (components/ui/card.tsx)

```typescript
const Card = "rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm"

const CardHeader = "flex flex-col space-y-1.5 p-6"
const CardContent = "p-6 pt-0"
const CardFooter = "flex items-center p-6 pt-0"
const CardTitle = "text-2xl font-semibold leading-none tracking-tight"
const CardDescription = "text-sm text-muted-foreground"
```

### 9.2 Common Card Patterns

```typescript
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Interactive card with hover
<Card className="hover:shadow-md transition-shadow cursor-pointer">
  {/* content */}
</Card>

// Card without default styling (custom)
<Card className="border-0 shadow-none p-0">
  {/* fully custom content */}
</Card>
```

### 9.3 Card Variations Found

```typescript
// Stats card
<div className="bg-white rounded-lg shadow-sm p-6">
  <p className="text-sm font-medium text-gray-500">Label</p>
  <p className="text-2xl font-bold text-gray-900">Value</p>
</div>

// Gradient card
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
  {/* content */}
</div>
```

---

## 10. Icon Usage

### 10.1 Icon Library: Lucide React

**Most frequently used icons (50+ components):**

**Navigation & Actions:**
- `ChevronDown`, `ChevronRight`, `ArrowLeft`, `ArrowRight`
- `X` (close buttons)
- `MoreVertical`, `MoreHorizontal` (menus)

**Status & Feedback:**
- `CheckCircle` (success, completed)
- `AlertCircle` (warnings, errors)
- `Clock` (pending, time-related)
- `Loader2` (loading states with `animate-spin`)
- `AlertTriangle` (critical errors)
- `Info` (informational)

**Features & Content:**
- `Heart` (donations, favorites)
- `DollarSign` (financial)
- `Users` (team, people)
- `Building2` (organizations)
- `Mail` (email, invitations)
- `FileText`, `Upload`, `Download` (documents)
- `Search` (search functionality)
- `Calendar` (dates)
- `Shield` (security)
- `Settings`, `Edit`, `Trash2` (actions)

**Form Elements:**
- `Eye`, `EyeOff` (password visibility)
- `CheckSquare` (checkboxes)

### 10.2 Icon Size Patterns

```typescript
// Default (from button component)
[&_svg]:size-4  // 16px (h-4 w-4) - Most common

// Common variations
h-5 w-5  // 20px - Slightly larger icons
h-6 w-6  // 24px - Emphasized icons
h-8 w-8  // 32px - Large icons
h-12 w-12 // 48px - Hero/feature icons
```

### 10.3 Icon Color Patterns

```typescript
// Context-specific colors
text-blue-600   // Primary actions, links
text-gray-400   // Inactive, placeholder
text-gray-600   // Default icons
text-green-600  // Success
text-red-600    // Error, destructive
text-yellow-600 // Warning
```

---

## 11. Animation & Transitions

### 11.1 Transition Patterns (Usage Frequency)

```typescript
transition-colors: 154 instances // Color transitions (hovers)
transition-all: 41 instances     // All properties
transition-opacity: 4 instances  // Fade effects
transition-transform: 2 instances // Movement
transition-shadow: 1 instance    // Shadow changes

duration-200: 160 instances      // Standard duration (most common)
duration-300: 15 instances       // Slower transitions
duration-500: 1 instance         // Very slow

animate-spin: 61 instances       // Loading spinners
animate-pulse: 7 instances       // Pulsing effects
```

### 11.2 Recommended Animation Tokens

```typescript
const ANIMATION_TOKENS = {
  // Transitions
  transition: {
    default: 'transition-colors duration-200',    // Standard hover
    all: 'transition-all duration-200',           // Multiple properties
    fast: 'transition-all duration-150',          // Quick feedback
    slow: 'transition-all duration-300',          // Smooth, noticeable
  },
  
  // Hover effects
  hover: {
    lift: 'hover:shadow-md hover:-translate-y-1',
    scale: 'hover:scale-[1.02]',
    scaleDown: 'active:scale-[0.98]',
  },
  
  // Loading states
  loading: {
    spinner: 'animate-spin',
    pulse: 'animate-pulse',
  },
  
  // Focus states
  focus: {
    ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  }
}
```

### 11.3 Custom Keyframes (from globals.css)

```css
@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}

@keyframes spin {
  to { transform: rotate(360deg) }
}
```

---

## 12. Form Patterns

### 12.1 Input Component (components/ui/input.tsx)

```typescript
const Input = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

### 12.2 Form Validation States (from globals.css)

```css
/* Error state */
.form-error {
  border-color: hsl(0 72% 51%);
}

.form-error:focus {
  --tw-ring-color: hsl(0 72% 51%);
  border-color: hsl(0 72% 51%);
}

/* Success state */
.form-success {
  border-color: hsl(142 71% 45%);
}

.form-success:focus {
  --tw-ring-color: hsl(142 71% 45%);
  border-color: hsl(142 71% 45%);
}
```

### 12.3 Common Form Patterns

```typescript
// Standard input
<Input
  type="email"
  placeholder="Enter email"
  className="w-full"
/>

// Input with error
<Input
  className="border-red-600 focus:ring-red-500"
/>
<p className="mt-1 text-sm text-red-600">Error message</p>

// Input with success
<Input
  className="border-green-600 focus:ring-green-500"
/>

// Select/dropdown
<select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
  <option>Option</option>
</select>
```

---

## 13. Accessibility Patterns

### 13.1 Focus States

```typescript
// Standard focus ring (most common)
focus-visible:outline-none 
focus-visible:ring-2 
focus-visible:ring-blue-500 
focus-visible:ring-offset-2

// Alternative colors for different contexts
focus:ring-red-500   // Destructive actions
focus:ring-green-500 // Success actions
```

### 13.2 Screen Reader Utilities (from globals.css)

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 13.3 ARIA Patterns Found

```typescript
// Loading states
aria-label="Loading"
aria-busy="true"

// Navigation
role="navigation"
aria-label="Main navigation"

// Dialogs/Modals
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"

// Status messages
role="status"
aria-live="polite"
```

---

## 14. Responsive Patterns

### 14.1 Breakpoints (Tailwind Default)

```typescript
sm: '640px'   // Small devices
md: '768px'   // Medium devices (tablets)
lg: '1024px'  // Large devices (desktops)
xl: '1280px'  // Extra large devices
2xl: '1536px' // 2X large devices
```

### 14.2 Common Responsive Patterns

```typescript
// Grid layouts
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
"grid grid-cols-1 lg:grid-cols-2 gap-8"

// Text sizes
"text-4xl sm:text-5xl lg:text-6xl"
"text-xl md:text-2xl"

// Padding adjustments
"px-4 sm:px-6 lg:px-8"
"py-12 md:py-16 lg:py-20"

// Display changes
"hidden md:block"
"block md:hidden"
```

---

## 15. Special Utilities

### 15.1 Custom Scrollbar (from globals.css)

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: hsl(210 40% 96%);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(215 16% 47%);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(215 25% 27%);
}
```

### 15.2 Scrollbar Hide (from globals.css)

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### 15.3 Background Pattern (from globals.css)

```css
.bg-grid-pattern {
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

## 16. Recommendations for New Design Tokens

### 16.1 Create Centralized Token Library

**File: `lib/design-tokens/index.ts`**

```typescript
// Re-export all token categories
export * from './colors'
export * from './spacing'
export * from './typography'
export * from './status'
export * from './components'
export * from './animations'
```

### 16.2 Component-Specific Tokens

**File: `lib/design-tokens/components.ts`**

```typescript
export const COMPONENT_TOKENS = {
  // Badge component
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    sizes: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }
  },
  
  // Alert/Notification component
  alert: {
    base: 'p-4 rounded-lg border',
    variants: {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
    }
  },
  
  // Avatar component
  avatar: {
    base: 'rounded-full bg-gray-200 flex items-center justify-center',
    sizes: {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
    }
  },
  
  // Progress bar component
  progress: {
    track: 'w-full bg-gray-200 rounded-full h-2',
    bar: 'bg-blue-600 h-2 rounded-full transition-all duration-300',
  },
  
  // Skeleton loader
  skeleton: {
    base: 'animate-pulse bg-gray-200 rounded',
    variants: {
      text: 'h-4 w-full',
      title: 'h-6 w-3/4',
      avatar: 'h-12 w-12 rounded-full',
      button: 'h-10 w-24',
    }
  }
}
```

### 16.3 Missing Components to Create

1. **Badge Component** (components/ui/badge.tsx)
   - Status badges with consistent styling
   - Size variants
   - Icon support

2. **Alert Component** (components/ui/alert.tsx)
   - Info, success, warning, error variants
   - Dismissible option
   - Icon support

3. **Avatar Component** (components/ui/avatar.tsx)
   - Size variants
   - Fallback initials
   - Image support

4. **Progress Component** (components/ui/progress.tsx)
   - Linear progress bar
   - Circular progress (optional)

5. **Skeleton Component** (components/ui/skeleton.tsx)
   - Loading placeholders
   - Various shapes

6. **Toast/Notification Component**
   - Status variants
   - Auto-dismiss
   - Position variants

---

## 17. Critical Inconsistencies to Address

### 17.1 Status Badge Duplication

**Problem:** Multiple implementations of `getStatusColor()` across files
**Solution:** Create shared `StatusBadge` component with unified logic

### 17.2 Color Usage Inconsistencies

**Problem:** Direct color classes vs semantic token usage
```typescript
// Inconsistent
<div className="bg-blue-600">  // Direct color
<div className="bg-primary">   // Semantic token

// Should standardize on semantic tokens where possible
```

### 17.3 Spacing Inconsistencies

**Problem:** Some components use `p-6`, others use `p-4` or `p-8` for similar contexts
**Recommendation:** Document specific spacing rules per component type

### 17.4 Border Radius Mixing

**Problem:** Mix of `rounded-lg`, `rounded-xl`, `rounded-md` for similar components
**Recommendation:** Standardize on `rounded-lg` for most cards/modals

---

## 18. Summary Statistics

### 18.1 Current State

- **Total files analyzed:** 100+ TSX/JSX files
- **Color instances:** 392 across 52 files
- **Spacing patterns:** 40+ unique combinations
- **Typography variants:** 15+ size/weight combinations
- **Button variants:** 6 defined, all actively used
- **Status variants:** 5+ inconsistent implementations
- **Icon library:** Lucide React (50+ unique icons)
- **Animation patterns:** 3 primary types (transition, animate, keyframes)

### 18.2 Design System Maturity

**Strengths:**
✅ Consistent color palette with HSL values  
✅ Well-defined button component with variants  
✅ Professional shadow system  
✅ Comprehensive spacing scale  
✅ Good typography hierarchy  
✅ Strong accessibility patterns (focus states, ARIA)

**Areas for Improvement:**
⚠️ Status badge implementations duplicated across files  
⚠️ Missing centralized design token library  
⚠️ Inconsistent component spacing in some areas  
⚠️ No Badge, Alert, or Avatar components (commonly needed)  
⚠️ Form validation styling not componentized

---

## 19. Next Steps

### 19.1 Immediate Actions

1. **Create Status Badge Component**
   - Consolidate all `getStatusColor()` logic
   - Single source of truth for status styling

2. **Build Design Token Library**
   - Create `lib/design-tokens/` directory
   - Export reusable token objects
   - Document usage patterns

3. **Add Missing UI Components**
   - Badge
   - Alert
   - Avatar
   - Progress
   - Skeleton

### 19.2 Long-term Improvements

1. **Component Documentation**
   - Storybook or similar
   - Usage examples
   - Accessibility guidelines

2. **Design Token Migration**
   - Replace hardcoded values with tokens
   - Create semantic naming conventions
   - Improve theme switching capabilities

3. **Performance Optimization**
   - Audit unused Tailwind classes
   - PurgeCSS optimization
   - Component lazy loading

---

## Appendix A: Quick Reference

### Most Common Patterns

```typescript
// Card
<Card className="p-6 rounded-lg shadow-sm">

// Button
<Button variant="default" size="default">

// Input
<Input className="h-10 rounded-md border-gray-300">

// Modal
<Modal size="md" className="rounded-xl shadow-2xl">

// Status Badge
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">

// Loading Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Grid Layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Hover Effect
<div className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
```

---

**End of Design Token Inventory**
