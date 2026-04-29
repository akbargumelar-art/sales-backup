-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'SALESFORCE') NOT NULL DEFAULT 'SALESFORCE',
    `tap` VARCHAR(191) NOT NULL,
    `allowedTaps` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_tap_idx`(`tap`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `kategori` ENUM('VIRTUAL', 'FISIK') NOT NULL,
    `namaProduk` VARCHAR(191) NOT NULL,
    `harga` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isVirtualNominal` BOOLEAN NOT NULL DEFAULT false,
    `brand` ENUM('LINKAJA', 'FINPAY') NULL,
    `adminFee` INTEGER NULL,
    `minNominal` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_kode_key`(`kode`),
    INDEX `products_kategori_idx`(`kategori`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outlets` (
    `id` VARCHAR(191) NOT NULL,
    `idOutlet` VARCHAR(191) NOT NULL,
    `nomorRS` VARCHAR(191) NOT NULL,
    `namaOutlet` VARCHAR(191) NOT NULL,
    `tap` VARCHAR(191) NOT NULL,
    `kabupaten` VARCHAR(191) NOT NULL,
    `kecamatan` VARCHAR(191) NOT NULL,
    `isManual` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `outlets_idOutlet_key`(`idOutlet`),
    INDEX `outlets_tap_idx`(`tap`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `nomorTransaksi` VARCHAR(191) NOT NULL,
    `outletId` VARCHAR(191) NOT NULL,
    `salesforceId` VARCHAR(191) NOT NULL,
    `status` ENUM('COMPLETED', 'PENDING_CANCEL', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    `totalTagihan` INTEGER NOT NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `ownerPhone` VARCHAR(191) NOT NULL,
    `catatan` TEXT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `cancelReason` TEXT NULL,
    `cancelRequestedBy` VARCHAR(191) NULL,
    `cancelRequestedAt` DATETIME(3) NULL,
    `cancelApprovedAt` DATETIME(3) NULL,
    `cancelInitiatedBy` ENUM('ADMIN', 'SALESFORCE') NULL,

    UNIQUE INDEX `transactions_nomorTransaksi_key`(`nomorTransaksi`),
    INDEX `transactions_salesforceId_idx`(`salesforceId`),
    INDEX `transactions_outletId_idx`(`outletId`),
    INDEX `transactions_status_idx`(`status`),
    INDEX `transactions_submittedAt_idx`(`submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_items` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `hargaSatuan` INTEGER NOT NULL,
    `kuantiti` INTEGER NOT NULL,
    `subTotal` INTEGER NOT NULL,
    `snAwal` VARCHAR(191) NULL,
    `snAkhir` VARCHAR(191) NULL,
    `serialNumbers` JSON NULL,

    INDEX `transaction_items_transactionId_idx`(`transactionId`),
    INDEX `transaction_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_outletId_fkey` FOREIGN KEY (`outletId`) REFERENCES `outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_salesforceId_fkey` FOREIGN KEY (`salesforceId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_items` ADD CONSTRAINT `transaction_items_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_items` ADD CONSTRAINT `transaction_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
