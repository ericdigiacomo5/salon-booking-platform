CREATE TYPE "ServiceType" AS ENUM ('HANDS', 'FEET', 'WAX');

ALTER TABLE "Service" ADD COLUMN "category" "ServiceType";

UPDATE "Service" SET "category" = CASE
    WHEN "name" ILIKE '%pedi%' OR "name" ILIKE '%foot%' OR "name" ILIKE '%feet%' THEN 'FEET'::"ServiceType"
    WHEN "name" ILIKE '%wax%' THEN 'WAX'::"ServiceType"
    ELSE 'HANDS'::"ServiceType"
END
WHERE "category" IS NULL;

ALTER TABLE "Service" ALTER COLUMN "category" SET NOT NULL;
