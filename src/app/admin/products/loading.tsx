import { ListHeaderSkeleton, LoadingRegion, RowCardSkeleton } from "@/components/ui/page-skeletons"

export default function AdminProductsLoading() {
    return (
        <LoadingRegion label="Loading products…">
            <ListHeaderSkeleton titleWidth="w-24" action="w-36" />
            <div className="mt-6 flex flex-col gap-3">
                {["w-40", "w-28", "w-36"].map((titleWidth, i) => (
                    <RowCardSkeleton
                        key={i}
                        titleWidth={titleWidth}
                        lines={["w-28"]}
                        buttons={["w-16", "w-24"]}
                    />
                ))}
            </div>
        </LoadingRegion>
    )
}
