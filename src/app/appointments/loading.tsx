import { Skeleton } from "@/components/ui/skeleton"
import { BadgeSkeleton, LoadingRegion, TextLine } from "@/components/ui/page-skeletons"

function CardSkeleton({ upcoming }: { upcoming: boolean }) {
    return (
        <div
            className={
                upcoming
                    ? "rounded-xl border border-line border-l-4 border-l-lacquer/40 bg-surface p-5 shadow-card"
                    : "rounded-xl border border-line bg-surface/70 p-5"
            }
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <TextLine size="lg" width="w-40" />
                    <TextLine width="w-24" className="mt-1" />
                    <TextLine width="w-36" className="mt-0.5" />
                    <TextLine width="w-28" className="mt-1" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <BadgeSkeleton width="w-24" />
                </div>
            </div>
            {upcoming && (
                <div className="mt-3 flex min-h-11 items-center gap-5">
                    <TextLine width="w-32" />
                    <TextLine width="w-28" />
                </div>
            )}
        </div>
    )
}

function SectionHeading() {
    return (
        <div className="flex h-8 items-center">
            <Skeleton className="h-5 w-36" />
        </div>
    )
}

export default function AppointmentsLoading() {
    return (
        <LoadingRegion label="Loading your bookings…" className="mx-auto max-w-3xl px-4 py-14">
            <TextLine size="lg" width="w-14" />
            <TextLine size="4xl" width="w-44" className="mt-1" />
            <div className="mt-8 flex flex-col gap-10">
                <section>
                    <SectionHeading />
                    <div className="mt-5 flex flex-col gap-4">
                        <CardSkeleton upcoming />
                        <CardSkeleton upcoming />
                    </div>
                </section>
                <section>
                    <SectionHeading />
                    <div className="mt-5 flex flex-col gap-4">
                        <CardSkeleton upcoming={false} />
                    </div>
                </section>
            </div>
        </LoadingRegion>
    )
}
