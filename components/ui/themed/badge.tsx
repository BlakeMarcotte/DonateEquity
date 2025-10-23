import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

type ThemeStyle = 'default' | 'glass' | 'modern' | 'elegant'

const createBadgeVariants = (theme: ThemeStyle) => {
  const baseStyles = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors duration-200 [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0"
  
  const themeStyles = {
    default: {
      base: "rounded-full",
      variants: {
        default: "bg-gray-100 text-gray-700 border border-gray-200",
        success: "bg-green-100 text-green-800 border border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        error: "bg-red-100 text-red-800 border border-red-200",
        info: "bg-blue-100 text-blue-800 border border-blue-200",
        primary: "bg-blue-600 text-white border border-blue-600",
        secondary: "bg-gray-600 text-white border border-gray-600",
      }
    },
    glass: {
      base: "rounded-full backdrop-blur-md",
      variants: {
        default: "bg-white/40 text-gray-900 border border-white/60 shadow-lg",
        success: "bg-green-400/30 text-green-900 border border-green-400/60 shadow-lg",
        warning: "bg-yellow-400/30 text-yellow-900 border border-yellow-400/60 shadow-lg",
        error: "bg-red-400/30 text-red-900 border border-red-400/60 shadow-lg",
        info: "bg-blue-400/30 text-blue-900 border border-blue-400/60 shadow-lg",
        primary: "bg-purple-500/40 text-white border border-purple-400/60 shadow-lg",
        secondary: "bg-gray-400/40 text-white border border-gray-400/60 shadow-lg",
      }
    },
    modern: {
      base: "rounded-full",
      variants: {
        default: "bg-gray-100 text-gray-700 border border-gray-200",
        success: "bg-green-100 text-green-800 border border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        error: "bg-red-100 text-red-800 border border-red-200",
        info: "bg-blue-100 text-blue-800 border border-blue-200",
        primary: "bg-blue-600 text-white border border-blue-600",
        secondary: "bg-gray-600 text-white border border-gray-600",
      }
    },
    elegant: {
      base: "rounded-full",
      variants: {
        default: "bg-gray-100 text-gray-700 border border-gray-200",
        success: "bg-green-100 text-green-800 border border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
        error: "bg-red-100 text-red-800 border border-red-200",
        info: "bg-blue-100 text-blue-800 border border-blue-200",
        primary: "bg-blue-600 text-white border border-blue-600",
        secondary: "bg-gray-600 text-white border border-gray-600",
      }
    }
  }

  const styles = themeStyles[theme]
  
  return cva(
    `${baseStyles} ${styles.base}`,
    {
      variants: {
        variant: styles.variants as Record<string, string>,
        size: {
          sm: "px-2 py-0.5 text-xs",
          md: "px-2.5 py-1 text-xs",
          lg: "px-3 py-1.5 text-sm",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "md",
      },
    }
  )
}

export interface ThemedBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<ReturnType<typeof createBadgeVariants>> {
  icon?: React.ReactNode
  theme?: ThemeStyle
}

export const ThemedBadge = React.forwardRef<HTMLSpanElement, ThemedBadgeProps>(
  ({ className, variant, size, icon, children, theme = 'default', ...props }, ref) => {
    const badgeVariants = createBadgeVariants(theme)
    return (
      <span
        className={cn(badgeVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon}
        {children}
      </span>
    )
  }
)
ThemedBadge.displayName = "ThemedBadge"
