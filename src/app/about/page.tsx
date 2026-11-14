import type { Metadata } from "next"
import { CallToBook } from "@/components/ui/call-to-book"
import { DecoDivider } from "@/components/ui/deco"
import { BOOKING_PHONE, SITE_NAME, formatPhone } from "@/lib/site"
import { getPolicySettings } from "@/lib/settings"
import { describeNoticeWindow } from "@/lib/recurring"

export const metadata: Metadata = { title: "About" }

export default async function AboutPage() {
    const { cancellationNoticeHours } = await getPolicySettings()
    const phone = formatPhone(BOOKING_PHONE)

    return (
        <div className="mx-auto max-w-3xl px-4 py-14">
            <span className="font-script text-2xl text-lacquer">Our Story</span>
            <h1 className="mt-1 font-serif text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
                About {SITE_NAME}
            </h1>
            <DecoDivider className="mt-3 text-primary" />
            <div className="mt-8 space-y-4 text-lg leading-relaxed text-body">
                <p>
                    {`${SITE_NAME} has been doing nails in Anytown since 2020. We offer manicures, pedicures, gel, nail art and waxing, done by artists who take their time and get the details right.`}
                </p>
                <p>
                    {`To book, change or cancel an appointment, call us at ${phone} or stop by.${cancellationNoticeHours > 0 ? ` If you need to cancel or reschedule, please give at least ${describeNoticeWindow(cancellationNoticeHours)} notice.` : ""} If you have an account with us, you can sign in to see your upcoming appointments.`}
                </p>
            </div>
            <CallToBook size="lg" className="mt-10" label="Call to Book" />
        </div>
    )
}
