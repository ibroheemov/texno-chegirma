-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "withinRange" BOOLEAN;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "allowedLat" DOUBLE PRECISION,
ADD COLUMN     "allowedLng" DOUBLE PRECISION,
ADD COLUMN     "allowedLocationName" TEXT,
ADD COLUMN     "allowedRadius" INTEGER DEFAULT 100,
ADD COLUMN     "hourlyRate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isCourier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "login" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "OnlineOrder" ADD COLUMN     "courierId" TEXT;

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
