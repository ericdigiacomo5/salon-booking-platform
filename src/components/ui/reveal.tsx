"use client"

import { useEffect, useRef, type ReactNode } from "react"

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element || typeof IntersectionObserver === "undefined") return
        if (element.getBoundingClientRect().top < window.innerHeight) return

        element.classList.add("reveal-pending")
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    element.classList.add("reveal-shown")
                    element.classList.remove("reveal-pending")
                    observer.disconnect()
                }
            },
            { rootMargin: "0px 0px -10% 0px" },
        )
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    )
}
