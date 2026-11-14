"use client"

import { useState } from "react"
import type { TimeOff } from "@/generated/prisma/client"
import { CalendarX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { AdminTimeOffRow } from "./admin-time-off-row"
import { TimeOffForm, type TimeOffFormValues } from "./time-off-form"
import { TimeOffConflictsDialog, type TimeOffConflict } from "./time-off-conflicts-dialog"

type PendingSave = {
    id: string | null
    values: TimeOffFormValues
    conflicts: TimeOffConflict[]
}

export function AdminTimeOffManager({
    artistId,
    initialEntries,
}: {
    artistId: string | null
    initialEntries: TimeOff[]
}) {
    const [windows, setWindows] = useState<TimeOff[]>(initialEntries)
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [pending, setPending] = useState<PendingSave | null>(null)
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    async function save(id: string | null, values: TimeOffFormValues, approvedIds?: string[]) {
        setError(null)
        setNotice(null)
        setSaving(true)

        try {
            const res = await fetch(id ? `/api/admin/time-off/${id}` : "/api/admin/time-off", {
                method: id ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(id ? {} : { artistId }),
                    ...values,
                    ...(approvedIds ? { cancelConflictingAppointmentIds: approvedIds } : {}),
                }),
            })

            const body = await res.json().catch(() => null)

            if (res.status === 409 && Array.isArray(body?.conflicts)) {
                setPending({ id, values, conflicts: body.conflicts })
                return
            }

            if (!res.ok) {
                setPending(null)
                setError(
                    body?.error ?? `Couldn't ${id ? "edit" : "create"} time off. Please try again.`,
                )
                return
            }

            const { cancelledAppointmentIds, ...saved } = body.data as TimeOff & {
                cancelledAppointmentIds: string[]
            }
            setWindows((prev) =>
                id ? prev.map((w) => (w.id === id ? saved : w)) : [...prev, saved],
            )
            if (id) setEditingId(null)
            else setIsCreating(false)
            setPending(null)

            const cancelled = cancelledAppointmentIds.length
            if (cancelled > 0) {
                setNotice(
                    `Time off saved. ${cancelled} appointment${cancelled === 1 ? " was" : "s were"} cancelled, and customers with a confirmed email were notified.`,
                )
            } else {
                toast("Time off saved.")
            }
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        setError(null)
        setNotice(null)

        try {
            const res = await fetch(`/api/admin/time-off/${id}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't delete time off. Please try again.")
                return
            }

            setWindows((prev) => prev.filter((w) => w.id !== id))
            toast("Time off removed — those hours are bookable again.")
        } catch {
            setError("Network error. Please try again.")
        }
    }

    return (
        <div>
            <div className="mt-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Time Off</h2>
                {!isCreating && (
                    <Button size="md" onClick={() => setIsCreating(true)}>
                        New Time Off
                    </Button>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {notice && (
                <p role="status" className="mt-3 text-sm text-foreground">
                    {notice}
                </p>
            )}

            {isCreating && (
                <div className="mt-4">
                    <TimeOffForm
                        submitLabel="Create Time Off"
                        onSubmit={(values) => save(null, values)}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
            )}

            {windows && windows.length === 0 ? (
                <EmptyState icon={CalendarX2} title="No time off scheduled" className="mt-8">
                    {artistId === null
                        ? "Salon-wide closures (holidays) go here and block every artist."
                        : "Days off and appointments elsewhere go here; they block booking for those hours."}
                </EmptyState>
            ) : (
                <div className="mt-6 flex flex-col gap-3">
                    {windows.map((timeOff) => (
                        <AdminTimeOffRow
                            key={timeOff.id}
                            timeOff={timeOff}
                            isEditing={editingId === timeOff.id}
                            onEdit={() => setEditingId(timeOff.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSave={(values) => save(timeOff.id, values)}
                            onDelete={() => handleDelete(timeOff.id)}
                        />
                    ))}
                </div>
            )}

            {pending && (
                <TimeOffConflictsDialog
                    conflicts={pending.conflicts}
                    salonWide={artistId === null}
                    saving={saving}
                    onGoBack={() => {
                        if (!saving) setPending(null)
                    }}
                    onCancelAll={() =>
                        save(
                            pending.id,
                            pending.values,
                            pending.conflicts.map((c) => c.id),
                        )
                    }
                />
            )}
        </div>
    )
}
