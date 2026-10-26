USE shareloop_db;

INSERT IGNORE INTO Categories (category_id,category_name,description) VALUES
(1,'Textbooks','Course books and study guides'),
(2,'Tech & Gadgets','Student technology and accessories'),
(3,'Academic Essentials','Tools and supplies for coursework'),
(4,'Lab Equipment','Lab coats and scientific equipment'),
(5,'Stationery','Writing and drawing supplies'),
(6,'Hostel Essentials','Useful room and hostel items'),
(7,'Sports & Fitness','Sports and exercise equipment'),
(8,'Cycles & Transport','Cycles and commuting gear'),
(9,'Electronics','Audio and electronic devices'),
(10,'Furniture','Furniture for student rooms'),
(11,'Clothing','Clothing and campus wear'),
(12,'Other','Other useful campus items'),
(13,'Books','Course books and reading material');

-- All demo users use ShareLoopDemo!23. Replace these accounts before public deployment.
INSERT IGNORE INTO Users
(user_id,full_name,college_email,password_hash,department,college_year,role) VALUES
(1,'Aarav Mehta','aarav.mehta@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Computer Science','3rd Year','student'),
(2,'Mira Shah','mira.shah@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Electronics Engineering','2nd Year','student'),
(3,'Kabir Rao','kabir.rao@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Mechanical Engineering','4th Year','student'),
(4,'Ananya Iyer','ananya.iyer@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Civil Engineering','1st Year','student'),
(5,'Dev Patel','dev.patel@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Physics','3rd Year','student'),
(6,'Isha Nair','isha.nair@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Biotechnology','2nd Year','student'),
(7,'Rohan Das','rohan.das@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Mathematics','4th Year','student'),
(8,'Tara Kulkarni','tara.kulkarni@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Chemistry','1st Year','student'),
(9,'Neel Verma','neel.verma@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Electrical Engineering','3rd Year','student'),
(10,'ShareLoop Admin','admin@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Administration','Staff','admin'),
(11,'Sana Fernandes','sana.fernandes@college.edu','scrypt:32768:8:1$PWrSy73kB5LK7Qmy$1763407bbb94b67b43900ed4a3422d3a3f38749a4af54bdc13a943a2f0fe6242a5601b810914ac43eba96318ec21cfcc9b1d24768d674b799cc81a952053a153','Chemical Engineering','2nd Year','student');

INSERT IGNORE INTO Listings
(listing_id,seller_id,category_id,title,description,listing_type,price,borrow_duration,item_condition,quantity) VALUES
(1,1,2,'Scientific Calculator','Casio scientific calculator, tested and ready for class.','sale',650,NULL,'Like New',1),
(2,2,3,'Engineering Drawing Set','Complete drawing set with compass and set squares.','sale',420,NULL,'Good',2),
(3,3,1,'Algorithms Textbook','Well-kept algorithms textbook for coursework.','borrow',NULL,'2 weeks','Good',1),
(4,4,9,'Bluetooth Headphones','Wireless headphones with cable and carry pouch.','sale',1800,NULL,'Like New',1),
(5,5,4,'Chemistry Lab Coat','Clean medium lab coat, available to pass on.','free',NULL,NULL,'Fair',1),
(6,6,5,'Mechanical Pencil Set','Three mechanical pencils and spare lead.','sale',180,NULL,'Good',3),
(7,7,6,'Desk Lamp','Adjustable LED desk lamp with USB power.','sale',350,NULL,'Good',1),
(8,8,7,'Yoga Mat','Lightweight exercise mat, cleaned after use.','free',NULL,NULL,'Good',1),
(9,9,8,'City Bicycle','Single-speed bicycle, recently serviced.','borrow',NULL,'1 week','Good',1),
(10,1,1,'Calculus Study Guide','Concise revision guide with worked examples.','sale',250,NULL,'Fair',2),
(11,2,9,'USB-C Hub','Six-port USB-C hub with HDMI output.','sale',700,NULL,'Like New',1),
(12,3,12,'Board Game Collection','A few complete board games for the common room.','free',NULL,NULL,'Good',1),
(13,4,10,'Study Chair','Compact chair, suitable for a hostel desk.','sale',900,NULL,'Fair',1),
(14,5,5,'Watercolor Set','Student watercolor set with brushes.','sale',300,NULL,'Good',1),
(15,6,4,'Digital Multimeter','Basic digital multimeter for lab practice.','borrow',NULL,'3 days','Good',1),
(16,7,11,'Winter Hoodie','Warm campus hoodie, size medium.','sale',500,NULL,'Good',1),
(17,8,6,'Electric Kettle','Small kettle, working and clean.','sale',450,NULL,'Fair',1),
(18,9,3,'Lab Safety Goggles','Pair of protective lab goggles.','free',NULL,NULL,'Like New',2),
(19,1,7,'Badminton Racket','One racket with protective cover.','borrow',NULL,'1 week','Good',1),
(20,2,1,'Physics Reference Book','Reference book for first-year physics.','sale',380,NULL,'Good',1),
(21,3,2,'Wireless Mouse','Compact wireless mouse with USB receiver.','sale',320,NULL,'Good',1),
(22,4,3,'Graphing Notebook Pack','Pack of graph notebooks for coursework.','free',NULL,NULL,'Like New',2),
(23,5,4,'Safety Goggles','Protective eyewear for lab sessions.','sale',150,NULL,'Good',2),
(24,6,5,'Desk Organizer','Small organizer for pens and stationery.','sale',120,NULL,'Fair',1),
(25,7,6,'Single Bed Mattress','Hostel mattress topper, clean and stored indoors.','free',NULL,NULL,'Good',1),
(26,8,7,'Football','Standard football for recreation.','borrow',NULL,'3 days','Good',1),
(27,9,8,'Cycle Helmet','Adjustable bicycle helmet with straps.','sale',280,NULL,'Good',1),
(28,1,9,'Portable Speaker','Small Bluetooth speaker with charging cable.','sale',600,NULL,'Fair',1),
(29,2,10,'Folding Study Table','Foldable table suitable for a small room.','sale',750,NULL,'Good',1),
(30,3,11,'Rain Jacket','Lightweight waterproof jacket, size large.','sale',400,NULL,'Good',1);

