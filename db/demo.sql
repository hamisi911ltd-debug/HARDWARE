-- Made-up transactions so the admin panel has something to show. Everything here has an id starting with demo-,
-- and the owner can remove it all with "Clear sample data" on the Overview page.
INSERT OR IGNORE INTO customers (id,name,phone,notes,credit_limit,created_at) VALUES
 ('demo-c1','Mwangi Builders (sample)','','Sample customer',300000,(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-c2','Akinyi Contractors (sample)','','Sample customer',150000,(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-c3','Otieno Fundi (sample)','','Sample customer',0,(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-c4','Wanjiku Homes (sample)','','Sample customer',0,(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000));
INSERT OR IGNORE INTO suppliers (id,name,contact,phone,email,notes,created_at) VALUES
 ('demo-s1','Sample Cement Distributor','','','','Sample supplier',(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-s2','Sample Steel & Mabati Supplier','','','','Sample supplier',(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-s3','Sample Paint Dealer','','','','Sample supplier',(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000)),
 ('demo-s4','Sample Plumbing Wholesaler','','','','Sample supplier',(CAST(strftime('%s','now') AS INTEGER)*1000-3456000000));
INSERT OR IGNORE INTO purchases (id,number,supplier_id,status,invoice_ref,note,total,received_value,paid,user_id,created_at,received_at) VALUES
 ('demo-po501',501,'demo-s1','received','INV-2201','',112000,112000,112000,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2451600000),(CAST(strftime('%s','now') AS INTEGER)*1000-2451600000)),
 ('demo-po502',502,'demo-s2','received','INV-8831','',53800,53800,26900,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1069200000),(CAST(strftime('%s','now') AS INTEGER)*1000-1069200000)),
 ('demo-po503',503,'demo-s3','partial','','',58500,28500,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-464400000),(CAST(strftime('%s','now') AS INTEGER)*1000-464400000)),
 ('demo-po504',504,'demo-s4','ordered','','',46900,0,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-205200000),NULL);
INSERT OR IGNORE INTO purchase_items (id,purchase_id,product_id,name,unit,qty,qty_received,cost) VALUES
 ('demo-po501-BM-3001','demo-po501','p001','Bamburi Nguvu Cement 32.5, 50kg','bag',100,100,770),
 ('demo-po501-BM-3002','demo-po501','p002','Bamburi Fundi Cement, 50kg','bag',50,50,700),
 ('demo-po502-ST-4101','demo-po502','p011','Y12 Deformed Bar, 12m','length',40,40,1090),
 ('demo-po502-ST-4110','demo-po502','p020','Wire Nails, 3 inch','kg',60,60,170),
 ('demo-po503-PA-5001','demo-po503','p064','Crown Silk Vinyl, 4L','tin',10,10,2850),
 ('demo-po503-PA-5002','demo-po503','p067','Sadolin Gloss Enamel, 4L','tin',10,0,3000),
 ('demo-po504-PL-6003','demo-po504','p076','PVC Pipe, 4 inch, 6m','length',30,0,1350),
 ('demo-po504-PL-6006','demo-po504','p081','Ball Valve, 1/2 inch','piece',20,0,320);
INSERT OR IGNORE INTO supplier_payments (id,purchase_id,method,reference,amount,user_id,created_at) VALUES
 ('demo-sp501','demo-po501','bank','',112000,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2365200000)),
 ('demo-sp502','demo-po502','bank','',26900,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-982800000));
INSERT OR IGNORE INTO sales (id,number,status,customer_id,customer_name,customer_phone,subtotal,discount,vat,total,cost_total,returned_total,returned_cost,paid,note,enquiry_id,void_reason,user_id,user_name,created_at,completed_at) VALUES
 ('demo-sale1001',1001,'completed',NULL,'','',850,0,0,850,620,0,0,850,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2529360000),(CAST(strftime('%s','now') AS INTEGER)*1000-2529360000)),
 ('demo-sale1002',1002,'completed',NULL,'','',4500,0,0,4500,3500,0,0,4500,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2509680000),(CAST(strftime('%s','now') AS INTEGER)*1000-2509680000)),
 ('demo-sale1003',1003,'completed',NULL,'','',1650,0,0,1650,1350,0,0,1650,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2435760000),(CAST(strftime('%s','now') AS INTEGER)*1000-2435760000)),
 ('demo-sale1004',1004,'completed','demo-c1','Mwangi Builders (sample)','',900,0,0,900,680,0,0,400,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2435280000),(CAST(strftime('%s','now') AS INTEGER)*1000-2435280000)),
 ('demo-sale1005',1005,'completed','demo-c1','Mwangi Builders (sample)','',6280,0,0,6280,4840,0,0,6280,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000),(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000)),
 ('demo-sale1006',1006,'completed',NULL,'','',350,0,0,350,240,0,0,350,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2360880000),(CAST(strftime('%s','now') AS INTEGER)*1000-2360880000)),
 ('demo-sale1007',1007,'completed','demo-c1','Mwangi Builders (sample)','',250,0,0,250,170,0,0,100,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2356080000),(CAST(strftime('%s','now') AS INTEGER)*1000-2356080000)),
 ('demo-sale1008',1008,'completed','demo-c1','Mwangi Builders (sample)','',1100,0,0,1100,880,0,0,1100,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000),(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-sale1009',1009,'completed',NULL,'','',15250,0,0,15250,12360,0,0,15250,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000),(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-sale1010',1010,'completed',NULL,'','',5960,0,0,5960,4880,0,0,5960,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000),(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000)),
 ('demo-sale1011',1011,'completed',NULL,'','',5420,0,0,5420,4450,0,0,5420,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2169840000),(CAST(strftime('%s','now') AS INTEGER)*1000-2169840000)),
 ('demo-sale1012',1012,'completed',NULL,'','',450,0,0,450,320,0,0,450,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2092080000),(CAST(strftime('%s','now') AS INTEGER)*1000-2092080000)),
 ('demo-sale1013',1013,'completed',NULL,'','',850,0,0,850,630,0,0,850,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2082480000),(CAST(strftime('%s','now') AS INTEGER)*1000-2082480000)),
 ('demo-sale1014',1014,'completed',NULL,'','',17920,0,0,17920,15110,0,0,17920,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000),(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000)),
 ('demo-sale1015',1015,'completed',NULL,'','',4850,0,0,4850,3820,0,0,4850,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000),(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000)),
 ('demo-sale1016',1016,'completed','demo-c1','Mwangi Builders (sample)','',2350,0,0,2350,1840,0,0,2350,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1845840000),(CAST(strftime('%s','now') AS INTEGER)*1000-1845840000)),
 ('demo-sale1017',1017,'completed',NULL,'','',9980,0,0,9980,8360,0,0,9980,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1845360000),(CAST(strftime('%s','now') AS INTEGER)*1000-1845360000)),
 ('demo-sale1018',1018,'completed',NULL,'','',900,0,0,900,640,0,0,900,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1832880000),(CAST(strftime('%s','now') AS INTEGER)*1000-1832880000)),
 ('demo-sale1019',1019,'completed',NULL,'','',23220,0,0,23220,19670,0,0,23220,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000),(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000)),
 ('demo-sale1020',1020,'completed',NULL,'','',2330,0,0,2330,1840,0,0,2330,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000),(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000)),
 ('demo-sale1021',1021,'completed',NULL,'','',1370,0,0,1370,1100,0,0,1370,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1654800000),(CAST(strftime('%s','now') AS INTEGER)*1000-1654800000)),
 ('demo-sale1022',1022,'completed',NULL,'','',820,0,0,820,610,0,0,820,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1650000000),(CAST(strftime('%s','now') AS INTEGER)*1000-1650000000)),
 ('demo-sale1023',1023,'completed','demo-c1','Mwangi Builders (sample)','',650,0,0,650,480,0,0,300,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1582800000),(CAST(strftime('%s','now') AS INTEGER)*1000-1582800000)),
 ('demo-sale1024',1024,'completed','demo-c1','Mwangi Builders (sample)','',4050,0,0,4050,3140,0,0,4050,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000),(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000)),
 ('demo-sale1025',1025,'completed',NULL,'','',1800,0,0,1800,1450,0,0,1800,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1564560000),(CAST(strftime('%s','now') AS INTEGER)*1000-1564560000)),
 ('demo-sale1026',1026,'completed','demo-c1','Mwangi Builders (sample)','',2920,0,0,2920,2400,0,0,2920,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1495440000),(CAST(strftime('%s','now') AS INTEGER)*1000-1495440000)),
 ('demo-sale1027',1027,'completed','demo-c1','Mwangi Builders (sample)','',300,0,0,300,190,0,0,300,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1475760000),(CAST(strftime('%s','now') AS INTEGER)*1000-1475760000)),
 ('demo-sale1028',1028,'completed',NULL,'','',2250,0,0,2250,1760,0,0,2250,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1409040000),(CAST(strftime('%s','now') AS INTEGER)*1000-1409040000)),
 ('demo-sale1029',1029,'completed','demo-c1','Mwangi Builders (sample)','',6620,0,0,6620,5430,0,0,2600,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000),(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000)),
 ('demo-sale1030',1030,'completed','demo-c1','Mwangi Builders (sample)','',3050,0,0,3050,2420,0,0,3050,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1389840000),(CAST(strftime('%s','now') AS INTEGER)*1000-1389840000)),
 ('demo-sale1031',1031,'completed',NULL,'','',420,0,0,420,320,0,0,420,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1317840000),(CAST(strftime('%s','now') AS INTEGER)*1000-1317840000)),
 ('demo-sale1032',1032,'completed',NULL,'','',2800,0,0,2800,2200,0,0,2800,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1302480000),(CAST(strftime('%s','now') AS INTEGER)*1000-1302480000)),
 ('demo-sale1033',1033,'completed',NULL,'','',14500,440,0,14060,11800,0,0,14060,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1236720000),(CAST(strftime('%s','now') AS INTEGER)*1000-1236720000)),
 ('demo-sale1034',1034,'completed',NULL,'','',1950,0,0,1950,1520,0,0,1950,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1134480000),(CAST(strftime('%s','now') AS INTEGER)*1000-1134480000)),
 ('demo-sale1035',1035,'completed','demo-c1','Mwangi Builders (sample)','',9150,0,0,9150,7330,0,0,9150,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000),(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000)),
 ('demo-sale1036',1036,'completed',NULL,'','',17920,0,0,17920,15070,0,0,17920,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000),(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000)),
 ('demo-sale1037',1037,'completed','demo-c1','Mwangi Builders (sample)','',2700,0,0,2700,2080,0,0,2700,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000),(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000)),
 ('demo-sale1038',1038,'completed',NULL,'','',9500,0,0,9500,7600,0,0,9500,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-975600000),(CAST(strftime('%s','now') AS INTEGER)*1000-975600000)),
 ('demo-sale1039',1039,'completed',NULL,'','',760,0,0,760,680,0,0,760,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-970320000),(CAST(strftime('%s','now') AS INTEGER)*1000-970320000)),
 ('demo-sale1040',1040,'completed',NULL,'','',5270,0,0,5270,4240,0,0,5270,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-959760000),(CAST(strftime('%s','now') AS INTEGER)*1000-959760000));
