export function DecoDivider({
    align = "left",
    className = "",
}: {
    align?: "left" | "center"
    className?: string
}) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 132 18"
            className={`h-4.5 w-33 ${align === "center" ? "mx-auto" : ""} ${className}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
        >
            <path d="M0 14H46M86 14H132" strokeWidth="1.5" />
            <path d="M2 10.5H38M94 10.5H130" strokeWidth="0.75" opacity="0.6" />
            <path d="M54 14A12 12 0 0 1 78 14" strokeWidth="1.5" />
            {[150, 120, 90, 60, 30].map((deg) => {
                const r = (deg * Math.PI) / 180
                return (
                    <path
                        key={deg}
                        d={`M${66 + 4 * Math.cos(r)} ${14 - 4 * Math.sin(r)}L${66 + 10 * Math.cos(r)} ${14 - 10 * Math.sin(r)}`}
                        strokeWidth="1.25"
                    />
                )
            })}
            <path d="M66 10.5L68.5 14L66 17.5L63.5 14Z" fill="currentColor" stroke="none" />
        </svg>
    )
}

export function DecoRule({ className = "" }: { className?: string }) {
    return (
        <div aria-hidden className={`flex items-center gap-3 ${className}`}>
            <span className="h-1.5 flex-1 border-y border-current opacity-70" />
            <span className="h-2.5 w-2.5 rotate-45 bg-current" />
            <span className="h-1.5 flex-1 border-y border-current opacity-70" />
        </div>
    )
}

export function DecoFrame({ className = "inset-3" }: { className?: string }) {
    const corner = "absolute h-1.5 w-1.5 rotate-45 bg-current"
    return (
        <span
            aria-hidden
            className={`pointer-events-none absolute border border-current opacity-60 ${className}`}
        >
            <span className={`${corner} top-[-3.5px] left-[-3.5px]`} />
            <span className={`${corner} top-[-3.5px] right-[-3.5px]`} />
            <span className={`${corner} bottom-[-3.5px] left-[-3.5px]`} />
            <span className={`${corner} right-[-3.5px] bottom-[-3.5px]`} />
        </span>
    )
}
