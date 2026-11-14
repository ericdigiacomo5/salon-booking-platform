import { BOOKING_PHONE, SALON_CONTACT, SITE_NAME, formatPhone } from "@/lib/site"
import { formatDuration, formatPrice } from "@/lib/format"
import { describeDiscount, discountCents, totalCents, type Discount } from "@/lib/discount"
import { describeNoticeWindow } from "@/lib/recurring"
import { formatSalonDate, formatSalonTime } from "@/lib/salon-time"

type RenderedEmail = {
    subject: string
    html: string
    text: string
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

export function formatAppointmentWhen(date: Date): string {
    const day = formatSalonDate(date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    })
    return `${day} at ${formatSalonTime(date)}`
}

function formatShortDate(date: Date): string {
    return formatSalonDate(date, { weekday: "short", month: "short", day: "numeric" })
}

type LayoutArgs = {
    heading: string
    paragraphs: string[]
    details?: [label: string, value: string][]
    list?: string[]
    button?: { label: string; url: string }
    secondaryLink?: { label: string; url: string }
    footer: string
}

const EMAIL = {
    page: "#f6ead9",
    card: "#fbf3e7",
    navy: "#16212c",
    gold: "#b8863b",
    goldText: "#8a5f1e",
    text: "#16212c",
    muted: "#52606c",
    onNavy: "#d8e2ea",
    border: "#e6c8a4",
    serif: "Georgia, 'Times New Roman', serif",
    sans: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
}

function contactLines(): string[] {
    return [
        SALON_CONTACT.address,
        SALON_CONTACT.phone ? formatPhone(SALON_CONTACT.phone) : null,
    ].filter((line): line is string => line !== null)
}

function renderHtml({
    heading,
    paragraphs,
    details,
    list,
    button,
    secondaryLink,
    footer,
}: LayoutArgs): string {
    const paragraphHtml = paragraphs
        .map(
            (p) =>
                `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.55; color: ${EMAIL.text};">${escapeHtml(p)}</p>`,
        )
        .join("")

    const detailsHtml = details
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 15px; line-height: 1.6; margin: 8px 0 18px; border-collapse: collapse; border-top: 1px solid ${EMAIL.border};">${details
              .map(
                  ([label, value]) =>
                      `<tr><td style="color: ${EMAIL.muted}; padding: 8px 16px 8px 0; vertical-align: top; border-bottom: 1px solid ${EMAIL.border}; white-space: nowrap;">${escapeHtml(label)}</td><td style="color: ${EMAIL.text}; padding: 8px 0; border-bottom: 1px solid ${EMAIL.border};">${escapeHtml(value)}</td></tr>`,
              )
              .join("")}</table>`
        : ""

    const listHtml = list
        ? `<ul style="margin: 0 0 18px; font-size: 15px; line-height: 1.6; padding-left: 20px; color: ${EMAIL.text};">${list
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
        : ""

    const buttonHtml = button
        ? `<p style="margin: 24px 0 8px;"><a href="${escapeHtml(button.url)}" style="background: ${EMAIL.gold}; color: ${EMAIL.navy}; border: 1px solid ${EMAIL.navy}; padding: 13px 22px; text-decoration: none; border-radius: 3px; font-family: ${EMAIL.sans}; font-size: 14px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; display: inline-block;">${escapeHtml(button.label)}</a></p>`
        : ""

    const secondaryHtml = secondaryLink
        ? `<p style="margin: 16px 0 0; font-size: 14px;"><a href="${escapeHtml(secondaryLink.url)}" style="color: ${EMAIL.goldText}; font-weight: bold;">${escapeHtml(secondaryLink.label)} &rarr;</a></p>`
        : ""

    const contactHtml = contactLines()
        .map((line) => `${escapeHtml(line)}<br>`)
        .join("")

    return `
<div style="margin: 0; padding: 24px 12px; background: ${EMAIL.page};">
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width: 100%; max-width: 520px; margin: 0 auto; border-collapse: collapse; font-family: ${EMAIL.sans};">
    <tr><td style="background: ${EMAIL.navy}; padding: 20px 28px; border-bottom: 3px solid ${EMAIL.gold};">
      <div style="font-family: ${EMAIL.serif}; font-size: 22px; font-weight: bold; letter-spacing: 0.08em; color: #ffffff;">${escapeHtml(SITE_NAME.toUpperCase())}</div>
      <div style="font-family: ${EMAIL.serif}; font-style: italic; font-size: 14px; color: ${EMAIL.gold};">Anytown, N.Y.</div>
    </td></tr>
    <tr><td style="background: ${EMAIL.card}; padding: 28px; border: 1px solid ${EMAIL.border}; border-top: 0;">
      <h1 style="margin: 0 0 16px; font-family: ${EMAIL.serif}; font-size: 24px; line-height: 1.25; color: ${EMAIL.navy};">${escapeHtml(heading)}</h1>
      ${paragraphHtml}${detailsHtml}${listHtml}${buttonHtml}${secondaryHtml}
    </td></tr>
    <tr><td style="padding: 18px 28px; font-size: 13px; line-height: 1.55; color: ${EMAIL.muted};">
      ${escapeHtml(footer)}<br><br>
      <strong style="color: ${EMAIL.navy};">${escapeHtml(SITE_NAME)}</strong><br>
      ${contactHtml}
    </td></tr>
  </table>
</div>
    `.trim()
}

