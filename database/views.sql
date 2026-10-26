USE shareloop_db;

CREATE OR REPLACE VIEW active_listing_summary AS
SELECT l.listing_id,l.title,l.listing_type,l.price,l.item_condition,l.quantity,
       l.created_at,c.category_name,u.user_id AS seller_id,u.full_name AS seller_name
FROM Listings l
JOIN Categories c ON c.category_id=l.category_id
JOIN Users u ON u.user_id=l.seller_id
WHERE l.status='available' AND u.account_status='active';

CREATE OR REPLACE VIEW seller_rating_summary AS
SELECT u.user_id,u.full_name,COUNT(r.review_id) AS review_count,
       ROUND(AVG(r.rating),2) AS average_rating
FROM Users u
LEFT JOIN Reviews r ON r.reviewee_id=u.user_id
GROUP BY u.user_id,u.full_name;
