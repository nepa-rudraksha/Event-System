-- AlterTable
ALTER TABLE `ExhibitItem` ADD COLUMN `qrCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ExhibitItem_qrCode_key` ON `ExhibitItem`(`qrCode`);

-- CreateIndex
CREATE INDEX `ExhibitItem_qrCode_idx` ON `ExhibitItem`(`qrCode`);
