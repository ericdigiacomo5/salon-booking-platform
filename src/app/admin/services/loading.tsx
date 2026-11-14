import { ListHeaderSkeleton, LoadingRegion, RowCardSkeleton } from "@/components/ui/page-skeletons"

export default function AdminServicesLoading() {
    return (
        <LoadingRegion label="Loading services…">
            <ListHeaderSkeleton titleWidth="w-28" action="w-40" />
            <div className="mt-4 flex flex-col gap-2">
                {["w-20", "w-16", "w-14"].map((titleWidth, i) => (
                    <RowCardSkeleton
                        key={i}
                        titleWidth={titleWidth}
                        lines={[]}
                        buttons={["w-11", "w-11", "w-16", "w-20"]}
                    />
                ))}
            </div>
            <div className="mt-10">
                <ListHeaderSkeleton titleWidth="w-24" action="w-36" />
            </div>
            <div className="mt-6 flex flex-col gap-3">
                {["w-40", "w-24", "w-32", "w-36"].map((titleWidth, i) => (
                    <RowCardSkeleton
                        key={i}
                        titleWidth={titleWidth}
                        lines={i % 2 === 0 ? ["w-36", "w-32"] : ["w-32"]}
                        buttons={["w-16", "w-32"]}
                    />
                ))}
            </div>
        </LoadingRegion>
    )
}
