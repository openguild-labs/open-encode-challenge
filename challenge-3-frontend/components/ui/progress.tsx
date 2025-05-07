import * as React from "react";
import { cn } from "@/lib/utils"; // make sure you have this utility

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
);

Progress.displayName = "Progress";

export { Progress };
