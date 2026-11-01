ALTER TABLE Orders
  ADD COLUMN buyer_handover_confirmed_at TIMESTAMP NULL,
  ADD COLUMN seller_handover_confirmed_at TIMESTAMP NULL,
  ADD COLUMN buyer_payment_confirmed_at TIMESTAMP NULL,
  ADD COLUMN seller_payment_confirmed_at TIMESTAMP NULL;
