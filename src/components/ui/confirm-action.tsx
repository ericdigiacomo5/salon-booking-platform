"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function ConfirmAction({
    label,
    prompt,
    confirmLabel,
    onConfirm,
    disabled = false,
    busyLabel,
    busy = false,
    keepLabel = "Keep",
}: {
    label: string
    prompt: string
    confirmLabel: string
    onConfirm: () => void
    disabled?: boolean
    busy?: boolean
    busyLabel?: string
    keepLabel?: string
}) {
    const [confirming, setConfirming] = useState(false)
    const keepRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (confirming) keepRef.current?.focus()
    }, [confirming])

    if (!confirming) {
        return (
            <Button
                variant="quiet"
                size="md"
                onClick={() => setConfirming(true)}
                disabled={disabled || busy}
            >
                {busy && busyLabel ? busyLabel : label}
            </Button>
        )
    }

    return (
        <div role="group" aria-label={prompt} className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{prompt}</span>
            <Button
                variant="danger"
                size="md"
                disabled={busy}
                onClick={() => {
                    setConfirming(false)
                    onConfirm()
                }}
            >
                {confirmLabel}
            </Button>
            <Button
                ref={keepRef}
                variant="secondary"
                size="md"
                onClick={() => setConfirming(false)}
                disabled={busy}
            >
                {keepLabel}
            </Button>
        </div>
    )
}
