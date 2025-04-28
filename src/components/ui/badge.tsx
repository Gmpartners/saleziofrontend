import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#10b981] text-white shadow hover:bg-[#10b981]/80",
        secondary:
          "border-transparent bg-[#101820] text-white shadow hover:bg-[#101820]/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-[#1f2937]/50",
        success: "border-transparent bg-[#10b981]/15 text-[#34d399] border-[#10b981]/20 shadow",
        warning: "border-transparent bg-amber-500/15 text-amber-300 border-amber-500/20 shadow",
        danger: "border-transparent bg-red-500/15 text-red-300 border-red-500/20 shadow",
        info: "border-transparent bg-blue-500/15 text-blue-300 border-blue-500/20 shadow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
