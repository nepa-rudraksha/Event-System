-- AlterTable
ALTER TABLE `Order` MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE `RecommendationItem` MODIFY `notes` TEXT NULL;
