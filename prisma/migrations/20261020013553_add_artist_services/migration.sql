CREATE TABLE "ArtistService" (
    "artistId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ArtistService_pkey" PRIMARY KEY ("artistId","serviceId")
);

CREATE INDEX "ArtistService_serviceId_idx" ON "ArtistService"("serviceId");

ALTER TABLE "ArtistService" ADD CONSTRAINT "ArtistService_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArtistService" ADD CONSTRAINT "ArtistService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
