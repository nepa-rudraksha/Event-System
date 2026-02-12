-- AlterTable
ALTER TABLE `ExhibitItem` ADD COLUMN `actualPrice` DOUBLE NULL,
    ADD COLUMN `askExpertContent` TEXT NULL,
    ADD COLUMN `discountPercentage` DOUBLE NULL,
    ADD COLUMN `discountedPrice` DOUBLE NULL;