INSERT OR IGNORE INTO sales (id,number,status,customer_id,customer_name,customer_phone,subtotal,discount,vat,total,cost_total,returned_total,returned_cost,paid,note,enquiry_id,void_reason,user_id,user_name,created_at,completed_at) VALUES
 ('demo-sale1041',1041,'completed','demo-c1','Mwangi Builders (sample)','',450,0,0,450,320,0,0,200,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-898320000),(CAST(strftime('%s','now') AS INTEGER)*1000-898320000)),
 ('demo-sale1042',1042,'completed','demo-c1','Mwangi Builders (sample)','',950,0,0,950,780,0,0,400,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-883440000),(CAST(strftime('%s','now') AS INTEGER)*1000-883440000)),
 ('demo-sale1043',1043,'completed','demo-c1','Mwangi Builders (sample)','',3450,0,0,3450,2720,0,0,1400,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-882480000),(CAST(strftime('%s','now') AS INTEGER)*1000-882480000)),
 ('demo-sale1044',1044,'completed','demo-c1','Mwangi Builders (sample)','',4850,0,0,4850,3740,0,0,4850,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-806640000),(CAST(strftime('%s','now') AS INTEGER)*1000-806640000)),
 ('demo-sale1045',1045,'completed',NULL,'','',1100,0,0,1100,880,0,0,1100,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-716880000),(CAST(strftime('%s','now') AS INTEGER)*1000-716880000)),
 ('demo-sale1046',1046,'completed','demo-c1','Mwangi Builders (sample)','',455,0,0,455,338,0,0,455,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-642000000),(CAST(strftime('%s','now') AS INTEGER)*1000-642000000)),
 ('demo-sale1047',1047,'completed',NULL,'','',3050,0,0,3050,2440,0,0,3050,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-547920000),(CAST(strftime('%s','now') AS INTEGER)*1000-547920000)),
 ('demo-sale1048',1048,'completed',NULL,'','',12720,0,0,12720,10150,0,0,12720,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-547440000),(CAST(strftime('%s','now') AS INTEGER)*1000-547440000)),
 ('demo-sale1049',1049,'completed','demo-c1','Mwangi Builders (sample)','',2650,0,0,2650,2120,0,0,1100,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-541200000),(CAST(strftime('%s','now') AS INTEGER)*1000-541200000)),
 ('demo-sale1050',1050,'completed',NULL,'','',13950,0,0,13950,11620,0,0,13950,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-445200000),(CAST(strftime('%s','now') AS INTEGER)*1000-445200000)),
 ('demo-sale1051',1051,'completed','demo-c1','Mwangi Builders (sample)','',380,0,0,380,280,0,0,200,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-363600000),(CAST(strftime('%s','now') AS INTEGER)*1000-363600000)),
 ('demo-sale1052',1052,'completed',NULL,'','',1330,0,0,1330,980,0,0,1330,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-357840000),(CAST(strftime('%s','now') AS INTEGER)*1000-357840000)),
 ('demo-sale1053',1053,'completed',NULL,'','',18480,0,0,18480,15280,0,0,18480,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-352560000),(CAST(strftime('%s','now') AS INTEGER)*1000-352560000)),
 ('demo-sale1054',1054,'completed',NULL,'','',5250,0,0,5250,4020,0,0,5250,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-286800000),(CAST(strftime('%s','now') AS INTEGER)*1000-286800000)),
 ('demo-sale1055',1055,'completed','demo-c1','Mwangi Builders (sample)','',15350,460,0,14890,12420,0,0,14890,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-272880000),(CAST(strftime('%s','now') AS INTEGER)*1000-272880000)),
 ('demo-sale1056',1056,'completed',NULL,'','',420,0,0,420,320,0,0,420,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-209040000),(CAST(strftime('%s','now') AS INTEGER)*1000-209040000)),
 ('demo-sale1057',1057,'completed','demo-c1','Mwangi Builders (sample)','',4750,0,0,4750,4030,0,0,4750,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-208080000),(CAST(strftime('%s','now') AS INTEGER)*1000-208080000)),
 ('demo-sale1058',1058,'completed',NULL,'','',1400,0,0,1400,1100,0,0,1400,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-121200000),(CAST(strftime('%s','now') AS INTEGER)*1000-121200000)),
 ('demo-sale1059',1059,'completed',NULL,'','',1100,0,0,1100,880,0,0,1100,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-117840000),(CAST(strftime('%s','now') AS INTEGER)*1000-117840000)),
 ('demo-sale1060',1060,'completed',NULL,'','',1580,0,0,1580,1140,0,0,1580,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-106320000),(CAST(strftime('%s','now') AS INTEGER)*1000-106320000)),
 ('demo-sale1061',1061,'completed','demo-c1','Mwangi Builders (sample)','',16800,500,0,16300,14190,0,0,16300,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-1260000),(CAST(strftime('%s','now') AS INTEGER)*1000-1260000)),
 ('demo-sale1062',1062,'completed',NULL,'','',120,0,0,120,85,0,0,120,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-840000),(CAST(strftime('%s','now') AS INTEGER)*1000-840000)),
 ('demo-sale1063',1063,'completed','demo-c1','Mwangi Builders (sample)','',420,0,0,420,320,0,0,420,'',NULL,'',NULL,'Sample cashier',(CAST(strftime('%s','now') AS INTEGER)*1000-420000),(CAST(strftime('%s','now') AS INTEGER)*1000-420000));
