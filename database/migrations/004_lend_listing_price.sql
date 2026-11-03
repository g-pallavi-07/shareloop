ALTER TABLE Listings
  DROP CHECK chk_listings_price,
  ADD CONSTRAINT chk_listings_price CHECK (
    (listing_type='sale' AND price IS NOT NULL AND price >= 0) OR
    (listing_type='borrow' AND (price IS NULL OR price >= 0)) OR
    (listing_type='free' AND price IS NULL)
  );
