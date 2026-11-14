CREATE TYPE "RetailSaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

ALTER TABLE "AppSettings" ADD COLUMN     "retailTaxRateMillipercent" INTEGER NOT NULL DEFAULT 8625;

ALTER TABLE "CreditEntry" ADD COLUMN     "retailSaleId" TEXT;

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailSale" (
    "id" TEXT NOT NULL,
    "status" "RetailSaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "soldAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "appointmentId" TEXT,
    "artistId" TEXT,
    "discountType" "DiscountType",
    "discountValue" INTEGER,
    "taxRateMillipercent" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod",
    "creditAppliedCents" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,

    CONSTRAINT "RetailSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailSaleItem" (
    "id" TEXT NOT NULL,
    "retailSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "RetailSaleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistRetailPayTerms" (
    "artistId" TEXT NOT NULL,
    "commissionBasisPoints" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistRetailPayTerms_pkey" PRIMARY KEY ("artistId")
);

CREATE TABLE "RetailSalePay" (
    "retailSaleId" TEXT NOT NULL,
    "commissionBasisPoints" INTEGER NOT NULL,
    "backfilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailSalePay_pkey" PRIMARY KEY ("retailSaleId")
);

CREATE INDEX "RetailSale_appointmentId_idx" ON "RetailSale"("appointmentId");

CREATE INDEX "RetailSale_soldAt_idx" ON "RetailSale"("soldAt");

CREATE UNIQUE INDEX "RetailSaleItem_retailSaleId_productId_key" ON "RetailSaleItem"("retailSaleId", "productId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "RetailSaleItem" ADD CONSTRAINT "RetailSaleItem_quantity_check" CHECK ("quantity" >= 1);
ALTER TABLE "RetailSaleItem" ADD CONSTRAINT "RetailSaleItem_unitPriceCents_check" CHECK ("unitPriceCents" >= 0);
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_taxCents_check" CHECK ("taxCents" >= 0);
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_taxRateMillipercent_check" CHECK ("taxRateMillipercent" BETWEEN 0 AND 25000);
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_creditAppliedCents_check" CHECK ("creditAppliedCents" >= 0);
ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_discount_check" CHECK (("discountType" IS NULL) = ("discountValue" IS NULL));
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_retailTaxRateMillipercent_check" CHECK ("retailTaxRateMillipercent" BETWEEN 0 AND 25000);
ALTER TABLE "ArtistRetailPayTerms" ADD CONSTRAINT "ArtistRetailPayTerms_commissionBasisPoints_check" CHECK ("commissionBasisPoints" BETWEEN 0 AND 10000);
ALTER TABLE "RetailSalePay" ADD CONSTRAINT "RetailSalePay_commissionBasisPoints_check" CHECK ("commissionBasisPoints" BETWEEN 0 AND 10000);

ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_retailSaleId_fkey" FOREIGN KEY ("retailSaleId") REFERENCES "RetailSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSale" ADD CONSTRAINT "RetailSale_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSaleItem" ADD CONSTRAINT "RetailSaleItem_retailSaleId_fkey" FOREIGN KEY ("retailSaleId") REFERENCES "RetailSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RetailSaleItem" ADD CONSTRAINT "RetailSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArtistRetailPayTerms" ADD CONSTRAINT "ArtistRetailPayTerms_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailSalePay" ADD CONSTRAINT "RetailSalePay_retailSaleId_fkey" FOREIGN KEY ("retailSaleId") REFERENCES "RetailSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

