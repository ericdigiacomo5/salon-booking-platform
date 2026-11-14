export function Skeleton({ className = "" }: { className?: string }) {
    return <div aria-hidden className={`skeleton rounded-sm bg-muted ${className}`} />
}
