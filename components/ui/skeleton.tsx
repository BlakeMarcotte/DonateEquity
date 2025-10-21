import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "bg-gray-200",
  {
    variants: {
      variant: {
        text: "rounded",
        circular: "rounded-full",
        rectangular: "",
        rounded: "rounded-lg",
      },
      animation: {
        pulse: "animate-pulse",
        wave: "animate-[wave_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        none: "",
      },
    },
    defaultVariants: {
      variant: "text",
      animation: "pulse",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, animation, width, height, style, ...props }, ref) => {
    const inlineStyles: React.CSSProperties = {
      ...style,
      ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
      ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
    }

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, animation }), className)}
        style={inlineStyles}
        aria-busy="true"
        aria-label="Loading content"
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("bg-white rounded-lg border p-6", className)}
      aria-busy="true"
      aria-label="Loading card"
      {...props}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
})
SkeletonCard.displayName = "Skeleton.Card"

const SkeletonAvatar = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, 'variant'> & { size?: number }
>(({ className, size = 48, ...props }, ref) => {
  return (
    <Skeleton
      ref={ref}
      variant="circular"
      width={size}
      height={size}
      className={className}
      aria-label="Loading avatar"
      {...props}
    />
  )
})
SkeletonAvatar.displayName = "Skeleton.Avatar"

const SkeletonList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { items?: number }
>(({ className, items = 3, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("space-y-4", className)}
      aria-busy="true"
      aria-label="Loading list"
      {...props}
    >
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
})
SkeletonList.displayName = "Skeleton.List"

const SkeletonTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { rows?: number; columns?: number }
>(({ className, rows = 5, columns = 4, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-label="Loading table"
      {...props}
    >
      <div className="flex space-x-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          {[...Array(columns)].map((_, j) => (
            <Skeleton key={j} className="h-3 flex-1 bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  )
})
SkeletonTable.displayName = "Skeleton.Table"

const SkeletonWithSubComponents = Object.assign(Skeleton, {
  Card: SkeletonCard,
  Avatar: SkeletonAvatar,
  List: SkeletonList,
  Table: SkeletonTable,
})

export { 
  SkeletonWithSubComponents as Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonList,
  SkeletonTable,
}
