import { Control, LoadingRegion, RowCardSkeleton, TextLine } from "@/components/ui/page-skeletons"

export default function AdminRetailLoading() {
    return (
        <LoadingRegion label="Loading retail sales…" className="flex flex-col gap-8">
            <div>
                <TextLine size="base" width="w-28" />
                <TextLine width="w-full max-w-xl" className="mt-1" />
            </div>
            <div className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-4 shadow-sm">
                <div className="flex gap-2">
                    <Control width="flex-1" />
                    <Control width="w-16" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Control width="w-full" />
                    <Control width="w-full" />
                </div>
                <Control width="w-40" />
                <Control width="w-32" />
            </div>
            <div className="flex flex-col gap-3">
                {["w-48", "w-36", "w-40"].map((titleWidth, i) => (
                    <RowCardSkeleton
                        key={i}
                        titleWidth={titleWidth}
                        lines={["w-64", "w-56"]}
                        buttons={["w-16"]}
                    />
                ))}
            </div>
        </LoadingRegion>
    )
}
