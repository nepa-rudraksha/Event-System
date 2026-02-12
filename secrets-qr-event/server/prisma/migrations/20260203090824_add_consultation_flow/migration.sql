-- AlterTable
ALTER TABLE `Consultation` ADD COLUMN `astrologyReport` JSON NULL;

-- AlterTable
ALTER TABLE `RecommendationItem` ADD COLUMN `checkoutLink` VARCHAR(191) NULL,
    ADD COLUMN `productDetails` JSON NULL;

-- AlterTable
ALTER TABLE `SalesOrderAssist` ADD COLUMN `salesAgentId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paymentId` VARCHAR(191) NULL,
    `orderStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalAmount` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `items` JSON NULL,
    `processedBy` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `whatsappSent` BOOLEAN NOT NULL DEFAULT false,
    `whatsappSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_consultationId_idx`(`consultationId`),
    INDEX `Order_visitorId_idx`(`visitorId`),
    INDEX `Order_paymentStatus_orderStatus_idx`(`paymentStatus`, `orderStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL,
    `templateName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppTemplate_eventId_isActive_idx`(`eventId`, `isActive`),
    UNIQUE INDEX `WhatsAppTemplate_eventId_templateKey_key`(`eventId`, `templateKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `SalesOrderAssist_salesAgentId_status_idx` ON `SalesOrderAssist`(`salesAgentId`, `status`);

-- AddForeignKey
ALTER TABLE `SalesOrderAssist` ADD CONSTRAINT `SalesOrderAssist_salesAgentId_fkey` FOREIGN KEY (`salesAgentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `Consultation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Visitor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppTemplate` ADD CONSTRAINT `WhatsAppTemplate_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Consultation` RENAME INDEX `Consultation_expertId_fkey` TO `Consultation_expertId_idx`;
