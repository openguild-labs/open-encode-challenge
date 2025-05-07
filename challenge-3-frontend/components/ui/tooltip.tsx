"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  { children: React.ReactNode; asChild?: boolean; className?: string }
>(({ children, asChild = false, className }, ref) => {
  const Child = asChild ? React.Children.only(children) : "span";
  const props = asChild
    ? { ref, className: cn(className, (children as any).props?.className) }
    : { ref, className };

  return React.cloneElement(Child as any, props);
});

TooltipTrigger.displayName = "TooltipTrigger";

const Tooltip = ({
  children,
  content,
  side = "top",
  className,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Position the tooltip based on the trigger and side
  const getPosition = () => {
    if (!tooltipRef.current) return {};

    switch (side) {
      case "top":
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
        };
      case "right":
        return {
          left: "100%",
          top: "50%",
          transform: "translateY(-50%) translateX(8px)",
        };
      case "bottom":
        return {
          top: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(8px)",
        };
      case "left":
        return {
          right: "100%",
          top: "50%",
          transform: "translateY(-50%) translateX(-8px)",
        };
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700 rounded-md shadow-md whitespace-nowrap",
            className
          )}
          style={getPosition()}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45",
              {
                "bottom-[-4px] left-1/2 -translate-x-1/2": side === "top",
                "left-[-4px] top-1/2 -translate-y-1/2": side === "right",
                "top-[-4px] left-1/2 -translate-x-1/2": side === "bottom",
                "right-[-4px] top-1/2 -translate-y-1/2": side === "left",
              }
            )}
          />
        </div>
      )}
    </div>
  );
};

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
      className
    )}
    {...props}
  />
));

TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
