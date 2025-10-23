import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

type ThemeStyle = 'default' | 'glass' | 'modern' | 'elegant'

const createButtonVariants = (theme: ThemeStyle) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  
  const themeStyles = {
    default: {
      base: "rounded-lg shadow-sm border",
      variants: {
        default: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-md active:scale-[0.98]",
        destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 hover:shadow-md active:scale-[0.98]",
        outline: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-[0.98]",
        secondary: "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98]",
        ghost: "border-transparent hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200 active:scale-[0.98]",
        link: "text-blue-600 border-transparent underline-offset-4 hover:underline shadow-none",
      }
    },
    glass: {
      base: "rounded-2xl backdrop-blur-xl border shadow-xl",
      variants: {
        default: "bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white border-white/30 hover:from-purple-600/80 hover:to-pink-600/80 hover:shadow-2xl hover:scale-105",
        destructive: "bg-red-500/70 text-white border-white/30 hover:bg-red-600/70 hover:shadow-2xl hover:scale-105",
        outline: "border-white/50 bg-white/30 text-gray-900 hover:bg-white/50 hover:border-white/70 hover:shadow-2xl hover:scale-105",
        secondary: "bg-white/20 text-gray-900 border-white/40 hover:bg-white/30 hover:border-white/60 hover:shadow-2xl hover:scale-105",
        ghost: "border-transparent hover:bg-white/20 hover:text-gray-900 hover:border-white/30 hover:scale-105",
        link: "text-purple-600 border-transparent underline-offset-4 hover:underline shadow-none",
      }
    },
    modern: {
      base: "rounded-lg shadow-sm border",
      variants: {
        default: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-md active:scale-[0.98]",
        destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 hover:shadow-md active:scale-[0.98]",
        outline: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-[0.98]",
        secondary: "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98]",
        ghost: "border-transparent hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200 active:scale-[0.98]",
        link: "text-blue-600 border-transparent underline-offset-4 hover:underline shadow-none",
      }
    },
    elegant: {
      base: "rounded-lg shadow-sm border",
      variants: {
        default: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-md active:scale-[0.98]",
        destructive: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 hover:shadow-md active:scale-[0.98]",
        outline: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-[0.98]",
        secondary: "bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98]",
        ghost: "border-transparent hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200 active:scale-[0.98]",
        link: "text-blue-600 border-transparent underline-offset-4 hover:underline shadow-none",
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
          default: "h-10 px-4 py-2",
          sm: "h-9 px-3 text-xs",
          lg: "h-12 px-8 text-base",
          icon: "h-10 w-10",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
  )
}

export interface ThemedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<ReturnType<typeof createButtonVariants>> {
  asChild?: boolean
  theme?: ThemeStyle
}

export const ThemedButton = React.forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ className, variant, size, asChild = false, theme = 'default', ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const buttonVariants = createButtonVariants(theme)
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
ThemedButton.displayName = "ThemedButton"
