import { type HTMLAttributes } from "react"

export function StickyActionBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={
                "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur " +
                "px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] " +
                className
            }
            {...props}
        />
    )
}
