import Link from "next/link"
import type { ScheduleView } from "@/lib/schedule-grid"

export function ScheduleViewToggle({
    view,
    dateString,
    status,
    artistId,
    defaultArtistId,
}: {
    view: ScheduleView
    dateString: string
    status: string
    artistId: string
    defaultArtistId: string | null
}) {
    function hrefFor(target: ScheduleView) {
        const params = new URLSearchParams({ dateString })
        if (status) params.set("status", status)
        const targetArtistId = target === "week" ? artistId || defaultArtistId : artistId
        if (targetArtistId) params.set("artistId", targetArtistId)
        if (target === "week") params.set("view", "week")
        return `/admin?${params.toString()}`
    }

    return (
        <div
            role="group"
            aria-label="Schedule view"
            className="mt-4 inline-flex rounded-sm border border-border p-0.5"
        >
            {(["day", "week"] as const).map((option) => {
                const active = option === view
                return (
                    <Link
                        key={option}
                        href={hrefFor(option)}
                        aria-current={active ? "page" : undefined}
                        className={
                            "flex h-11 min-w-20 items-center justify-center rounded-sm px-4 text-sm font-medium transition-colors " +
                            (active
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground")
                        }
                    >
                        {option === "day" ? "Day" : "Week"}
                    </Link>
                )
            })}
        </div>
    )
}
