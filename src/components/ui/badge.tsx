// shadcn/ui Badge, copied from the v3 registry (https://ui.shadcn.com/r/styles/new-york/badge.json)
// Edits: payment-status variants only (registry variants removed), no focus classes, Badge-only export.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Registry focus classes removed: this div is never focusable, so they could not apply.
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        // One variant per status; all pass AA (completed text is darker than the starter's #15803d, 4.42:1).
        completed: "border-transparent bg-[#d1fae5] text-[#166534]",
        pending: "border-transparent bg-[#fef3c7] text-[#92400e]",
        failed: "border-transparent bg-[#fee2e2] text-[#b91c1c]",
        refunded: "border-transparent bg-[#f3f4f6] text-[#374151]",
      },
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

// badgeVariants isn't exported: non-component exports break Fast Refresh (react-refresh lint rule).
export { Badge }
