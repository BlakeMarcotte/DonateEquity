# UI Design System Task for DonateEquity Platform

## Context

DonateEquity is a **professional financial platform** that enables pre-committed equity donations to nonprofits upon liquidity events. This is a high-trust, enterprise-grade application used by:

- **Donors**: Tech professionals donating pre-IPO equity
- **Nonprofits**: Organizations managing campaigns and receiving donations
- **Appraisers**: Professional valuators assessing equity worth
- **Admins**: Platform administrators

The platform handles sensitive financial transactions and legal documentation, so the design must convey **trust, professionalism, and credibility** while remaining modern and user-friendly.

## Current Design

We currently have a clean, professional design system with:
- Subtle borders and shadows
- Blue primary color (#2563eb - blue-600)
- Soft color palette for status indicators (green for success, red for errors, etc.)
- Rounded corners (rounded-lg)
- Minimalist approach

## Your Task

You need to design **TWO alternative UI design styles** for our component library. These will be labeled:
1. **"Modern"** - Your interpretation of a modern professional financial platform
2. **"Elegant"** - Your interpretation of an elegant professional financial platform

Both should maintain the professional, trustworthy feel appropriate for a financial/legal platform.

## Components to Style

You need to provide design specifications for these components:

### 1. **Badges** (small status indicators)
- Variants: default, success, warning, error, info, primary, secondary
- Sizes: sm, md, lg
- Can include icons

### 2. **Buttons**
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, sm, lg, icon
- States: default, hover, active, disabled, focused

### 3. **Alerts** (notification boxes)
- Variants: default, success, warning, error, info
- Features: icon, title, description, dismissible option
- Should be readable and non-intrusive

## Technical Requirements

For each component in each style, provide:

1. **Border radius** (e.g., rounded-lg, rounded-xl, rounded-2xl, rounded-full, rounded-none)
2. **Border style** (width, color - using Tailwind color system)
3. **Background colors** (for each variant - using Tailwind color system)
4. **Text colors** (for each variant - using Tailwind color system)
5. **Shadow effects** (e.g., shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl, or custom shadows)
6. **Hover effects** (scale, color changes, shadow changes)
7. **Active/pressed states** (scale, shadow changes)
8. **Special effects** (gradients, backdrop blur, transitions, etc.)

## Format Your Response

For each design style (Modern and Elegant), use this structure:

```typescript
// MODERN STYLE

badges: {
  base: "rounded-lg", // base border radius and any universal styles
  variants: {
    default: "bg-gray-100 text-gray-700 border border-gray-300 shadow-sm",
    success: "bg-green-50 text-green-700 border border-green-300 shadow-sm",
    // ... continue for all variants
  }
}

buttons: {
  base: "rounded-lg shadow-md border transition-all duration-200",
  variants: {
    default: "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]",
    // ... continue for all variants
  }
}

alerts: {
  base: "rounded-lg border p-4 shadow-sm",
  variants: {
    default: "bg-gray-50 border-gray-200 text-gray-900",
    // ... continue for all variants
  }
}

// Repeat the same structure for ELEGANT STYLE
```

## Design Considerations

**Do Consider:**
- Financial platforms like Stripe, Plaid, Mercury, Brex
- Professional SaaS applications
- Trust and credibility signals
- Accessibility (contrast ratios)
- Subtle sophistication

**Avoid:**
- Overly playful or casual designs
- Extremely bold or harsh styles
- Designs that feel like consumer apps (gaming, social media)
- Anything that undermines credibility

## Example Inspirations

Think about the design language of:
- **Stripe** - Clean, professional, subtle gradients
- **Linear** - Modern, crisp, high contrast
- **Mercury** - Elegant, sophisticated, refined
- **Notion** - Clean, organized, professional but friendly

## Questions?

This is for a component testing page at `/component-test` where we can compare:
1. Default (current design)
2. Liquid Glass (existing alternative with frosted glass effects)
3. Modern (your design)
4. Elegant (your design)

The stakeholders (nonprofit organizations, tech executives, professional appraisers) will choose which design best represents trust and professionalism for equity donations.

## Deliverable

Provide the complete Tailwind CSS class strings for all component variants in both design styles, formatted as shown above. Focus on making each style feel cohesive and intentional while maintaining professional credibility.
