import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { DayStrip } from "./day-strip"
import { SlotGrid } from "./slot-grid"
import { Spinner } from "@/components/ui/spinner"
import { formatOpening, toLocalDateKey } from "@/lib/format"
import { fittingStarts } from "@/lib/schedule-grid"
import { ADMIN_DAYS_AHEAD, addDays } from "@/lib/recurring"

function SlotFetcher({
    artistId,
    date,
    serviceDurationMinutes,
    excludeAppointmentId,
    emptyMessage,
    onSelect,
}: {
    artistId: string
    date: string
    serviceDurationMinutes: number
    excludeAppointmentId?: string
    emptyMessage: React.ReactNode
    onSelect: (startTime: string) => void
}) {
    const [slots, setSlots] = useState<string[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const url = `/api/admin/artists/${artistId}/availability?date=${date}`
        fetch(excludeAppointmentId ? `${url}&excludeAppointmentId=${excludeAppointmentId}` : url)
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to load availability")
                return res.json() as Promise<{ data: string[] }>
            })
            .then((body) => {
                const open = body.data.map((slot) => new Date(slot))
                if (!cancelled)
                    setSlots(
                        fittingStarts(open, serviceDurationMinutes).map((slot) =>
                            slot.toISOString(),
                        ),
                    )
            })
            .catch(() => {
                if (!cancelled) setError("Couldn't load open times. Please try again.")
            })

        return () => {
            cancelled = true
        }
    }, [artistId, date, serviceDurationMinutes, excludeAppointmentId])

    if (error) {
        return (
            <p role="alert" className="mt-4 text-sm text-danger">
                {error}
            </p>
        )
    }

    if (slots === null) {
        return (
            <div className="mt-6 flex justify-center">
                <Spinner className="h-6 w-6 text-primary" />
            </div>
        )
    }

    return (
        <SlotGrid
            slots={slots}
            selectedTime={null}
            onSelect={onSelect}
            emptyMessage={emptyMessage}
        />
    )
}

type OpenDays = { key: string; days: Map<string, string> | null; failed: boolean }

export function DateTimeStep({
    artistId,
    initialDate,
    serviceDurationMinutes,
    excludeAppointmentId,
    heading = "Choose a Date & Time",
    daysAhead = ADMIN_DAYS_AHEAD,
    onSelect,
}: {
    artistId: string
    initialDate: string | null
    serviceDurationMinutes: number
    excludeAppointmentId?: string
    heading?: string
    daysAhead?: number
    onSelect: (date: string, startTime: string) => void
}) {
    const days = useMemo(() => {
        const today = new Date()
        return Array.from({ length: daysAhead }, (_, i) => addDays(today, i))
    }, [daysAhead])

    const requestKey = `${artistId}|${serviceDurationMinutes}|${daysAhead}|${excludeAppointmentId ?? ""}`
    const [openDays, setOpenDays] = useState<OpenDays>({ key: "", days: null, failed: false })
    useEffect(() => {
        let cancelled = false
        const query = new URLSearchParams({
            durationMinutes: String(serviceDurationMinutes),
            days: String(daysAhead),
        })
        if (excludeAppointmentId) query.set("excludeAppointmentId", excludeAppointmentId)
        fetch(`/api/admin/artists/${artistId}/open-days?${query.toString()}`)
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to load open days")
                return res.json() as Promise<{ data: { date: string; firstStart: string }[] }>
            })
            .then((body) => {
                if (!cancelled)
                    setOpenDays({
                        key: requestKey,
                        days: new Map(body.data.map((d) => [d.date, d.firstStart])),
                        failed: false,
                    })
            })
            .catch(() => {
                if (!cancelled) setOpenDays({ key: requestKey, days: null, failed: true })
            })
        return () => {
            cancelled = true
        }
    }, [requestKey, artistId, serviceDurationMinutes, daysAhead, excludeAppointmentId])

    const loaded = openDays.key === requestKey
    const known = loaded && !openDays.failed ? openDays.days : null

    const [chosenDate, setChosenDate] = useState(initialDate)
    const firstOpen = known
        ? (days.map(toLocalDateKey).find((key) => known.has(key)) ?? null)
        : null
    const selectedDate = chosenDate ?? (loaded ? (firstOpen ?? toLocalDateKey(days[0])) : null)

    const nextOpen =
        known && selectedDate ? [...known.entries()].find(([key]) => key > selectedDate) : undefined
    const emptyMessage = nextOpen ? (
        <div className="mt-4 rounded-sm border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">No open times on this day.</p>
            <button
                type="button"
                onClick={() => setChosenDate(nextOpen[0])}
                className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-accent hover:text-primary-strong"
            >
                {`Next opening: ${formatOpening(new Date(nextOpen[1]))}`}
                <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
        </div>
    ) : known && known.size === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
            {`No openings in the next ${daysAhead} days.`}
        </p>
    ) : undefined

    return (
        <div>
            <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
            <div className="mt-4">
                <DayStrip
                    days={days}
                    selectedDate={selectedDate}
                    openDays={known ? new Set(known.keys()) : null}
                    onSelect={setChosenDate}
                />
            </div>

            {selectedDate === null ? (
                <div className="mt-6 flex justify-center">
                    <Spinner className="h-6 w-6 text-primary" />
                </div>
            ) : (
                <SlotFetcher
                    key={`${selectedDate}|${serviceDurationMinutes}`}
                    artistId={artistId}
                    date={selectedDate}
                    serviceDurationMinutes={serviceDurationMinutes}
                    excludeAppointmentId={excludeAppointmentId}
                    emptyMessage={emptyMessage}
                    onSelect={(startTime) => onSelect(selectedDate, startTime)}
                />
            )}
        </div>
    )
}
