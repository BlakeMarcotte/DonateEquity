import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeStyle = 'default' | 'glass' | 'modern' | 'elegant'

const createAlertVariants = (theme: ThemeStyle) => {
  const baseStyles = "relative w-full p-4"
  
  const themeStyles = {
    default: {
      base: "rounded-lg border",
      variants: {
        default: 'bg-gray-50 border-gray-200 text-gray-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      }
    },
    glass: {
      base: "rounded-2xl backdrop-blur-xl border shadow-xl",
      variants: {
        default: 'bg-white/40 border-white/60 text-gray-900',
        success: 'bg-green-400/30 border-green-400/60 text-green-900',
        warning: 'bg-yellow-400/30 border-yellow-400/60 text-yellow-900',
        error: 'bg-red-400/30 border-red-400/60 text-red-900',
        info: 'bg-blue-400/30 border-blue-400/60 text-blue-900',
      }
    },
    modern: {
      base: "rounded-lg border",
      variants: {
        default: 'bg-gray-50 border-gray-200 text-gray-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      }
    },
    elegant: {
      base: "rounded-lg border",
      variants: {
        default: 'bg-gray-50 border-gray-200 text-gray-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      }
    }
  }

  const styles = themeStyles[theme]
  
  return cva(
    `${baseStyles} ${styles.base}`,
    {
      variants: {
        variant: styles.variants as Record<string, string>,
      },
      defaultVariants: {
        variant: 'default',
      },
    }
  )
}

const createIconVariants = (theme: ThemeStyle) => {
  const iconColors = {
    default: {
      default: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      info: 'text-blue-600',
    },
    glass: {
      default: 'text-gray-700',
      success: 'text-green-700',
      warning: 'text-yellow-700',
      error: 'text-red-700',
      info: 'text-blue-700',
    },
    modern: {
      default: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      info: 'text-blue-600',
    },
    elegant: {
      default: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      info: 'text-blue-600',
    },
  }

  return cva('h-5 w-5 flex-shrink-0', {
    variants: {
      variant: iconColors[theme] as Record<string, string>,
    },
    defaultVariants: {
      variant: 'default',
    },
  })
}

const iconMap = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

export interface ThemedAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<ReturnType<typeof createAlertVariants>> {
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ComponentType<{ className?: string }> | boolean
  theme?: ThemeStyle
}

export const ThemedAlert = React.forwardRef<HTMLDivElement, ThemedAlertProps>(
  ({ className, variant, dismissible, onDismiss, icon, theme = 'default', children, ...props }, ref) => {
    const [dismissed, setDismissed] = React.useState(false)
    const alertVariants = createAlertVariants(theme)
    const iconVariants = createIconVariants(theme)

    const handleDismiss = () => {
      setDismissed(true)
      onDismiss?.()
    }

    if (dismissed) {
      return null
    }

    const showIcon = icon !== false
    const IconComponent = typeof icon === 'function' ? icon : iconMap[(variant as keyof typeof iconMap) || 'default']

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {showIcon && IconComponent && (
            <IconComponent className={iconVariants({ variant })} />
          )}
          <div className="flex-1 space-y-1">{children}</div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className={cn(
                'rounded-md p-1 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
                theme === 'glass' && 'hover:bg-white/30'
              )}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
ThemedAlert.displayName = 'ThemedAlert'

export const ThemedAlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
ThemedAlertTitle.displayName = 'ThemedAlertTitle'

export const ThemedAlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
ThemedAlertDescription.displayName = 'ThemedAlertDescription'
