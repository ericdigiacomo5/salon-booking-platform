import {
    FilterRowSkeleton,
    LoadingRegion,
    RowCardSkeleton,
    TextLine,
} from "@/components/ui/page-skeletons"

export default function AdminRecurringLoading() {
    return (
        <LoadingRegion label="Loading standing appointments…">
            <TextLine size="lg" width="w-48" />
            <FilterRowSkeleton fields={["w-32", "w-28"]} button="w-16" />
            <div className="mt-6 flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                    <div key={i}>
                        <RowCardSkeleton
                            titleWidth="w-24"
                            lines={["w-52", "w-32", "w-40"]}
                            buttons={i === 1 ? ["w-24"] : []}
                        />
                        <TextLine size="xs" width="w-24" className="mt-1 ml-1" />
                    </div>
                ))}
            </div>
        </LoadingRegion>
    )
}
