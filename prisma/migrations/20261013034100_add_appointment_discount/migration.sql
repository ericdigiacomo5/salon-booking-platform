CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'AMOUNT');

ALTER TABLE "Appointment" ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" INTEGER;
