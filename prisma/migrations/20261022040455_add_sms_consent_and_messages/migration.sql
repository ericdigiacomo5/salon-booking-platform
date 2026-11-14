CREATE TYPE "SmsConsentAction" AS ENUM ('OPTED_IN', 'CONFIRMED', 'OPTED_OUT');

CREATE TYPE "SmsKind" AS ENUM ('OPT_IN_REQUEST', 'BOOKING_CONFIRMATION', 'RECURRING_CONFIRMATION', 'RESCHEDULE', 'CANCELLATION', 'RECURRING_CANCELLATION', 'REMINDER');

ALTER TABLE "User" ADD COLUMN     "smsConfirmRequestedAt" TIMESTAMP(3),
ADD COLUMN     "smsConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsPhone" TEXT;

ALTER TABLE "Appointment" ADD COLUMN     "smsReminderSentAt" TIMESTAMP(3);

CREATE TABLE "SmsConsentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "action" "SmsConsentAction" NOT NULL,
    "source" TEXT NOT NULL,
    "disclosureVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "kind" "SmsKind" NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "providerSid" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsConsentEvent_userId_createdAt_idx" ON "SmsConsentEvent"("userId", "createdAt");

CREATE INDEX "SmsConsentEvent_phone_createdAt_idx" ON "SmsConsentEvent"("phone", "createdAt");

CREATE UNIQUE INDEX "SmsMessage_providerSid_key" ON "SmsMessage"("providerSid");

CREATE INDEX "SmsMessage_userId_createdAt_idx" ON "SmsMessage"("userId", "createdAt");

CREATE INDEX "SmsMessage_appointmentId_idx" ON "SmsMessage"("appointmentId");

CREATE INDEX "User_smsPhone_idx" ON "User"("smsPhone");

ALTER TABLE "SmsConsentEvent" ADD CONSTRAINT "SmsConsentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
