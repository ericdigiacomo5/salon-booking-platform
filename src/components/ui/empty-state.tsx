import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export function EmptyState({
    icon: Icon,
    title,
    children,
    action,
    className = "",
}: {
    icon: LucideIcon
    title: string
    children?: ReactNode
    action?: ReactNode
    className?: string
}) {
    return (
        <div
            className={`flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-12 text-center shadow-card ${className}`}
        >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lacquer/10 text-lacquer">
                <Icon className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 font-serif text-lg font-bold text-foreground">{title}</p>
            {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}
