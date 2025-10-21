import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { User } from "lucide-react"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative inline-flex shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-none",
        rounded: "rounded-lg",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  }
)

const avatarImageVariants = cva(
  "aspect-square h-full w-full object-cover"
)

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center bg-gray-200 text-gray-400 font-medium",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const statusIndicatorVariants = cva(
  "absolute rounded-full border-2 border-white",
  {
    variants: {
      size: {
        xs: "h-1.5 w-1.5 bottom-0 right-0",
        sm: "h-2 w-2 bottom-0 right-0",
        md: "h-2.5 w-2.5 bottom-0 right-0",
        lg: "h-3 w-3 bottom-0 right-0",
        xl: "h-4 w-4 bottom-0 right-0",
      },
      status: {
        online: "bg-green-500",
        offline: "bg-gray-400",
        away: "bg-yellow-500",
        busy: "bg-red-500",
      },
    },
    defaultVariants: {
      size: "md",
      status: "online",
    },
  }
)

const iconSizeMap = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
}

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  status?: "online" | "offline" | "away" | "busy"
  badge?: React.ReactNode
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, shape, src, alt, fallback, status, badge, ...props }, ref) => {
  const getInitials = (text?: string): string => {
    if (!text) return ""
    const words = text.trim().split(/\s+/)
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase()
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  const initials = getInitials(fallback || alt)
  const statusLabel = status ? `Status: ${status}` : undefined

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, shape }), className)}
      {...props}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={alt}
        className={cn(avatarImageVariants())}
      />
      <AvatarPrimitive.Fallback
        className={cn(avatarFallbackVariants({ size }))}
        delayMs={600}
      >
        {initials ? (
          initials
        ) : (
          <User className={cn(iconSizeMap[size || "md"])} />
        )}
      </AvatarPrimitive.Fallback>
      
      {status && (
        <span
          className={cn(statusIndicatorVariants({ size, status }))}
          aria-label={statusLabel}
        />
      )}
      
      {badge && (
        <span className="absolute -top-1 -right-1">
          {badge}
        </span>
      )}
    </AvatarPrimitive.Root>
  )
})

Avatar.displayName = "Avatar"

export { Avatar, avatarVariants }
