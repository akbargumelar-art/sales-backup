-- Add audit fields for per-item manual price changes.
ALTER TABLE `transaction_items`
  ADD COLUMN `hargaAwal` INTEGER NULL,
  ADD COLUMN `priceChangeReason` TEXT NULL;