INSERT OR IGNORE INTO sale_items (id,sale_id,product_id,name,sku,unit,qty,price,cost,returned_qty) VALUES
 ('demo-sale1001-p037','demo-sale1001','p037','Claw Hammer (Nyundo)','HT-2001','piece',1,850,620,0),
 ('demo-sale1002-p052','demo-sale1002','p052','Home Tool Kit','HT-2003','kit',1,4500,3500,0),
 ('demo-sale1003-p076','demo-sale1003','p076','PVC Pipe, 4 inch, 6m','PL-6003','length',1,1650,1350,0),
 ('demo-sale1004-p055','demo-sale1004','p055','Fork Jembe','FM-9002','piece',1,900,680,0),
 ('demo-sale1005-p052','demo-sale1005','p052','Home Tool Kit','HT-2003','kit',1,4500,3500,0),
 ('demo-sale1005-p042','demo-sale1005','p042','Spirit Level, 24 inch','HT-2006','piece',1,1300,980,0),
 ('demo-sale1005-p087','demo-sale1005','p087','PVC Solvent Cement, 250ml','PL-6014','tin',1,480,360,0),
 ('demo-sale1006-p071','demo-sale1006','p071','Paint Brush, 4 inch','PA-5008','piece',1,350,240,0),
 ('demo-sale1007-p094','demo-sale1007','p094','LED Bulb, 9W','EL-7008','piece',1,250,170,0),
 ('demo-sale1008-p009','demo-sale1008','p009','Ceramic Floor Tiles, 40x40','BM-3009','carton',1,1100,880,0),
 ('demo-sale1009-p054','demo-sale1009','p054','Jembe with Handle','FM-9001','piece',1,750,560,0),
 ('demo-sale1009-p075','demo-sale1009','p075','Water Pump, 0.5HP','PL-6002','piece',1,14500,11800,0),
 ('demo-sale1010-p005','demo-sale1010','p005','River Sand, per tonne','BM-3005','tonne',1,2000,1600,0),
 ('demo-sale1010-p003','demo-sale1010','p003','Simba Cement 32.5R, 50kg','BM-3003','bag',1,760,680,0),
 ('demo-sale1010-p083','demo-sale1010','p083','Water Meter, 1/2 inch','PL-6008','piece',1,3200,2600,0),
 ('demo-sale1011-p068','demo-sale1011','p068','Plaster Undercoat, 20L','PA-5005','bucket',1,5200,4300,0),
 ('demo-sale1011-p101','demo-sale1011','p101','Tower Bolt, 6 inch','LK-8105','piece',1,220,150,0),
 ('demo-sale1012-p090','demo-sale1012','p090','Double Socket & Box','EL-7002','piece',1,450,320,0),
 ('demo-sale1013-p073','demo-sale1013','p073','Sandpaper Sheet','PA-5010','sheet',1,50,30,0),
 ('demo-sale1013-p060','demo-sale1013','p060','Spade','FM-9006','piece',1,800,600,0),
 ('demo-sale1014-p023','demo-sale1014','p023','Mabati Corrugated, Gauge 30','RT-4001','metre',1,470,410,0),
 ('demo-sale1014-p048','demo-sale1014','p048','Hand Saw (Msumeno)','HT-2014','piece',1,950,700,0),
 ('demo-sale1014-p074','demo-sale1014','p074','Kenpoly Water Tank, 1000L','PL-6001','piece',1,16500,14000,0),
 ('demo-sale1015-p092','demo-sale1015','p092','Consumer Unit, 6 Way','EL-7006','piece',1,3200,2600,0),
 ('demo-sale1015-p058','demo-sale1015','p058','Sururu (Pickaxe) with Handle','FM-9005','piece',1,1400,1050,0),
 ('demo-sale1015-p094','demo-sale1015','p094','LED Bulb, 9W','EL-7008','piece',1,250,170,0),
 ('demo-sale1016-p097','demo-sale1016','p097','Solex Padlock, 50mm','LK-8101','piece',1,850,640,0),
 ('demo-sale1016-p022','demo-sale1016','p022','Welding Electrodes, 2.5mm','ST-4112','packet',1,1500,1200,0),
 ('demo-sale1017-p089','demo-sale1017','p089','Twin & Earth Cable, 1.5mm, 100m','EL-7004','coil',1,9500,8000,0),
 ('demo-sale1017-p087','demo-sale1017','p087','PVC Solvent Cement, 250ml','PL-6014','tin',1,480,360,0),
 ('demo-sale1018-p081','demo-sale1018','p081','Ball Valve, 1/2 inch','PL-6006','piece',1,450,320,0),
 ('demo-sale1018-p056','demo-sale1018','p056','Panga','FM-9003','piece',1,450,320,0),
 ('demo-sale1019-p078','demo-sale1019','p078','HDPE Pipe, 1 inch, 100m','PL-6012','roll',1,9500,8000,0),
 ('demo-sale1019-p020','demo-sale1019','p020','Wire Nails, 3 inch','ST-4110','kg',1,220,170,0),
 ('demo-sale1019-p065','demo-sale1019','p065','Crown Permacote Weathercoat, 20L','PA-5003','bucket',1,13500,11500,0),
 ('demo-sale1020-p024','demo-sale1020','p024','Mabati Box Profile, Gauge 28','RT-4003','metre',1,780,680,0),
 ('demo-sale1020-p038','demo-sale1020','p038','Club Hammer, 4lb','HT-2007','piece',1,1200,920,0),
 ('demo-sale1020-p102','demo-sale1020','p102','Wood Screws, Assorted','LK-8106','box',1,350,240,0),
 ('demo-sale1021-p030','demo-sale1021','p030','Gypsum Ceiling Board, 8x4','RT-4008','sheet',1,950,780,0),
 ('demo-sale1021-p070','demo-sale1021','p070','Thinner, 1L','PA-5007','tin',1,420,320,0);
