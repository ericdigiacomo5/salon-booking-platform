import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { PhotoUploadField } from "@/components/admin/photo-upload-field"
import { CloudinaryImage } from "@/components/ui/cloudinary-image"
import { TEXT_LIMITS } from "@/lib/validation"
import { percentToBasisPoints } from "@/lib/pay-report"

export type ArtistFormValues = {
    name: string
    bio: string
    photoUrl: string
    commissionBasisPoints: number | null
    retailCommissionBasisPoints: number | null
    serviceIds: string[]
}

export type PickableService = { id: string; name: string; active: boolean }

const emptyValues: ArtistFormValues = {
    name: "",
    bio: "",
    photoUrl: "",
    commissionBasisPoints: null,
    retailCommissionBasisPoints: null,
    serviceIds: [],
}

export function ArtistForm({
    initial,
    services,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    initial?: ArtistFormValues
    services: PickableService[]
    submitLabel: string
    onSubmit: (values: ArtistFormValues) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(initial?.name ?? emptyValues.name)
    const [bio, setBio] = useState(initial?.bio ?? emptyValues.bio)
    const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? emptyValues.photoUrl)
    const initialRate = initial?.commissionBasisPoints ?? emptyValues.commissionBasisPoints
    const [commission, setCommission] = useState(
        initialRate === null ? "" : String(initialRate / 100),
    )
    const commissionBasisPoints = commission.trim() === "" ? null : percentToBasisPoints(commission)
    const commissionInvalid = commission.trim() !== "" && commissionBasisPoints === null
    const initialRetailRate =
        initial?.retailCommissionBasisPoints ?? emptyValues.retailCommissionBasisPoints
    const [retailCommission, setRetailCommission] = useState(
        initialRetailRate === null ? "" : String(initialRetailRate / 100),
    )
    const retailCommissionBasisPoints =
        retailCommission.trim() === "" ? null : percentToBasisPoints(retailCommission)
    const retailCommissionInvalid =
        retailCommission.trim() !== "" && retailCommissionBasisPoints === null
    const initialServiceIds = initial?.serviceIds ?? emptyValues.serviceIds
    const [onlySome, setOnlySome] = useState(initialServiceIds.length > 0)
    const [serviceIds, setServiceIds] = useState<string[]>(initialServiceIds)
    const servicesInvalid = onlySome && serviceIds.length === 0
    const servicesModeName = useId()

    function toggleService(id: string) {
        setServiceIds((prev) =>
            prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id],
        )
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (commissionInvalid || retailCommissionInvalid || servicesInvalid) return
        onSubmit({
            name,
            bio,
            photoUrl,
            commissionBasisPoints,
            retailCommissionBasisPoints,
            serviceIds: onlySome ? serviceIds : [],
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface shadow-sm p-4"
        >
            <div>
                <label
                    htmlFor="artist-name"
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Name
                </label>
                <input
                    id="artist-name"
                    required
                    maxLength={TEXT_LIMITS.artistName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground"
                />
            </div>

            <div>
                <label
                    htmlFor="artist-bio"
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Bio
                </label>
                <textarea
                    id="artist-bio"
                    maxLength={TEXT_LIMITS.bio}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
            </div>

            <div>
                <label
                    htmlFor="artist-commission"
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Commission (%)
                </label>
                <input
                    id="artist-commission"
                    inputMode="decimal"
                    placeholder="e.g. 45"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    aria-invalid={commissionInvalid}
                    aria-describedby="artist-commission-help"
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground sm:w-40"
                />
                <p
                    id="artist-commission-help"
                    className={
                        "mt-1 text-xs " +
                        (commissionInvalid ? "text-danger" : "text-muted-foreground")
                    }
                >
                    {commissionInvalid
                        ? "Enter a percentage from 0 to 100, up to two decimals."
                        : "Share of service sales (after discounts) paid to the artist. Only visits checked out from now on use a new rate. Leave blank if not agreed yet."}
                </p>
            </div>

            <div>
                <label
                    htmlFor="artist-retail-commission"
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Retail commission (%)
                </label>
                <input
                    id="artist-retail-commission"
                    inputMode="decimal"
                    placeholder="e.g. 10"
                    value={retailCommission}
                    onChange={(e) => setRetailCommission(e.target.value)}
                    aria-invalid={retailCommissionInvalid}
                    aria-describedby="artist-retail-commission-help"
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground sm:w-40"
                />
                <p
                    id="artist-retail-commission-help"
                    className={
                        "mt-1 text-xs " +
                        (retailCommissionInvalid ? "text-danger" : "text-muted-foreground")
                    }
                >
                    {retailCommissionInvalid
                        ? "Enter a percentage from 0 to 100, up to two decimals."
                        : "Share of the products they sell (before tax, after discounts). Only sales from now on use a new rate. Leave blank if not agreed yet."}
                </p>
            </div>

            <fieldset>
                <legend className="block text-xs font-medium text-muted-foreground">
                    Services They Do
                </legend>
                <div className="mt-1 flex flex-col sm:flex-row sm:gap-6">
                    <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                        <input
                            type="radio"
                            name={servicesModeName}
                            checked={!onlySome}
                            onChange={() => setOnlySome(false)}
                            className="h-4 w-4"
                        />
                        Every service
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                        <input
                            type="radio"
                            name={servicesModeName}
                            checked={onlySome}
                            onChange={() => setOnlySome(true)}
                            className="h-4 w-4"
                        />
                        Only some
                    </label>
                </div>

                {onlySome && (
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2">
                        {services.map((service) => (
                            <label
                                key={service.id}
                                className="flex min-h-11 items-center gap-2 text-sm text-foreground"
                            >
                                <input
                                    type="checkbox"
                                    checked={serviceIds.includes(service.id)}
                                    onChange={() => toggleService(service.id)}
                                    className="h-4 w-4"
                                />
                                {service.active ? service.name : `${service.name} (retired)`}
                            </label>
                        ))}
                    </div>
                )}
                <p
                    role={servicesInvalid ? "alert" : undefined}
                    className={
                        "mt-1 text-xs " +
                        (servicesInvalid ? "text-danger" : "text-muted-foreground")
                    }
                >
                    {servicesInvalid
                        ? "Tick at least one service, or choose Every service."
                        : "Customers can only book this artist for these services. Services added later are included only for artists set to Every service."}
                </p>
            </fieldset>

            <div>
                <span className="block text-xs font-medium text-muted-foreground">Photo</span>

                {photoUrl && (
                    <CloudinaryImage
                        src={photoUrl}
                        alt="Current photo"
                        sizes="80px"
                        className="mt-2 h-20 w-20 rounded-full border-2 border-accent"
                        fallback={
                            <p className="mt-2 text-xs text-muted-foreground">
                                The current photo isn&apos;t an uploaded image and can&apos;t be
                                shown — upload a replacement.
                            </p>
                        }
                    />
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                    <PhotoUploadField
                        label={photoUrl ? "Replace Photo" : "Upload Photo"}
                        onUploaded={(url) => setPhotoUrl(url)}
                    />
                    {photoUrl && (
                        <Button type="button" variant="ghost" onClick={() => setPhotoUrl("")}>
                            Remove Photo
                        </Button>
                    )}
                </div>
                {!photoUrl && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        No photo — initials are shown instead.
                    </p>
                )}
            </div>

            <div className="flex gap-2">
                <Button type="submit">{submitLabel}</Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
