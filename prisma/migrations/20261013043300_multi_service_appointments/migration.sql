CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringAppointmentService" (
    "id" TEXT NOT NULL,
    "recurringAppointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "RecurringAppointmentService_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppointmentService" ("id", "appointmentId", "serviceId", "position", "priceCents", "durationMinutes")
SELECT 'as_' || a."id", a."id", a."serviceId", 0, s."priceCents", s."durationMinutes"
FROM "Appointment" a
JOIN "Service" s ON s."id" = a."serviceId";

INSERT INTO "RecurringAppointmentService" ("id", "recurringAppointmentId", "serviceId", "position")
SELECT 'ras_' || r."id", r."id", r."serviceId", 0
FROM "RecurringAppointment" r;

CREATE UNIQUE INDEX "AppointmentService_appointmentId_serviceId_key" ON "AppointmentService"("appointmentId", "serviceId");

CREATE UNIQUE INDEX "RecurringAppointmentService_recurringAppointmentId_serviceI_key" ON "RecurringAppointmentService"("recurringAppointmentId", "serviceId");

ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringAppointmentService" ADD CONSTRAINT "RecurringAppointmentService_recurringAppointmentId_fkey" FOREIGN KEY ("recurringAppointmentId") REFERENCES "RecurringAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringAppointmentService" ADD CONSTRAINT "RecurringAppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";

ALTER TABLE "RecurringAppointment" DROP CONSTRAINT "RecurringAppointment_serviceId_fkey";

ALTER TABLE "Appointment" DROP COLUMN "serviceId";

ALTER TABLE "RecurringAppointment" DROP COLUMN "serviceId";
