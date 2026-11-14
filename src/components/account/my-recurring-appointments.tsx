import {
    RecurringSeriesRow,
    type RecurringAppointmentWithRelations,
} from "@/components/recurring/recurring-series-row"

export function MyRecurringAppointments({
    series,
}: {
    series: RecurringAppointmentWithRelations[]
}) {
    if (series.length === 0) return null

    return (
        <section className="mt-10">
            <h2 className="font-serif text-2xl font-extrabold text-foreground">
                Standing Appointments
            </h2>
            <div className="mt-5 flex flex-col gap-4">
                {series.map((s) => (
                    <RecurringSeriesRow key={s.id} series={s} showCustomer={false} />
                ))}
            </div>
        </section>
    )
}
