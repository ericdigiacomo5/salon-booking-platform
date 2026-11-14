import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { PolicyPage, PolicySection } from "@/components/legal/policy-page"
import { LEGAL_CONTACT, SITE_NAME } from "@/lib/site"

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: `A sample privacy policy for ${SITE_NAME}, a demo business.`,
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

function Email() {
    return (
        <a href={`mailto:${LEGAL_CONTACT.email}`} className={link}>
            {LEGAL_CONTACT.email}
        </a>
    )
}

export default function PrivacyPage() {
    return (
        <PolicyPage title="Privacy Policy" lastUpdated={null}>
            <div className="rounded-md border-2 border-dashed border-line bg-cream p-4 text-sm text-muted-foreground">
                <p className="font-semibold uppercase tracking-wide">Sample policy</p>
                <p className="mt-1">
                    {`${SITE_NAME} is not a real business. This page shows how the site lays out its privacy policy; the text is a shortened sample, not legal advice. The text-message section is the standard carrier wording a real deployment needs.`}
                </p>
            </div>

            <PolicySection id="infocollect" heading="1. What Information Do We Collect?">
                <p>
                    Staff set up customer accounts and book appointments, so we hold what is needed
                    for that:
                </p>
                <List
                    items={[
                        "your name, email address and phone number",
                        "your appointments, the services booked and how each visit was paid (we never take card details)",
                        "your store-credit balance and its history",
                        "if you opt in to texts, your mobile number and a record of your consent",
                    ]}
                />
            </PolicySection>

            <PolicySection id="infouse" heading="2. How Do We Use Your Information?">
                <p>
                    To manage your appointments, send booking emails (and texts if you opt in), keep
                    your account secure, and keep the records a business must keep.
                </p>
            </PolicySection>

            <PolicySection id="whoshare" heading="3. Who Do We Share It With?">
                <p>
                    Only the service providers that run the site for us: hosting, the database,
                    email delivery, image hosting and text-message delivery. We do not sell your
                    information.
                </p>
            </PolicySection>

            <PolicySection id="cookies" heading="4. Cookies">
                <p>
                    A few strictly necessary cookies keep you signed in and protect forms. There are
                    no advertising or tracking cookies.
                </p>
            </PolicySection>

            <PolicySection id="sms" heading="5. Text Messages">
                <p>
                    {
                        "If you opt in to appointment text messages, we collect your mobile phone number and a record of your consent (when you opted in, confirmed, and opted out, and the wording you agreed to), and we keep a record of the messages we send you. We use this information only to send the appointment messages you asked for. Our messaging provider, Twilio, delivers these messages on our behalf. You can opt out at any time by replying STOP to any message, or on your "
                    }
                    <Link href="/account" className={link}>
                        My Account
                    </Link>
                    {" page. See our "}
                    <Link href="/terms#sms" className={link}>
                        Terms
                    </Link>
                    {" for details of our text message program."}
                </p>
                <p className="font-medium text-foreground">
                    No mobile information will be shared with third parties or affiliates for
                    marketing or promotional purposes. Information sharing to subcontractors in
                    support services, such as customer service, is permitted. All other use case
                    categories exclude text messaging originator opt-in data and consent; this
                    information will not be shared with any third parties.
                </p>
            </PolicySection>

            <PolicySection id="contact" heading="6. Contact Us">
                <p>
                    {"Questions about this policy, or a request to see or delete your data: email "}
                    <Email />
                    {" or write to:"}
                </p>
                <address className="not-italic">
                    {LEGAL_CONTACT.postalLines.map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))}
                </address>
            </PolicySection>
        </PolicyPage>
    )
}
