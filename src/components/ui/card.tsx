import { type HTMLAttributes } from "react"

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-xl border border-line bg-surface text-surface-foreground shadow-card ${className}`}
            {...props}
        />
    )
}
