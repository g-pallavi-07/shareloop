USE shareloop_db;

-- Listings with seller and category information (INNER JOIN).
SELECT l.listing_id,l.title,l.listing_type,l.price,c.category_name,u.full_name AS seller
FROM Listings l
INNER JOIN Categories c ON c.category_id=l.category_id
INNER JOIN Users u ON u.user_id=l.seller_id
WHERE l.status='available';

-- Number of listings per category, including empty categories (LEFT JOIN).
SELECT c.category_name,COUNT(l.listing_id) AS listing_count
FROM Categories c LEFT JOIN Listings l ON l.category_id=c.category_id
GROUP BY c.category_id,c.category_name ORDER BY listing_count DESC;

-- Sellers with the most active listings (HAVING).
SELECT u.user_id,u.full_name,COUNT(*) AS active_listings
FROM Users u JOIN Listings l ON l.seller_id=u.user_id
WHERE l.status='available' GROUP BY u.user_id,u.full_name
HAVING COUNT(*) >= 1 ORDER BY active_listings DESC;

-- Average, minimum, and maximum review rating for each seller.
SELECT reviewee_id,COUNT(*) AS review_count,AVG(rating) AS average_rating,
       MIN(rating) AS lowest_rating,MAX(rating) AS highest_rating
FROM Reviews GROUP BY reviewee_id;

-- Users who have never created a listing (nested query).
SELECT u.user_id,u.full_name FROM Users u
WHERE NOT EXISTS (SELECT 1 FROM Listings l WHERE l.seller_id=u.user_id);

-- Listings that have never received a request (correlated subquery).
SELECT l.listing_id,l.title FROM Listings l
WHERE NOT EXISTS (
  SELECT 1 FROM OrderItems oi JOIN Orders o ON o.order_id=oi.order_id
  WHERE oi.listing_id=l.listing_id
);

-- Borrowed items whose expected date has passed and which are not returned.
SELECT o.order_id,l.title,o.expected_return_date,u.full_name AS borrower
FROM Orders o JOIN OrderItems oi ON oi.order_id=o.order_id
JOIN Listings l ON l.listing_id=oi.listing_id JOIN Users u ON u.user_id=o.buyer_id
WHERE o.transaction_type='borrow' AND o.status='accepted'
  AND o.expected_return_date < CURRENT_DATE AND o.actual_return_date IS NULL;

-- Sum of recorded payments for completed transactions (demonstration only).
SELECT SUM(p.amount) AS recorded_total,COUNT(p.payment_id) AS payment_count
FROM Payments p JOIN Orders o ON o.order_id=p.order_id
WHERE o.status='completed' AND p.payment_status='paid';

-- Pending requests received by each seller.
SELECT u.full_name,COUNT(o.order_id) AS pending_requests
FROM Users u LEFT JOIN Orders o ON o.seller_id=u.user_id AND o.status='pending'
GROUP BY u.user_id,u.full_name ORDER BY pending_requests DESC;

-- Transaction history for a user (set @user_id before executing).
SET @user_id = 1;
SELECT o.order_id,o.transaction_type,o.status,o.order_date,l.title,
       buyer.full_name AS buyer,seller.full_name AS seller
FROM Orders o JOIN OrderItems oi ON oi.order_id=o.order_id
JOIN Listings l ON l.listing_id=oi.listing_id
JOIN Users buyer ON buyer.user_id=o.buyer_id
JOIN Users seller ON seller.user_id=o.seller_id
WHERE o.buyer_id=@user_id OR o.seller_id=@user_id ORDER BY o.order_date DESC;