INSERT OR IGNORE INTO sale_items (id,sale_id,product_id,name,sku,unit,qty,price,cost,returned_qty) VALUES
 ('demo-sale1022-p057','demo-sale1022','p057','Slasher','FM-9004','piece',1,400,290,0),
 ('demo-sale1022-p070','demo-sale1022','p070','Thinner, 1L','PA-5007','tin',1,420,320,0),
 ('demo-sale1023-p040','demo-sale1023','p040','Karai Mortar Pan','HT-2009','piece',1,650,480,0),
 ('demo-sale1024-p059','demo-sale1024','p059','Shovel (Koleo)','BM-3011','piece',1,750,560,0),
 ('demo-sale1024-p005','demo-sale1024','p005','River Sand, per tonne','BM-3005','tonne',1,2000,1600,0),
 ('demo-sale1024-p042','demo-sale1024','p042','Spirit Level, 24 inch','HT-2006','piece',1,1300,980,0),
 ('demo-sale1025-p029','demo-sale1025','p029','Plywood Board, 8x4','RT-4007','sheet',1,1800,1450,0),
 ('demo-sale1026-p012','demo-sale1026','p012','Y10 Deformed Bar, 12m','ST-4102','length',1,920,800,0),
 ('demo-sale1026-p005','demo-sale1026','p005','River Sand, per tonne','BM-3005','tonne',1,2000,1600,0),
 ('demo-sale1027-p108','demo-sale1027','p108','Safety Goggles','SF-8005','piece',1,300,190,0),
 ('demo-sale1028-p030','demo-sale1028','p030','Gypsum Ceiling Board, 8x4','RT-4008','sheet',1,950,780,0),
 ('demo-sale1028-p042','demo-sale1028','p042','Spirit Level, 24 inch','HT-2006','piece',1,1300,980,0),
 ('demo-sale1029-p009','demo-sale1029','p009','Ceramic Floor Tiles, 40x40','BM-3009','carton',1,1100,880,0),
 ('demo-sale1029-p061','demo-sale1029','p061','Wheelbarrow (Toroli)','BM-3012','piece',1,5200,4300,0),
 ('demo-sale1029-p021','demo-sale1029','p021','Roofing Nails, 3 inch','ST-4111','kg',1,320,250,0),
 ('demo-sale1030-p004','demo-sale1030','p004','Ballast, per tonne','BM-3004','tonne',1,2200,1800,0),
 ('demo-sale1030-p104','demo-sale1030','p104','Safety Helmet & Vest','SF-8001','set',1,850,620,0),
 ('demo-sale1031-p070','demo-sale1031','p070','Thinner, 1L','PA-5007','tin',1,420,320,0),
 ('demo-sale1032-p063','demo-sale1032','p063','Garden Hose, 30m','FM-9008','roll',1,2800,2200,0),
 ('demo-sale1033-p075','demo-sale1033','p075','Water Pump, 0.5HP','PL-6002','piece',1,14500,11800,0),
 ('demo-sale1034-p022','demo-sale1034','p022','Welding Electrodes, 2.5mm','ST-4112','packet',1,1500,1200,0),
 ('demo-sale1034-p081','demo-sale1034','p081','Ball Valve, 1/2 inch','PL-6006','piece',1,450,320,0),
 ('demo-sale1035-p108','demo-sale1035','p108','Safety Goggles','SF-8005','piece',1,300,190,0),
 ('demo-sale1035-p071','demo-sale1035','p071','Paint Brush, 4 inch','PA-5008','piece',1,350,240,0),
 ('demo-sale1035-p031','demo-sale1035','p031','Cordless Drill','PT-1001','piece',1,8500,6900,0),
 ('demo-sale1036-p074','demo-sale1036','p074','Kenpoly Water Tank, 1000L','PL-6001','piece',1,16500,14000,0),
 ('demo-sale1036-p101','demo-sale1036','p101','Tower Bolt, 6 inch','LK-8105','piece',1,220,150,0),
 ('demo-sale1036-p038','demo-sale1036','p038','Club Hammer, 4lb','HT-2007','piece',1,1200,920,0),
 ('demo-sale1037-p042','demo-sale1037','p042','Spirit Level, 24 inch','HT-2006','piece',1,1300,980,0),
 ('demo-sale1037-p008','demo-sale1037','p008','Tile Adhesive, 20kg','BM-3008','bag',1,950,780,0),
 ('demo-sale1037-p081','demo-sale1037','p081','Ball Valve, 1/2 inch','PL-6006','piece',1,450,320,0),
 ('demo-sale1038-p053','demo-sale1038','p053','Carpentry Tool Set','HT-2005','set',1,9500,7600,0),
 ('demo-sale1039-p003','demo-sale1039','p003','Simba Cement 32.5R, 50kg','BM-3003','bag',1,760,680,0),
 ('demo-sale1040-p107','demo-sale1040','p107','Steel Toe Safety Boots','SF-8004','pair',1,3800,3000,0),
 ('demo-sale1040-p091','demo-sale1040','p091','Light Switch, 1 Gang','EL-7005','piece',1,220,150,0),
 ('demo-sale1040-p011','demo-sale1040','p011','Y12 Deformed Bar, 12m','ST-4101','length',1,1250,1090,0),
 ('demo-sale1041-p056','demo-sale1041','p056','Panga','FM-9003','piece',1,450,320,0),
 ('demo-sale1042-p030','demo-sale1042','p030','Gypsum Ceiling Board, 8x4','RT-4008','sheet',1,950,780,0),
 ('demo-sale1043-p080','demo-sale1043','p080','Gate Valve, 1 inch','PL-6005','piece',1,1450,1120,0),
 ('demo-sale1043-p005','demo-sale1043','p005','River Sand, per tonne','BM-3005','tonne',1,2000,1600,0);
