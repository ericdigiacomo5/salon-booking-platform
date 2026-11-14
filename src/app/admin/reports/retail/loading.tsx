import { Control, LoadingRegion, TextLine } from "@/components/ui/page-skeletons"

export default function AdminRetailReportLoading() {
    return (
        <LoadingRegion label="Loading the retail report…" className="flex flex-col gap-6">
            <div>
                <TextLine size="lg" width="w-44" />
                <TextLine width="w-full max-w-2xl" className="mt-1" />
            </div>

            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    {[0, 1].map((i) => (
                        <div key={i}>
                            <TextLine size="xs" width="w-12" />
                            <Control width="w-full" className="mt-1" />
                        </div>
                    ))}
                    <Control width="w-full sm:w-20" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map((i) => (
                        <Control key={i} width="w-24" />
                    ))}
                </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
                <TextLine size="xs" width="w-32" />
                <TextLine size="3xl" width="w-48" className="mt-1" />
                <div className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {Array.from({ length: 7 }, (_, i) => (
                        <TextLine key={i} width="w-full" />
                    ))}
                </div>
            </div>
        </LoadingRegion>
    )
}
