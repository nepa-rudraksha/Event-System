/*
  Warnings:

  - You are about to drop the column `askExpertContent` on the `ExhibitItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Event` ADD COLUMN `askExpertContent` TEXT NULL;

-- AlterTable
ALTER TABLE `ExhibitItem` ADD COLUMN `actualPrice` DOUBLE NULL,
    ADD COLUMN `discountPercentage` DOUBLE NULL,
    ADD COLUMN `discountedPrice` DOUBLE NULL;

-- AlterTable
ALTER TABLE `ExhibitItem` DROP COLUMN `askExpertContent`;