function renderText({
    heading,
    paragraphs,
    details,
    list,
    button,
    secondaryLink,
    footer,
}: LayoutArgs): string {
    const lines: string[] = [heading, ""]
    for (const p of paragraphs) lines.push(p, "")
    if (details) {
        for (const [label, value] of details) lines.push(`${label}: ${value}`)
        lines.push("")
    }
    if (list) {
        for (const item of list) lines.push(`- ${item}`)
        lines.push("")
    }
    if (button) lines.push(`${button.label}: ${button.url}`, "")
    if (secondaryLink) lines.push(`${secondaryLink.label}: ${secondaryLink.url}`, "")
    lines.push(footer, "", SITE_NAME, ...contactLines())
    return lines.join("\n")
}

function render(subject: string, layout: LayoutArgs): RenderedEmail {
    return { subject, html: renderHtml(layout), text: renderText(layout) }
}

export type AppointmentEmailDetails = {
    customerName: string | null
    serviceName: string
    artistName: string
    startTime: Date
    durationMinutes: number
    priceCents: number
    discount: Discount | null
    manageUrl: string | null
    cancellationNoticeHours: number
}

function greeting(name: string | null): string {
    return name ? `Hi ${name},` : "Hi,"
}

function appointmentDetails(a: AppointmentEmailDetails): [string, string][] {
    return [
        ["When", formatAppointmentWhen(a.startTime)],
        ["Service", `${a.serviceName} (${formatDuration(a.durationMinutes)})`],
        ["With", a.artistName],
    ]
}

function manageButton(manageUrl: string | null): LayoutArgs["button"] {
    return manageUrl ? { label: "View My Bookings", url: manageUrl } : undefined
}

function changeFooter(a: AppointmentEmailDetails): string {
    const phone = formatPhone(BOOKING_PHONE)
    return a.cancellationNoticeHours > 0
        ? `Need to change or cancel? Call us at ${phone}, at least ${describeNoticeWindow(a.cancellationNoticeHours)} in advance, please.`
        : `Need to change or cancel? Call us at ${phone}.`
}
const CONTACT_FOOTER = "Questions? Contact the salon directly."

export function bookingConfirmationEmail(a: AppointmentEmailDetails): RenderedEmail {
    return render(`You're booked: ${a.serviceName} on ${formatShortDate(a.startTime)}`, {
        heading: "Your appointment is booked",
        paragraphs: [
            greeting(a.customerName),
            `Thanks for booking with ${SITE_NAME} — here are your details:`,
        ],
        details: [...appointmentDetails(a), ["Price", formatPrice(a.priceCents)]],
        button: manageButton(a.manageUrl),
        footer: changeFooter(a),
    })
}

export function appointmentReminderEmail(a: AppointmentEmailDetails): RenderedEmail {
    return render(`Reminder: ${a.serviceName} on ${formatShortDate(a.startTime)}`, {
        heading: "See you soon",
        paragraphs: [
            greeting(a.customerName),
            `This is a reminder of your upcoming ${SITE_NAME} appointment.`,
        ],
        details: appointmentDetails(a),
        button: manageButton(a.manageUrl),
        footer: `If you can no longer make it, please call us at ${formatPhone(BOOKING_PHONE)} as soon as possible.`,
    })
}

