UPDATE "RecurringAppointment"
SET "seriesEnd" = COALESCE("materializedThrough", "seriesStart")
WHERE "seriesEnd" IS NULL;

ALTER TABLE "RecurringAppointment" ALTER COLUMN "seriesEnd" SET NOT NULL,
DROP COLUMN "materializedThrough";
