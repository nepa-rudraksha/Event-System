-- AlterTable
ALTER TABLE `Order` ADD COLUMN `shopifyCheckoutUrl` VARCHAR(191) NULL,
    ADD COLUMN `shopifyDraftId` VARCHAR(191) NULL,
    ADD COLUMN `shopifyOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Order_shopifyOrderId_idx` ON `Order`(`shopifyOrderId`);
