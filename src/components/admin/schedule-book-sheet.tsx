import { useState } from "react"
import { X } from "lucide-react"
import type { Artist, Service } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { UserStep } from "./booking/user-step"
import { ServiceStep } from "./booking/service-step"
import { ReviewStep } from "./booking/review-step"
import type {
    BookedAppointment,
    RecurringBookingResult,
    SelectedUser,
} from "./booking/booking-types"
import type { AdminAppointment } from "./appointment-shared"
import { servicesNotOffered } from "@/lib/artist-services"
import { isNoShowFlagged, noShowLabel } from "@/lib/customer-summary"
import { Badge } from "@/components/ui/badge"
import { formatSalonDateTime } from "@/lib/salon-time"

export function ScheduleBookSheet({
    artist,
    startTime,
    services,
    offeredServiceIds,
    maxSeriesWeeks,
    onBooked,
    onClose,
}: {
    artist: Artist
    startTime: Date
    services: Service[]
    offeredServiceIds: string[]
    maxSeriesWeeks: number
    onBooked: (appointments: AdminAppointment[], notice: string | null) => void
    onClose: () => void
}) {
    const [user, setUser] = useState<SelectedUser | null>(null)
    const [serviceIds, setServiceIds] = useState<string[]>([])
    const [servicesChosen, setServicesChosen] = useState(false)

    const chosenServices = serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => s !== undefined)

    function toggleService(id: string) {
        setServiceIds((prev) =>
            prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id],
        )
    }

    const when = formatSalonDateTime(startTime, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })

    function withRelations(appointment: BookedAppointment): AdminAppointment {
        return { ...appointment, artist, user: user! }
    }

    function handleRecurringSuccess(result: RecurringBookingResult) {
        const visits = result.created.length
        const skipped = result.skipped.length
        const notice =
            `Standing appointment booked — ${visits} visit${visits === 1 ? "" : "s"}` +
            (skipped > 0
                ? `, ${skipped} date${skipped === 1 ? "" : "s"} couldn't be booked (listed under Standing Appointments).`
                : ".")
        onBooked(result.created.map(withRelations), notice)
    }

    return (
        <div
            className="fixed inset-0 z-30 flex cursor-pointer items-center justify-center bg-foreground/40 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="New booking"
                onClick={(e) => e.stopPropagation()}
                className={
                    "max-h-[92vh] w-full max-w-md cursor-auto overflow-y-auto rounded-2xl border " +
                    "border-border bg-background px-4 pt-4 pb-6 shadow-lg"
                }
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-medium text-foreground">New Booking</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {artist.name} &middot; {when}
                        </p>
                        {user && isNoShowFlagged(user.noShowCount ?? 0) && (
                            <p className="mt-1 text-sm text-foreground">
                                <Badge tone="danger">{noShowLabel(user.noShowCount ?? 0)}</Badge>{" "}
                                Consider calling to confirm.
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4">
                    {!user ? (
                        <UserStep onSelect={setUser} />
                    ) : !servicesChosen ? (
                        <div className="flex flex-col gap-4">
                            <ServiceStep
                                services={services}
                                selectedIds={serviceIds}
                                notOfferedIds={servicesNotOffered(
                                    offeredServiceIds,
                                    services.map((s) => s.id),
                                )}
                                notOfferedLabel={`Not usually done by ${artist.name}`}
                                onToggle={toggleService}
                            />
                            <div className="flex gap-2">
                                <Button variant="ghost" size="md" onClick={() => setUser(null)}>
                                    Back
                                </Button>
                                <Button
                                    size="md"
                                    onClick={() => setServicesChosen(true)}
                                    disabled={chosenServices.length === 0}
                                    className="flex-1"
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <ReviewStep
                            services={chosenServices}
                            artist={artist}
                            startTime={startTime.toISOString()}
                            userLabel={user.name ?? user.email}
                            targetUserId={user.id}
                            maxSeriesWeeks={maxSeriesWeeks}
                            slotUnavailableMessage="That time isn't open for the full length of these services. Close this and pick another time on the schedule."
                            onBack={() => setServicesChosen(false)}
                            onSuccess={(appointment) =>
                                onBooked([withRelations(appointment)], null)
                            }
                            onRecurringSuccess={handleRecurringSuccess}
                            onSlotUnavailable={() => {}}
                            onUnauthenticated={onClose}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
