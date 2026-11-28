-- CreateTable
CREATE TABLE "DebtEntry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "debtorName" TEXT NOT NULL,
    "phone" TEXT,
    "item" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtEntry_storeId_dueDate_idx" ON "DebtEntry"("storeId", "dueDate");

-- CreateIndex
CREATE INDEX "DebtPayment_entryId_idx" ON "DebtPayment"("entryId");

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DebtEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