INSERT OR IGNORE INTO sale_items (id,sale_id,product_id,name,sku,unit,qty,price,cost,returned_qty) VALUES
 ('demo-sale1044-p052','demo-sale1044','p052','Home Tool Kit','HT-2003','kit',1,4500,3500,0),
 ('demo-sale1044-p071','demo-sale1044','p071','Paint Brush, 4 inch','PA-5008','piece',1,350,240,0),
 ('demo-sale1045-p009','demo-sale1045','p009','Ceramic Floor Tiles, 40x40','BM-3009','carton',1,1100,880,0),
 ('demo-sale1046-p103','demo-sale1046','p103','Bolts & Nuts, Assorted','LK-8107','kg',1,380,280,0),
 ('demo-sale1046-p006','demo-sale1046','p006','Machine-Cut Stone Blocks, 6 inch','BM-3006','piece',1,75,58,0),
 ('demo-sale1047-p097','demo-sale1047','p097','Solex Padlock, 50mm','LK-8101','piece',1,850,640,0),
 ('demo-sale1047-p004','demo-sale1047','p004','Ballast, per tonne','BM-3004','tonne',1,2200,1800,0),
 ('demo-sale1048-p085','demo-sale1048','p085','Toilet Set, Close Coupled','PL-6010','set',1,12500,10000,0),
 ('demo-sale1048-p091','demo-sale1048','p091','Light Switch, 1 Gang','EL-7005','piece',1,220,150,0),
 ('demo-sale1049-p004','demo-sale1049','p004','Ballast, per tonne','BM-3004','tonne',1,2200,1800,0),
 ('demo-sale1049-p081','demo-sale1049','p081','Ball Valve, 1/2 inch','PL-6006','piece',1,450,320,0),
 ('demo-sale1050-p010','demo-sale1050','p010','Wall Putty, 20kg','BM-3010','bag',1,1250,1020,0),
 ('demo-sale1050-p078','demo-sale1050','p078','HDPE Pipe, 1 inch, 100m','PL-6012','roll',1,9500,8000,0),
 ('demo-sale1050-p092','demo-sale1050','p092','Consumer Unit, 6 Way','EL-7006','piece',1,3200,2600,0),
 ('demo-sale1051-p103','demo-sale1051','p103','Bolts & Nuts, Assorted','LK-8107','kg',1,380,280,0),
 ('demo-sale1052-p087','demo-sale1052','p087','PVC Solvent Cement, 250ml','PL-6014','tin',1,480,360,0),
 ('demo-sale1052-p104','demo-sale1052','p104','Safety Helmet & Vest','SF-8001','set',1,850,620,0),
 ('demo-sale1053-p024','demo-sale1053','p024','Mabati Box Profile, Gauge 28','RT-4003','metre',1,780,680,0),
 ('demo-sale1053-p092','demo-sale1053','p092','Consumer Unit, 6 Way','EL-7006','piece',1,3200,2600,0),
 ('demo-sale1053-p032','demo-sale1053','p032','Hammer Drill','PT-1003','piece',1,14500,12000,0),
 ('demo-sale1054-p050','demo-sale1054','p050','Wood Chisel, 1 inch','HT-2016','piece',1,650,470,0),
 ('demo-sale1054-p051','demo-sale1054','p051','Jack Plane (Randa)','HT-2017','piece',1,3200,2500,0),
 ('demo-sale1054-p058','demo-sale1054','p058','Sururu (Pickaxe) with Handle','FM-9005','piece',1,1400,1050,0),
 ('demo-sale1055-p037','demo-sale1055','p037','Claw Hammer (Nyundo)','HT-2001','piece',1,850,620,0),
 ('demo-sale1055-p075','demo-sale1055','p075','Water Pump, 0.5HP','PL-6002','piece',1,14500,11800,0),
 ('demo-sale1056-p070','demo-sale1056','p070','Thinner, 1L','PA-5007','tin',1,420,320,0),
 ('demo-sale1057-p014','demo-sale1057','p014','Binding Wire, 25kg','ST-4104','roll',1,4400,3800,0),
 ('demo-sale1057-p096','demo-sale1057','p096','Electrical Tester','EL-7003','piece',1,350,230,0),
 ('demo-sale1058-p039','demo-sale1058','p039','Mason Trowel (Mwiko)','HT-2008','piece',1,450,320,0),
 ('demo-sale1058-p008','demo-sale1058','p008','Tile Adhesive, 20kg','BM-3008','bag',1,950,780,0),
 ('demo-sale1059-p009','demo-sale1059','p009','Ceramic Floor Tiles, 40x40','BM-3009','carton',1,1100,880,0),
 ('demo-sale1060-p100','demo-sale1060','p100','Butt Hinges, 4 inch','LK-8104','pair',1,180,120,0),
 ('demo-sale1060-p056','demo-sale1060','p056','Panga','FM-9003','piece',1,450,320,0),
 ('demo-sale1060-p048','demo-sale1060','p048','Hand Saw (Msumeno)','HT-2014','piece',1,950,700,0),
 ('demo-sale1061-p074','demo-sale1061','p074','Kenpoly Water Tank, 1000L','PL-6001','piece',1,16500,14000,0),
 ('demo-sale1061-p108','demo-sale1061','p108','Safety Goggles','SF-8005','piece',1,300,190,0),
 ('demo-sale1062-p095','demo-sale1062','p095','PVC Conduit, 20mm, 3m','EL-7009','length',1,120,85,0),
 ('demo-sale1063-p070','demo-sale1063','p070','Thinner, 1L','PA-5007','tin',1,420,320,0);
INSERT OR IGNORE INTO payments (id,sale_id,method,reference,amount,voided,user_id,created_at) VALUES
 ('demo-sale1001-p','demo-sale1001','cash','',850,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2529360000)),
 ('demo-sale1002-p','demo-sale1002','mpesa','SQN8ANY6UQ',4500,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2509680000)),
 ('demo-sale1003-p','demo-sale1003','mpesa','SNW4GG2L6Q',1650,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2435760000)),
 ('demo-sale1004-p','demo-sale1004','cash','',400,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2435280000)),
 ('demo-sale1005-p','demo-sale1005','cash','',6280,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000)),
 ('demo-sale1006-p','demo-sale1006','mpesa','S8CS68W28C',350,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2360880000)),
 ('demo-sale1007-p','demo-sale1007','cash','',100,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2356080000)),
 ('demo-sale1008-p','demo-sale1008','mpesa','SQW88EGAEW',1100,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-sale1009-p','demo-sale1009','cash','',15250,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-sale1010-p','demo-sale1010','cash','',5960,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000)),
 ('demo-sale1011-p','demo-sale1011','mpesa','S0S4WCL0S4',5420,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2169840000)),
 ('demo-sale1012-p','demo-sale1012','mpesa','S6J08NG4S6',450,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2092080000)),
 ('demo-sale1013-p','demo-sale1013','mpesa','SY86800G4U',850,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2082480000)),
 ('demo-sale1014-p','demo-sale1014','mpesa','SSLA4A2S0N',17920,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000)),
 ('demo-sale1015-p','demo-sale1015','cash','',4850,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000)),
 ('demo-sale1016-p','demo-sale1016','cash','',2350,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845840000)),
 ('demo-sale1017-p','demo-sale1017','cash','',9980,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845360000)),
 ('demo-sale1018-p','demo-sale1018','cash','',900,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1832880000)),
 ('demo-sale1019-p','demo-sale1019','mpesa','SYENUU4ACC',23220,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000)),
 ('demo-sale1020-p','demo-sale1020','mpesa','SCJ6YL8USJ',2330,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000)),
 ('demo-sale1021-p','demo-sale1021','cash','',1370,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1654800000)),
 ('demo-sale1022-p','demo-sale1022','cash','',820,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1650000000)),
 ('demo-sale1023-p','demo-sale1023','cash','',300,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1582800000)),
 ('demo-sale1024-p','demo-sale1024','mpesa','SECCCSJYCW',4050,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000)),
 ('demo-sale1025-p','demo-sale1025','cash','',1800,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1564560000)),
 ('demo-sale1026-p','demo-sale1026','cash','',2920,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1495440000)),
 ('demo-sale1027-p','demo-sale1027','mpesa','SYEYJ4N8J2',300,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1475760000)),
 ('demo-sale1028-p','demo-sale1028','mpesa','SUS4CEAJ6J',2250,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1409040000)),
 ('demo-sale1029-p','demo-sale1029','mpesa','SU6S4SA2S2',2600,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000)),
 ('demo-sale1030-p','demo-sale1030','mpesa','SWNJGQY04Q',3050,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1389840000)),
 ('demo-sale1031-p','demo-sale1031','cash','',420,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1317840000)),
 ('demo-sale1032-p','demo-sale1032','mpesa','S48JW602SW',2800,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1302480000)),
 ('demo-sale1033-p','demo-sale1033','cash','',14060,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1236720000)),
 ('demo-sale1034-p','demo-sale1034','cash','',1950,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1134480000)),
 ('demo-sale1035-p','demo-sale1035','mpesa','SA4WSS06GU',9150,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000)),
 ('demo-sale1036-p','demo-sale1036','mpesa','SCQEESSQY0',17920,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000)),
 ('demo-sale1037-p','demo-sale1037','mpesa','SJQSGLJ2GL',2700,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000)),
 ('demo-sale1038-p','demo-sale1038','mpesa','S086LAS2LQ',9500,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-975600000)),
 ('demo-sale1039-p','demo-sale1039','mpesa','SQQ60GY0UG',760,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-970320000)),
 ('demo-sale1040-p','demo-sale1040','mpesa','S8G8Y8JW8G',5270,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-959760000));
