-- AlterTable
ALTER TABLE `outlets` ADD COLUMN `salesforceUsername` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `outlets_salesforceUsername_idx` ON `outlets`(`salesforceUsername`);