UPDATE Listings SET quantity=0,status='unavailable' WHERE listing_id=3;
UPDATE Listings SET quantity=1 WHERE listing_id=10;

INSERT IGNORE INTO ListingImages (listing_id,image_url,is_primary) VALUES
(1,'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&auto=format&fit=crop',TRUE),
(2,'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop',TRUE),
(3,'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop',TRUE),
(4,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop',TRUE),
(7,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop',TRUE);

INSERT IGNORE INTO Orders
(order_id,buyer_id,seller_id,transaction_type,status,expected_return_date,actual_return_date,buyer_note,completed_at) VALUES
(1,2,1,'purchase','pending',NULL,NULL,'Can we meet near the library?',NULL),
(2,2,3,'borrow','accepted',DATE_ADD(CURRENT_DATE,INTERVAL 10 DAY),NULL,'I will return it next week.',NULL),
(3,4,1,'purchase','completed',NULL,NULL,'Thanks for the book.',CURRENT_TIMESTAMP),
(4,5,4,'purchase','rejected',NULL,NULL,'Is pickup possible this afternoon?',NULL),
(5,6,5,'purchase','cancelled',NULL,NULL,'I found another set.',NULL),
(6,7,6,'borrow','completed',DATE_SUB(CURRENT_DATE,INTERVAL 2 DAY),CURRENT_DATE,'Returned after lab.',CURRENT_TIMESTAMP);

INSERT IGNORE INTO OrderItems (order_id,listing_id,quantity,unit_price) VALUES
(1,1,1,650),(2,3,1,0),(3,10,1,250),(4,13,1,900),(5,14,1,300),(6,15,1,0);

INSERT IGNORE INTO Favorites (user_id,listing_id) VALUES
(2,1),(3,4),(4,6),(5,7),(6,10);

INSERT IGNORE INTO Payments (order_id,amount,payment_method,payment_status,transaction_reference,paid_at) VALUES
(3,250,'cash','paid','DEMO-CASH-0003',CURRENT_TIMESTAMP);

INSERT IGNORE INTO Reviews (order_id,reviewer_id,reviewee_id,rating,comment) VALUES
(3,4,1,5,'Helpful seller and item as described.');

INSERT IGNORE INTO Reports (reporter_id,listing_id,reason,details) VALUES
(5,12,'Incorrect details','Please verify the item description before responding.');

INSERT IGNORE INTO Notifications (user_id,order_id,message,notification_type,is_read) VALUES
(1,1,'You received a new listing request.','request_received',FALSE),
(2,2,'Your borrow request was accepted.','request_accepted',TRUE);

INSERT IGNORE INTO HandoverRecords
(order_id,handover_type,confirmed_by,confirmation_status,confirmed_at,notes) VALUES
(3,'collection',4,'confirmed',CURRENT_TIMESTAMP,'Sample completed handover.');
