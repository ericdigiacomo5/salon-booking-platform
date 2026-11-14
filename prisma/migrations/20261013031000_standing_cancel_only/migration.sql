UPDATE "RecurringAppointment" SET "status" = 'CANCELLED' WHERE "status" = 'PAUSED';

CREATE TYPE "RecurringStatus_new" AS ENUM ('ACTIVE', 'CANCELLED');
ALTER TABLE "RecurringAppointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RecurringAppointment" ALTER COLUMN "status" TYPE "RecurringStatus_new" USING ("status"::text::"RecurringStatus_new");
ALTER TYPE "RecurringStatus" RENAME TO "RecurringStatus_old";
ALTER TYPE "RecurringStatus_new" RENAME TO "RecurringStatus";
DROP TYPE "RecurringStatus_old";
ALTER TABLE "RecurringAppointment" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Appointment" DROP COLUMN "cancelledBySeries";