INSERT OR IGNORE INTO payments (id,sale_id,method,reference,amount,voided,user_id,created_at) VALUES
 ('demo-sale1041-p','demo-sale1041','mpesa','SW86UY0UEC',200,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-898320000)),
 ('demo-sale1042-p','demo-sale1042','cash','',400,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-883440000)),
 ('demo-sale1043-p','demo-sale1043','cash','',1400,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-882480000)),
 ('demo-sale1044-p','demo-sale1044','cash','',4850,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-806640000)),
 ('demo-sale1045-p','demo-sale1045','mpesa','SQCJ80GE00',1100,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-716880000)),
 ('demo-sale1046-p','demo-sale1046','cash','',455,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-642000000)),
 ('demo-sale1047-p','demo-sale1047','mpesa','S6Y4ANLJ00',3050,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547920000)),
 ('demo-sale1048-p','demo-sale1048','cash','',12720,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547440000)),
 ('demo-sale1049-p','demo-sale1049','mpesa','SUCNWWA48E',1100,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-541200000)),
 ('demo-sale1050-p','demo-sale1050','mpesa','S4ACGYQAC4',13950,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-445200000)),
 ('demo-sale1051-p','demo-sale1051','mpesa','S6C0GEW6UY',200,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-363600000)),
 ('demo-sale1052-p','demo-sale1052','cash','',1330,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-357840000)),
 ('demo-sale1053-p','demo-sale1053','cash','',18480,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-352560000)),
 ('demo-sale1054-p','demo-sale1054','cash','',5250,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-286800000)),
 ('demo-sale1055-p','demo-sale1055','mpesa','S8UCS8NJC2',14890,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-272880000)),
 ('demo-sale1056-p','demo-sale1056','mpesa','SCSSY88QYG',420,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-209040000)),
 ('demo-sale1057-p','demo-sale1057','mpesa','SW4NVNUSN6',4750,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-208080000)),
 ('demo-sale1058-p','demo-sale1058','mpesa','SSJSAQGNS8',1400,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-121200000)),
 ('demo-sale1059-p','demo-sale1059','mpesa','SUASJQWY8W',1100,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-117840000)),
 ('demo-sale1060-p','demo-sale1060','cash','',1580,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-106320000)),
 ('demo-sale1061-p','demo-sale1061','cash','',16300,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1260000)),
 ('demo-sale1062-p','demo-sale1062','cash','',120,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-840000)),
 ('demo-sale1063-p','demo-sale1063','cash','',420,0,NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-420000));
INSERT OR IGNORE INTO stock_movements (id,product_id,delta,balance,reason,note,user_id,created_at) VALUES
 ('demo-m1','p037',-1,45,'sale','Receipt 1001',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2529360000)),
 ('demo-m2','p052',-1,8,'sale','Receipt 1002',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2509680000)),
 ('demo-m3','p001',100,340,'restock','PO 501 from Sample Cement Distributor',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2451600000)),
 ('demo-m4','p002',50,170,'restock','PO 501 from Sample Cement Distributor',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2451600000)),
 ('demo-m5','p076',-1,119,'sale','Receipt 1003',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2435760000)),
 ('demo-m6','p055',-1,31,'sale','Receipt 1004',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2435280000)),
 ('demo-m7','p052',-1,7,'sale','Receipt 1005',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000)),
 ('demo-m8','p042',-1,21,'sale','Receipt 1005',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000)),
 ('demo-m9','p087',-1,28,'sale','Receipt 1005',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2370480000)),
 ('demo-m10','p071',-1,47,'sale','Receipt 1006',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2360880000)),
 ('demo-m11','p094',-1,139,'sale','Receipt 1007',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2356080000)),
 ('demo-m12','p009',-1,43,'sale','Receipt 1008',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-m13','p054',-1,49,'sale','Receipt 1009',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-m14','p075',-1,7,'sale','Receipt 1009',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2276880000)),
 ('demo-m15','p005',-1,35,'sale','Receipt 1010',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000)),
 ('demo-m16','p003',-1,89,'sale','Receipt 1010',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000)),
 ('demo-m17','p083',-1,5,'sale','Receipt 1010',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2195280000)),
 ('demo-m18','p068',-1,9,'sale','Receipt 1011',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2169840000)),
 ('demo-m19','p101',-1,47,'sale','Receipt 1011',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2169840000)),
 ('demo-m20','p090',-1,59,'sale','Receipt 1012',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2092080000)),
 ('demo-m21','p073',-1,219,'sale','Receipt 1013',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2082480000)),
 ('demo-m22','p060',-1,26,'sale','Receipt 1013',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2082480000)),
 ('demo-m23','p023',-1,599,'sale','Receipt 1014',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000)),
 ('demo-m24','p048',-1,27,'sale','Receipt 1014',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000)),
 ('demo-m25','p074',-1,11,'sale','Receipt 1014',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2006160000)),
 ('demo-m26','p092',-1,9,'sale','Receipt 1015',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000)),
 ('demo-m27','p058',-1,24,'sale','Receipt 1015',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000)),
 ('demo-m28','p094',-1,138,'sale','Receipt 1015',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1913520000)),
 ('demo-m29','p097',-1,41,'sale','Receipt 1016',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845840000)),
 ('demo-m30','p022',-1,15,'sale','Receipt 1016',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845840000)),
 ('demo-m31','p089',-1,12,'sale','Receipt 1017',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845360000)),
 ('demo-m32','p087',-1,27,'sale','Receipt 1017',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1845360000)),
 ('demo-m33','p081',-1,33,'sale','Receipt 1018',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1832880000)),
 ('demo-m34','p056',-1,69,'sale','Receipt 1018',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1832880000)),
 ('demo-m35','p078',-1,8,'sale','Receipt 1019',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000)),
 ('demo-m36','p020',-1,159,'sale','Receipt 1019',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000)),
 ('demo-m37','p065',-1,7,'sale','Receipt 1019',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1760880000)),
 ('demo-m38','p024',-1,299,'sale','Receipt 1020',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000)),
 ('demo-m39','p038',-1,16,'sale','Receipt 1020',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000)),
 ('demo-m40','p102',-1,54,'sale','Receipt 1020',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1734480000));
