import { Control, LoadingRegion, TextLine } from "@/components/ui/page-skeletons"

export default function AdminSettingsLoading() {
    return (
        <LoadingRegion label="Loading settings…" className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-surface shadow-sm p-4">
                <TextLine size="base" width="w-32" />
                <TextLine width="w-full" className="mt-1" />
                <TextLine width="w-1/3" />
                <div className="mt-3 flex flex-wrap items-end gap-4">
                    {["w-36", "w-44"].map((label, i) => (
                        <div key={i}>
                            <TextLine size="xs" width={label} />
                            <Control width="w-28" className="mt-1" />
                        </div>
                    ))}
                    <Control width="w-20" />
                </div>
            </div>
        </LoadingRegion>
    )
}
