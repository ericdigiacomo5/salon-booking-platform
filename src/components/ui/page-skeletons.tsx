import { Skeleton } from "@/components/ui/skeleton"

const LINE: Record<"xs" | "sm" | "base" | "lg" | "3xl" | "4xl", { box: string; bar: string }> = {
    xs: { box: "h-4", bar: "h-2.5" },
    sm: { box: "h-5", bar: "h-3" },
    base: { box: "h-6", bar: "h-3.5" },
    lg: { box: "h-7", bar: "h-4" },
    "3xl": { box: "h-9", bar: "h-6" },
    "4xl": { box: "h-10", bar: "h-7" },
}

export function TextLine({
    size = "sm",
    width,
    className = "",
}: {
    size?: keyof typeof LINE
    width: string
    className?: string
}) {
    return (
        <div className={`flex items-center ${LINE[size].box} ${className}`}>
            <Skeleton className={`${LINE[size].bar} ${width}`} />
        </div>
    )
}

export function Control({ width, className = "" }: { width: string; className?: string }) {
    return <Skeleton className={`h-11 ${width} ${className}`} />
}

export function BadgeSkeleton({ width = "w-16" }: { width?: string }) {
    return <Skeleton className={`h-6 ${width}`} />
}

export function RowCardSkeleton({
    titleWidth = "w-32",
    badge = true,
    lines = ["w-48"],
    buttons = ["w-16", "w-28"],
}: {
    titleWidth?: string
    badge?: boolean
    lines?: string[]
    buttons?: string[]
}) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <TextLine size="base" width={titleWidth} />
                    {badge && <BadgeSkeleton />}
                </div>
                {lines.map((width, i) => (
                    <TextLine key={i} width={width} className="mt-1" />
                ))}
            </div>
            {buttons.length > 0 && (
                <div className="flex shrink-0 gap-2">
                    {buttons.map((width, i) => (
                        <Control key={i} width={width} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function ListHeaderSkeleton({
    titleWidth,
    action = "w-36",
    className = "",
}: {
    titleWidth: string
    action?: string | null
    className?: string
}) {
    return (
        <div className={`flex items-center justify-between ${className}`}>
            <TextLine size="lg" width={titleWidth} />
            {action && <Control width={action} />}
        </div>
    )
}

export function FilterRowSkeleton({
    fields,
    button = "w-20",
}: {
    fields: string[]
    button?: string | null
}) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            {fields.map((width, i) => (
                <div key={i}>
                    <TextLine size="xs" width="w-12" />
                    <Control width={width} className="mt-1" />
                </div>
            ))}
            {button && <Control width={button} />}
        </div>
    )
}

export function LoadingRegion({
    label,
    children,
    className = "",
}: {
    label: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div role="status" className={className}>
            <span className="sr-only">{label}</span>
            {children}
        </div>
    )
}