export function appointmentRescheduledEmail(
    a: AppointmentEmailDetails & { previousStartTime: Date },
): RenderedEmail {
    return render(`Your appointment has moved to ${formatShortDate(a.startTime)}`, {
        heading: "Your appointment has been rescheduled",
        paragraphs: [
            greeting(a.customerName),
            `Your ${a.serviceName} appointment, previously ${formatAppointmentWhen(a.previousStartTime)}, has a new time:`,
        ],
        details: appointmentDetails(a),
        button: manageButton(a.manageUrl),
        footer: changeFooter(a),
    })
}

export function appointmentCancelledEmail(
    a: AppointmentEmailDetails & { cancelledBy: "customer" | "salon" },
): RenderedEmail {
    const intro =
        a.cancelledBy === "salon"
            ? `We're sorry — ${SITE_NAME} has had to cancel your appointment.`
            : "Your appointment has been cancelled, as requested."

    return render(`Cancelled: ${a.serviceName} on ${formatShortDate(a.startTime)}`, {
        heading: "Your appointment has been cancelled",
        paragraphs: [greeting(a.customerName), intro],
        details: appointmentDetails(a),
        footer: `To book a new time, call us at ${formatPhone(BOOKING_PHONE)}.`,
    })
}

export function receiptEmail(
    a: AppointmentEmailDetails & {
        paymentMethodLabel: string | null
        creditAppliedCents: number
        checkedOutAt: Date
        products: { lines: string[]; netCents: number; taxCents: number } | null
    },
): RenderedEmail {
    const servicesTotal = totalCents(a.priceCents, a.discount)
    const productsTotal = a.products ? a.products.netCents + a.products.taxCents : 0
    const dueCents = Math.max(0, servicesTotal + productsTotal - a.creditAppliedCents)
    return render(`Your receipt from ${SITE_NAME}`, {
        heading: "Thanks for visiting",
        paragraphs: [greeting(a.customerName), `Here's a record of your ${SITE_NAME} visit.`],
        details: [
            ...appointmentDetails(a),
            ...(a.discount
                ? ([
                      ["Price", formatPrice(a.priceCents)],
                      [
                          "Discount",
                          `${describeDiscount(a.discount)} (-${formatPrice(discountCents(a.priceCents, a.discount))})`,
                      ],
                  ] as [string, string][])
                : []),
            [a.products ? "Services" : "Total", formatPrice(servicesTotal)],
            ...(a.products
                ? ([
                      ["Products", a.products.lines.join(", ")],
                      ["Products price", formatPrice(a.products.netCents)],
                      ["Sales tax", formatPrice(a.products.taxCents)],
                      ["Total", formatPrice(servicesTotal + productsTotal)],
                  ] as [string, string][])
                : []),
            ...(a.creditAppliedCents > 0
                ? ([
                      ["Store credit", `-${formatPrice(a.creditAppliedCents)}`],
                      ["Paid in salon", formatPrice(dueCents)],
                  ] as [string, string][])
                : []),
            ["Paid by", a.paymentMethodLabel ?? "Store credit"],
            ["Checked out", formatAppointmentWhen(a.checkedOutAt)],
        ],
        secondaryLink: SALON_CONTACT.reviewUrl
            ? { label: "Loved your nails? Leave us a review", url: SALON_CONTACT.reviewUrl }
            : undefined,
        footer: "Payment was taken in the salon. This email is for your records only.",
    })
}

export function creditAddedEmail(c: {
    customerName: string | null
    addedCents: number
    balanceCents: number
    accountUrl: string | null
}): RenderedEmail {
    return render(`${formatPrice(c.addedCents)} gift card added to your account`, {
        heading: "Your gift card has been added",
        paragraphs: [
            greeting(c.customerName),
            `A ${formatPrice(c.addedCents)} gift card is now store credit on your ${SITE_NAME} account. It's applied at checkout when you visit — no need to bring the card.`,
        ],
        details: [
            ["Added", formatPrice(c.addedCents)],
            ["Your balance", formatPrice(c.balanceCents)],
        ],
        button: c.accountUrl ? { label: "View My Account", url: c.accountUrl } : undefined,
        footer: "Store credit never expires. Questions? Contact the salon directly.",
    })
}

type SeriesEmailDetails = {
    customerName: string | null
    serviceName: string
    artistName: string
    intervalWeeks: number
    manageUrl: string | null
}

function cadence(intervalWeeks: number): string {
    return intervalWeeks === 1 ? "every week" : `every ${intervalWeeks} weeks`
}

