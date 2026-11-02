ALTER TABLE Orders
  ADD COLUMN borrower_return_confirmed_at TIMESTAMP NULL,
  ADD COLUMN seller_return_payment_confirmed_at TIMESTAMP NULL;
