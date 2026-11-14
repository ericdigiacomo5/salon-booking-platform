ALTER TABLE "AppointmenSlot" DROP CONSTRAINT "AppointmenSlot_appointmentId_fkey";

ALTER TABLE "AppointmenSlot" DROP CONSTRAINT "AppointmenSlot_artistId_fkey";

DROP TABLE "AppointmenSlot";

CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentSlot_artistId_slotStart_key" ON "AppointmentSlot"("artistId", "slotStart");

ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