export function recurringConfirmationEmail(
    s: SeriesEmailDetails & { occurrences: Date[]; skippedDates: Date[] },
): RenderedEmail {
    const paragraphs = [
        greeting(s.customerName),
        `Your standing ${s.serviceName} appointment with ${s.artistName}, ${cadence(s.intervalWeeks)}, is set up. These dates are booked:`,
    ]

    const footerParts = ["You'll get a reminder the day before each visit."]
    if (s.skippedDates.length > 0) {
        footerParts.unshift(
            `These dates couldn't be booked because the time wasn't available: ${s.skippedDates.map(formatShortDate).join(", ")}.`,
        )
    }

    return render(`Standing appointment booked: ${s.serviceName}, ${cadence(s.intervalWeeks)}`, {
        heading: "Your standing appointment is booked",
        paragraphs,
        list: s.occurrences.map(formatAppointmentWhen),
        button: manageButton(s.manageUrl),
        footer: footerParts.join(" "),
    })
}

export function recurringCancelledEmail(
    s: SeriesEmailDetails & {
        changedBy: "customer" | "salon"
        cancelledOccurrences: Date[]
    },
): RenderedEmail {
    const who = s.changedBy === "salon" ? `${SITE_NAME} has cancelled` : "You've cancelled"

    const paragraphs = [
        greeting(s.customerName),
        `${who} your standing ${s.serviceName} appointment with ${s.artistName} (${cadence(s.intervalWeeks)}).`,
    ]
    if (s.cancelledOccurrences.length > 0) {
        paragraphs.push("These upcoming appointments have been cancelled:")
    }

    return render(`Standing appointment cancelled: ${s.serviceName}`, {
        heading: "Your standing appointment has been cancelled",
        paragraphs,
        list:
            s.cancelledOccurrences.length > 0
                ? s.cancelledOccurrences.map(formatAppointmentWhen)
                : undefined,
        button: manageButton(s.manageUrl),
        footer: CONTACT_FOOTER,
    })
}

type PasswordResetEmailArgs = {
    resetUrl: string
}

export function passwordResetEmail({ resetUrl }: PasswordResetEmailArgs): RenderedEmail {
    return render(`Reset your ${SITE_NAME} password`, {
        heading: "Reset your password",
        paragraphs: [`We received a request to reset your ${SITE_NAME} password.`],
        button: { label: "Reset Password", url: resetUrl },
        footer: "This link expires in 15 minutes. If you didn't request this, you can ignore this email — your password hasn't been changed.",
    })
}

type AccountInviteEmailArgs = {
    setPasswordUrl: string
    expiresIn: string
}

export function accountInviteEmail({
    setPasswordUrl,
    expiresIn,
}: AccountInviteEmailArgs): RenderedEmail {
    return render(`Your ${SITE_NAME} account is ready`, {
        heading: "See your appointments online",
        paragraphs: [
            `${SITE_NAME} has set up an account for you. Choose a password to see your upcoming appointments, past visits and store credit online.`,
            "To book, change or cancel an appointment, please call or visit the salon.",
        ],
        button: { label: "Choose a Password", url: setPasswordUrl },
        footer: `This link expires in ${expiresIn}. If you weren't expecting it, you can ignore this email.`,
    })
}

type EmailVerificationEmailArgs = {
    verifyUrl: string
    purpose: "signup" | "change"
}

export function emailVerificationEmail({
    verifyUrl,
    purpose,
}: EmailVerificationEmailArgs): RenderedEmail {
    return render(`Confirm your email for ${SITE_NAME}`, {
        heading: "Confirm your email",
        paragraphs: [
            purpose === "signup"
                ? `Please confirm this is your email address to finish setting up your ${SITE_NAME} account.`
                : `Please confirm this is your email address. Your ${SITE_NAME} account will switch to it once you do.`,
        ],
        button: { label: "Confirm Email", url: verifyUrl },
        footer: "This link expires in 24 hours. If you didn't request this, you can ignore this email — nothing will change.",
    })
}

export function emailChangedEmail({ newEmail }: { newEmail: string }): RenderedEmail {
    return render(`Your ${SITE_NAME} email was changed`, {
        heading: "Your email was changed",
        paragraphs: [
            `The email address on your ${SITE_NAME} account was just changed to ${newEmail}. Sign-in and booking emails will go there from now on.`,
            "If you didn't make this change, contact the salon right away.",
        ],
        footer: "You're receiving this because this address was on the account until now.",
    })
}