INSERT OR IGNORE INTO stock_movements (id,product_id,delta,balance,reason,note,user_id,created_at) VALUES
 ('demo-m41','p030',-1,31,'sale','Receipt 1021',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1654800000)),
 ('demo-m42','p070',-1,35,'sale','Receipt 1021',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1654800000)),
 ('demo-m43','p057',-1,43,'sale','Receipt 1022',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1650000000)),
 ('demo-m44','p070',-1,34,'sale','Receipt 1022',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1650000000)),
 ('demo-m45','p040',-1,37,'sale','Receipt 1023',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1582800000)),
 ('demo-m46','p059',-1,29,'sale','Receipt 1024',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000)),
 ('demo-m47','p005',-1,34,'sale','Receipt 1024',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000)),
 ('demo-m48','p042',-1,20,'sale','Receipt 1024',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1571280000)),
 ('demo-m49','p029',-1,3,'sale','Receipt 1025',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1564560000)),
 ('demo-m50','p012',-1,129,'sale','Receipt 1026',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1495440000)),
 ('demo-m51','p005',-1,33,'sale','Receipt 1026',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1495440000)),
 ('demo-m52','p108',-1,29,'sale','Receipt 1027',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1475760000)),
 ('demo-m53','p030',-1,30,'sale','Receipt 1028',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1409040000)),
 ('demo-m54','p042',-1,19,'sale','Receipt 1028',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1409040000)),
 ('demo-m55','p009',-1,42,'sale','Receipt 1029',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000)),
 ('demo-m56','p061',-1,13,'sale','Receipt 1029',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000)),
 ('demo-m57','p021',-1,69,'sale','Receipt 1029',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1403760000)),
 ('demo-m58','p004',-1,39,'sale','Receipt 1030',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1389840000)),
 ('demo-m59','p104',-1,59,'sale','Receipt 1030',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1389840000)),
 ('demo-m60','p070',-1,33,'sale','Receipt 1031',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1317840000)),
 ('demo-m61','p063',-1,14,'sale','Receipt 1032',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1302480000)),
 ('demo-m62','p075',-1,6,'sale','Receipt 1033',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1236720000)),
 ('demo-m63','p022',-1,14,'sale','Receipt 1034',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1134480000)),
 ('demo-m64','p081',-1,32,'sale','Receipt 1034',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1134480000)),
 ('demo-m65','p108',-1,28,'sale','Receipt 1035',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000)),
 ('demo-m66','p071',-1,46,'sale','Receipt 1035',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000)),
 ('demo-m67','p031',-1,11,'sale','Receipt 1035',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1133520000)),
 ('demo-m68','p074',-1,10,'sale','Receipt 1036',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000)),
 ('demo-m69','p101',-1,46,'sale','Receipt 1036',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000)),
 ('demo-m70','p038',-1,15,'sale','Receipt 1036',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1127760000)),
 ('demo-m71','p042',-1,18,'sale','Receipt 1037',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000)),
 ('demo-m72','p008',-1,29,'sale','Receipt 1037',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000)),
 ('demo-m73','p081',-1,31,'sale','Receipt 1037',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1074960000)),
 ('demo-m74','p011',40,190,'restock','PO 502 from Sample Steel & Mabati Supplier',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1069200000)),
 ('demo-m75','p020',60,219,'restock','PO 502 from Sample Steel & Mabati Supplier',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1069200000)),
 ('demo-m76','p053',-1,4,'sale','Receipt 1038',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-975600000)),
 ('demo-m77','p003',-1,88,'sale','Receipt 1039',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-970320000)),
 ('demo-m78','p107',-1,14,'sale','Receipt 1040',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-959760000)),
 ('demo-m79','p091',-1,74,'sale','Receipt 1040',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-959760000)),
 ('demo-m80','p011',-1,189,'sale','Receipt 1040',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-959760000));
INSERT OR IGNORE INTO stock_movements (id,product_id,delta,balance,reason,note,user_id,created_at) VALUES
 ('demo-m81','p056',-1,68,'sale','Receipt 1041',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-898320000)),
 ('demo-m82','p030',-1,29,'sale','Receipt 1042',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-883440000)),
 ('demo-m83','p080',-1,14,'sale','Receipt 1043',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-882480000)),
 ('demo-m84','p005',-1,32,'sale','Receipt 1043',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-882480000)),
 ('demo-m85','p052',-1,6,'sale','Receipt 1044',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-806640000)),
 ('demo-m86','p071',-1,45,'sale','Receipt 1044',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-806640000)),
 ('demo-m87','p009',-1,41,'sale','Receipt 1045',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-716880000)),
 ('demo-m88','p103',-1,63,'sale','Receipt 1046',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-642000000)),
 ('demo-m89','p006',-1,799,'sale','Receipt 1046',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-642000000)),
 ('demo-m90','p097',-1,40,'sale','Receipt 1047',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547920000)),
 ('demo-m91','p004',-1,38,'sale','Receipt 1047',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547920000)),
 ('demo-m92','p085',-1,6,'sale','Receipt 1048',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547440000)),
 ('demo-m93','p091',-1,73,'sale','Receipt 1048',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-547440000)),
 ('demo-m94','p004',-1,37,'sale','Receipt 1049',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-541200000)),
 ('demo-m95','p081',-1,30,'sale','Receipt 1049',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-541200000)),
 ('demo-m96','p064',10,26,'restock','PO 503 from Sample Paint Dealer',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-464400000)),
 ('demo-m97','p010',-1,17,'sale','Receipt 1050',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-445200000)),
 ('demo-m98','p078',-1,7,'sale','Receipt 1050',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-445200000)),
 ('demo-m99','p092',-1,8,'sale','Receipt 1050',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-445200000)),
 ('demo-m100','p103',-1,62,'sale','Receipt 1051',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-363600000)),
 ('demo-m101','p087',-1,26,'sale','Receipt 1052',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-357840000)),
 ('demo-m102','p104',-1,58,'sale','Receipt 1052',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-357840000)),
 ('demo-m103','p024',-1,298,'sale','Receipt 1053',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-352560000)),
 ('demo-m104','p092',-1,7,'sale','Receipt 1053',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-352560000)),
 ('demo-m105','p032',-1,2,'sale','Receipt 1053',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-352560000)),
 ('demo-m106','p050',-1,19,'sale','Receipt 1054',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-286800000)),
 ('demo-m107','p051',-1,5,'sale','Receipt 1054',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-286800000)),
 ('demo-m108','p058',-1,23,'sale','Receipt 1054',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-286800000)),
 ('demo-m109','p037',-1,44,'sale','Receipt 1055',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-272880000)),
 ('demo-m110','p075',-1,5,'sale','Receipt 1055',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-272880000)),
 ('demo-m111','p070',-1,32,'sale','Receipt 1056',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-209040000)),
 ('demo-m112','p014',-1,13,'sale','Receipt 1057',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-208080000)),
 ('demo-m113','p096',-1,13,'sale','Receipt 1057',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-208080000)),
 ('demo-m114','p039',-1,59,'sale','Receipt 1058',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-121200000)),
 ('demo-m115','p008',-1,28,'sale','Receipt 1058',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-121200000)),
 ('demo-m116','p009',-1,40,'sale','Receipt 1059',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-117840000)),
 ('demo-m117','p100',-1,89,'sale','Receipt 1060',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-106320000)),
 ('demo-m118','p056',-1,67,'sale','Receipt 1060',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-106320000)),
 ('demo-m119','p048',-1,26,'sale','Receipt 1060',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-106320000)),
 ('demo-m120','p074',-1,9,'sale','Receipt 1061',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1260000));
INSERT OR IGNORE INTO stock_movements (id,product_id,delta,balance,reason,note,user_id,created_at) VALUES
 ('demo-m121','p108',-1,27,'sale','Receipt 1061',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1260000)),
 ('demo-m122','p095',-1,169,'sale','Receipt 1062',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-840000)),
 ('demo-m123','p070',-1,31,'sale','Receipt 1063',NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-420000));
