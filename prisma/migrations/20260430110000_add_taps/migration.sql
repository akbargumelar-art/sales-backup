-- CreateTable
CREATE TABLE `taps` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `taps_kode_key`(`kode`),
    INDEX `taps_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed existing default TAP choices so upgraded installs keep the same options.
INSERT INTO `taps` (`id`, `kode`, `nama`, `isActive`, `createdAt`, `updatedAt`) VALUES
('tap_cirebon', 'TAP-CIREBON', 'Cirebon', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('tap_bandung', 'TAP-BANDUNG', 'Bandung', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('tap_jakarta', 'TAP-JAKARTA', 'Jakarta', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('tap_semarang', 'TAP-SEMARANG', 'Semarang', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('tap_surabaya', 'TAP-SURABAYA', 'Surabaya', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
