import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-gray-50 border-gray-200 text-gray-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const iconVariants = cva('h-5 w-5 flex-shrink-0', {
  variants: {
    variant: {
      default: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      info: 'text-blue-600',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const iconMap = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ComponentType<{ className?: string }> | boolean
  action?: {
    label: string
    onClick: () => void
  }
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, dismissible, onDismiss, icon, action, children, ...props }, ref) => {
    const [dismissed, setDismissed] = React.useState(false)

    const handleDismiss = () => {
      setDismissed(true)
      onDismiss?.()
    }

    if (dismissed) {
      return null
    }

    const showIcon = icon !== false
    const IconComponent = typeof icon === 'function' ? icon : iconMap[variant || 'default']

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
          <div className="flex items-center gap-2">
            {action && (
              <button
                onClick={action.onClick}
                className={cn(
                  'text-sm font-medium underline-offset-4 hover:underline',
                  variant === 'success' && 'text-green-700',
                  variant === 'warning' && 'text-yellow-700',
                  variant === 'error' && 'text-red-700',
                  variant === 'info' && 'text-blue-700',
                  variant === 'default' && 'text-gray-700'
                )}
              >
                {action.label}
              </button>
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className={cn(
                  'rounded-md p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variant === 'success' && 'text-green-600 focus:ring-green-600',
                  variant === 'warning' && 'text-yellow-600 focus:ring-yellow-600',
                  variant === 'error' && 'text-red-600 focus:ring-red-600',
                  variant === 'info' && 'text-blue-600 focus:ring-blue-600',
                  variant === 'default' && 'text-gray-600 focus:ring-gray-600'
                )}
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
