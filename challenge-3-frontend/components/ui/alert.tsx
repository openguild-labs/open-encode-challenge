"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "warning" | "success";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default:
        "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
      destructive:
        "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      warning:
        "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
      success:
        "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-lg border p-4",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm", className)} {...props} />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
