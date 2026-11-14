import type { Instrumentation } from "next"
import { errorMessage, reportError } from "@/lib/report-error"

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
    const digest =
        typeof error === "object" && error !== null && "digest" in error
            ? String(error.digest)
            : undefined

    await reportError({
        event: "request_error",
        message: errorMessage(error),
        path: request.path,
        method: request.method,
        routePath: context.routePath,
        digest,
    })
}
