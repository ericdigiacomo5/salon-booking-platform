import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { PolicyPage, PolicySection } from "@/components/legal/policy-page"
import { BOOKING_PHONE, LEGAL_CONTACT, SALON_CONTACT, SITE_NAME, formatPhone } from "@/lib/site"
import { SMS_JOIN_KEYWORD, SMS_PROGRAM_NAME } from "@/lib/sms-consent"
import { GIFT_CARD_TERMS } from "@/lib/gift-card-terms"
import { getPolicySettings } from "@/lib/settings"
import { describeNoticeWindow } from "@/lib/recurring"

export const metadata: Metadata = {
    title: "Terms of Service",
    description: `Sample terms for ${SITE_NAME}, a demo business: appointments, gift cards and the appointment text message program.`,
}

const link = "text-accent underline underline-offset-2"

function List({ items }: { items: ReactNode[] }) {
    return (
        <ul className="list-disc space-y-2 pl-5">
            {items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </ul>
    )
}

function Sub({ children }: { children: ReactNode }) {
    return <h3 className="pt-2 font-semibold text-foreground">{children}</h3>
}

function Email() {
    return (
        <a href={`mailto:${LEGAL_CONTACT.email}`} className={link}>
            {LEGAL_CONTACT.email}
        </a>
    )
}

function Phone() {
    return (
        <a href={`tel:${LEGAL_CONTACT.phone}`} className={link}>
            {formatPhone(LEGAL_CONTACT.phone)}
        </a>
    )
}

export default async function TermsPage() {
    const { cancellationNoticeHours } = await getPolicySettings()
    const notice = describeNoticeWindow(cancellationNoticeHours)
    const noticePossessive =
        cancellationNoticeHours === 0 ? "" : notice.endsWith("s") ? `${notice}' ` : `${notice}'s `

    return (
        <PolicyPage title="Terms of Service" lastUpdated={null}>
            <div className="rounded-md border-2 border-dashed border-line bg-cream p-4 text-sm text-muted-foreground">
                <p className="font-semibold uppercase tracking-wide">Sample terms</p>
                <p className="mt-1">
                    {`${SITE_NAME} is not a real business. This page shows the sections the app itself relies on; the general legal terms a real business needs are left out, and nothing here is legal advice.`}
                </p>
            </div>

            <PolicySection id="appointments" heading="1. Appointments">
                <List
                    items={[
                        `Appointments are booked, rescheduled and cancelled by calling us at ${formatPhone(BOOKING_PHONE)} or in person at the salon. They cannot be booked, changed or cancelled through the website.`,
                        "If you have an account, you can sign in to see your appointments, your visit history and your store credit. Accounts are set up by us; we will email you an invitation to choose a password.",
                        "We may need to cancel or move an appointment, for example when the salon is closed or an artist is unavailable. If we do, we will let you know by email, and by text message if you have opted in.",
                    ]}
                />
                <Sub>Cancellations and Missed Appointments</Sub>
                <p>
                    {`Please provide a minimum of ${noticePossessive}notice if you need to cancel or reschedule an appointment. We do not charge a fee for late cancellations or missed appointments.`}
                </p>
                <Sub>Prices and Payment</Sub>
                <p>
                    The price quoted when your appointment is booked is the price charged for the
                    services booked. Payment is made in the salon at the time of your appointment;
                    we do not take payment through the website.
                </p>
            </PolicySection>

            <PolicySection id="giftcards" heading="2. Gift Cards and Store Credit">
                <List items={[...GIFT_CARD_TERMS]} />
            </PolicySection>

            <PolicySection id="sms" heading="3. SMS Text Messaging">
                <Sub>Program Description</Sub>
                <p>
                    {`By opting into the ${SMS_PROGRAM_NAME} program, you expressly consent to receive text messages (SMS) from ${SITE_NAME} to your mobile number. Text messages may include: booking confirmations, appointment reminders, and notices when an appointment is rescheduled or cancelled. We do not send marketing messages.`}
                </p>
                <p>
                    {"You can opt in with the checkbox on your "}
                    <Link href="/account" className={link}>
                        My Account
                    </Link>
                    {` page. We will send you one text message to confirm, and messages start after you reply YES. You can also opt in by texting ${SMS_JOIN_KEYWORD} to our number from the mobile number on your customer record (for example, if we booked you in at the salon); messages start right away, and we reply to confirm. Consent to receive text messages is not a condition of booking or of any purchase. The program is available for US mobile numbers only.`}
                </p>
                <Sub>Message Frequency</Sub>
                <p>
                    Expect approximately two (2) messages per appointment, plus a message if an
                    appointment is rescheduled or cancelled.
                </p>
                <Sub>Opting Out</Sub>
                <p>
                    {
                        'Reply "STOP" to any message to stop receiving SMS messages from us. You may receive one message confirming your opt out. To join again, reply "START" or "YES" to our number. You can also turn text messages off on your My Account page. Changing the mobile number on your account turns text messages off until you opt in again for the new number.'
                    }
                </p>
                <Sub>Message and Data Rates</Sub>
                <p>
                    Message and data rates may apply. Carriers are not liable for delayed or
                    undelivered messages.
                </p>
                <Sub>Support</Sub>
                <p>
                    {'Reply "HELP" for help, email '}
                    <Email />
                    {" or call "}
                    <Phone />
                    {SALON_CONTACT.smsNumber
                        ? `. Our text messages come from ${formatPhone(SALON_CONTACT.smsNumber)}`
                        : ""}
                    {". See our "}
                    <Link href="/privacy" className={link}>
                        Privacy Policy
                    </Link>
                    .
                </p>
            </PolicySection>

            <PolicySection id="contact" heading="4. Contact Us">
                <address className="not-italic">
                    {LEGAL_CONTACT.postalLines.map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))}
                    <span className="block">
                        {"Phone: "}
                        <Phone />
                    </span>
                    <span className="block">
                        <Email />
                    </span>
                </address>
            </PolicySection>
        </PolicyPage>
    )
}