UPDATE products SET stock=340 WHERE id='p001';
UPDATE products SET stock=170 WHERE id='p002';
UPDATE products SET stock=88 WHERE id='p003';
UPDATE products SET stock=37 WHERE id='p004';
UPDATE products SET stock=32 WHERE id='p005';
UPDATE products SET stock=799 WHERE id='p006';
UPDATE products SET stock=8 WHERE id='p007';
UPDATE products SET stock=28 WHERE id='p008';
UPDATE products SET stock=40 WHERE id='p009';
UPDATE products SET stock=17 WHERE id='p010';
UPDATE products SET stock=189 WHERE id='p011';
UPDATE products SET stock=129 WHERE id='p012';
UPDATE products SET stock=3 WHERE id='p013';
UPDATE products SET stock=13 WHERE id='p014';
UPDATE products SET stock=4 WHERE id='p015';
UPDATE products SET stock=9 WHERE id='p016';
UPDATE products SET stock=11 WHERE id='p017';
UPDATE products SET stock=7 WHERE id='p018';
UPDATE products SET stock=6 WHERE id='p019';
UPDATE products SET stock=219 WHERE id='p020';
UPDATE products SET stock=69 WHERE id='p021';
UPDATE products SET stock=14 WHERE id='p022';
UPDATE products SET stock=599 WHERE id='p023';
UPDATE products SET stock=298 WHERE id='p024';
UPDATE products SET stock=45 WHERE id='p025';
UPDATE products SET stock=22 WHERE id='p026';
UPDATE products SET stock=900 WHERE id='p027';
UPDATE products SET stock=1100 WHERE id='p028';
UPDATE products SET stock=3 WHERE id='p029';
UPDATE products SET stock=29 WHERE id='p030';
UPDATE products SET stock=11 WHERE id='p031';
UPDATE products SET stock=2 WHERE id='p032';
UPDATE products SET stock=9 WHERE id='p033';
UPDATE products SET stock=5 WHERE id='p034';
UPDATE products SET stock=4 WHERE id='p035';
UPDATE products SET stock=1 WHERE id='p036';
UPDATE products SET stock=44 WHERE id='p037';
UPDATE products SET stock=15 WHERE id='p038';
UPDATE products SET stock=59 WHERE id='p039';
UPDATE products SET stock=37 WHERE id='p040';
UPDATE products SET stock=24 WHERE id='p041';
UPDATE products SET stock=18 WHERE id='p042';
UPDATE products SET stock=55 WHERE id='p043';
UPDATE products SET stock=18 WHERE id='p044';
UPDATE products SET stock=0 WHERE id='p045';
UPDATE products SET stock=13 WHERE id='p046';
UPDATE products SET stock=12 WHERE id='p047';
UPDATE products SET stock=26 WHERE id='p048';
UPDATE products SET stock=26 WHERE id='p049';
UPDATE products SET stock=19 WHERE id='p050';
UPDATE products SET stock=5 WHERE id='p051';
UPDATE products SET stock=6 WHERE id='p052';
UPDATE products SET stock=4 WHERE id='p053';
UPDATE products SET stock=49 WHERE id='p054';
UPDATE products SET stock=31 WHERE id='p055';
UPDATE products SET stock=67 WHERE id='p056';
UPDATE products SET stock=43 WHERE id='p057';
UPDATE products SET stock=23 WHERE id='p058';
UPDATE products SET stock=29 WHERE id='p059';
UPDATE products SET stock=26 WHERE id='p060';
UPDATE products SET stock=13 WHERE id='p061';
UPDATE products SET stock=19 WHERE id='p062';
UPDATE products SET stock=14 WHERE id='p063';
UPDATE products SET stock=26 WHERE id='p064';
UPDATE products SET stock=7 WHERE id='p065';
UPDATE products SET stock=12 WHERE id='p066';
UPDATE products SET stock=4 WHERE id='p067';
UPDATE products SET stock=9 WHERE id='p068';
UPDATE products SET stock=14 WHERE id='p069';
UPDATE products SET stock=31 WHERE id='p070';
UPDATE products SET stock=45 WHERE id='p071';
UPDATE products SET stock=21 WHERE id='p072';
UPDATE products SET stock=219 WHERE id='p073';
UPDATE products SET stock=9 WHERE id='p074';
UPDATE products SET stock=5 WHERE id='p075';
UPDATE products SET stock=119 WHERE id='p076';
UPDATE products SET stock=85 WHERE id='p077';
UPDATE products SET stock=7 WHERE id='p078';
UPDATE products SET stock=200 WHERE id='p079';
UPDATE products SET stock=14 WHERE id='p080';
UPDATE products SET stock=30 WHERE id='p081';
UPDATE products SET stock=40 WHERE id='p082';
UPDATE products SET stock=5 WHERE id='p083';
UPDATE products SET stock=9 WHERE id='p084';
UPDATE products SET stock=6 WHERE id='p085';
UPDATE products SET stock=180 WHERE id='p086';
UPDATE products SET stock=26 WHERE id='p087';
UPDATE products SET stock=12 WHERE id='p088';
UPDATE products SET stock=12 WHERE id='p089';
UPDATE products SET stock=59 WHERE id='p090';
UPDATE products SET stock=73 WHERE id='p091';
UPDATE products SET stock=7 WHERE id='p092';
UPDATE products SET stock=35 WHERE id='p093';
UPDATE products SET stock=138 WHERE id='p094';
UPDATE products SET stock=169 WHERE id='p095';
UPDATE products SET stock=13 WHERE id='p096';
UPDATE products SET stock=40 WHERE id='p097';
UPDATE products SET stock=24 WHERE id='p098';
UPDATE products SET stock=19 WHERE id='p099';
UPDATE products SET stock=89 WHERE id='p100';
UPDATE products SET stock=46 WHERE id='p101';
UPDATE products SET stock=54 WHERE id='p102';
UPDATE products SET stock=62 WHERE id='p103';
UPDATE products SET stock=58 WHERE id='p104';
UPDATE products SET stock=85 WHERE id='p105';
UPDATE products SET stock=37 WHERE id='p106';
UPDATE products SET stock=14 WHERE id='p107';
UPDATE products SET stock=27 WHERE id='p108';
UPDATE products SET stock=26 WHERE id='p109';
INSERT OR IGNORE INTO expenses (id,category,description,amount,method,reference,spent_at,user_id,created_at) VALUES
 ('demo-e0','Rent','Shop rent (sample)',15000,'bank','',(CAST(strftime('%s','now') AS INTEGER)*1000-2419200000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2419200000)),
 ('demo-e1','Salaries & casuals','Loaders (sample)',3000,'cash','',(CAST(strftime('%s','now') AS INTEGER)*1000-2246400000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-2246400000)),
 ('demo-e2','Transport & delivery','Pickup hire to site (sample)',2500,'mpesa','',(CAST(strftime('%s','now') AS INTEGER)*1000-1728000000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1728000000)),
 ('demo-e3','Electricity & water','KPLC tokens (sample)',1800,'mpesa','',(CAST(strftime('%s','now') AS INTEGER)*1000-1296000000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-1296000000)),
 ('demo-e4','Licences & county fees','Single business permit (sample)',4000,'bank','',(CAST(strftime('%s','now') AS INTEGER)*1000-777600000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-777600000)),
 ('demo-e5','Transport & delivery','Pickup hire to site (sample)',2500,'cash','',(CAST(strftime('%s','now') AS INTEGER)*1000-518400000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-518400000)),
 ('demo-e6','Airtime & internet','Shop line (sample)',1000,'mpesa','',(CAST(strftime('%s','now') AS INTEGER)*1000-172800000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-172800000)),
 ('demo-e7','Salaries & casuals','Loaders (sample)',3000,'cash','',(CAST(strftime('%s','now') AS INTEGER)*1000-86400000),NULL,(CAST(strftime('%s','now') AS INTEGER)*1000-86400000));
