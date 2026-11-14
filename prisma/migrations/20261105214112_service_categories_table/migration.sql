CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

INSERT INTO "ServiceCategory" ("id", "name", "position", "color") VALUES
    ('category-hands', 'Hands', 1, 'gold'),
    ('category-feet', 'Feet', 2, 'blue'),
    ('category-wax', 'Wax', 3, 'green');

ALTER TABLE "Service" ADD COLUMN "categoryId" TEXT;

UPDATE "Service" SET "categoryId" = CASE "category"
    WHEN 'HANDS' THEN 'category-hands'
    WHEN 'FEET' THEN 'category-feet'
    WHEN 'WAX' THEN 'category-wax'
END;

ALTER TABLE "Service" ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Service" DROP COLUMN "category";

DROP TYPE "ServiceType";
