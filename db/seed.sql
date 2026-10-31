-- Starting content for Hardware, a single-vendor shop. Business details come from the company flyer.
-- Prices and stock levels are samples: the website shows "Ask for price" until show_prices is turned on in /admin/settings.
INSERT OR IGNORE INTO settings (key, value) VALUES
 ('business_name','Hardware'),
 ('short_name','Hardware'),
 ('tagline','Your general hardware for every construction job'),
 ('hero_title','Every tool. Every build.'),
 ('hero_subtitle','Cement, mabati, steel, timber, tools, paint, plumbing and electrical under one roof, plus installation, construction, repair and maintenance.'),
 ('about','We are a general hardware stocking construction tools and building materials for contractors, fundis and homeowners. With more than a decade of experience in plumbing systems, we also handle installation, construction, repair and maintenance.'),
 ('whatsapp','254705773055'),
 ('phone','+254 705 773055 / +254 746 622878'),
 ('email','waterlinetechnicians@gmail.com'),
 ('address','Mafundi Store'),
 ('hours',''),
 ('map_url',''),
 ('currency','KES'),('country_code','254'),
 ('show_prices','0'),('vat_rate','0'),('kra_pin',''),('mpesa_till',''),('mpesa_paybill',''),('receipt_footer','Thank you for your business. Goods once sold are returned only with this receipt.'),
 ('facebook',''),('instagram',''),('tiktok',''),('x',''),('youtube','');

INSERT OR IGNORE INTO categories (id,name,blurb,image,sort) VALUES
 ('building','Cement & Building','Cement, ballast, sand, blocks and tiles.','/images/cement-bags.webp',1),
 ('steel','Steel & Wire','Y-bars, BRC mesh, binding wire and nails.','/images/rebar.webp',2),
 ('roofing-timber','Roofing & Timber','Mabati, ridge caps, cypress and boards.','/images/roofing.webp',3),
 ('power-tools','Power Tools','Drills, grinders, saws and welders.','/images/grinder.webp',4),
 ('hand-tools','Hand Tools','Hammers, trowels, spanners and the whole tool bag.','/images/tool-wall.webp',5),
 ('farm','Shamba & Site Tools','Jembe, panga, sururu, spades and wheelbarrows.','/images/site-dig.webp',6),
 ('paint','Paint & Finishes','Crown, Basco and Sadolin paint, brushes and rollers.','/images/paint-colours.webp',7),
 ('plumbing','Plumbing & Water','Tanks, pumps, PVC, PPR, taps and sanitary ware.','/images/pvc-stack.webp',8),
 ('electrical','Electrical','Cable, sockets, breakers and bulbs.','/images/electrician.webp',9),
 ('fittings','Locks & Fittings','Padlocks, mortice locks, hinges and screws.','/images/padlocks.webp',10);

INSERT OR IGNORE INTO products (id,slug,sku,name,category_id,brand,description,price,cost,unit,stock,low_stock_at,images,visible,featured,created_at,updated_at) VALUES
 ('p001','bamburi-nguvu-cement','BM-3001','Bamburi Nguvu Cement 32.5, 50kg','building','Bamburi','General purpose cement for foundations, block work and concrete. Ask about bulk orders.',850,770,'bag',240,50,'["/images/cement-bags.webp","/images/site-materials.webp"]',1,1,1760000000000,1760000000000),
 ('p002','ballast','BM-3004','Ballast, per tonne','building','','Crushed stone for concrete. Tell us your site and quantity.',2200,1800,'tonne',40,10,'["/images/gravel.webp"]',1,1,1760000000000,1760000000000),
 ('p003','y12-bar','ST-4101','Y12 Deformed Bar, 12m','steel','','High tensile bar for columns, beams and slabs.',1250,1090,'length',150,40,'["/images/rebar.webp"]',1,1,1760000000000,1760000000000),
 ('p004','mabati-gauge-30','RT-4001','Mabati Corrugated, Gauge 30','roofing-timber','Dumuzas','Corrugated iron sheets, cut to your length. Tell us your roof size.',470,410,'metre',600,150,'["/images/roofing.webp"]',1,1,1760000000000,1760000000000),
 ('p005','cordless-drill','PT-1001','Cordless Drill','power-tools','Total','Battery drill driver for timber, light steel and everyday fixing work.',8500,6900,'piece',12,4,'["/images/drill.webp"]',1,1,1760000000000,1760000000000),
 ('p006','claw-hammer','HT-2001','Claw Hammer (Nyundo)','hand-tools','Stanley','Everyday hammer for carpentry and site work.',850,620,'piece',46,10,'["/images/hammer.webp"]',1,1,1760000000000,1760000000000),
 ('p007','spirit-level','HT-2006','Spirit Level, 24 inch','hand-tools','Stanley','Keeps walls, frames and fittings straight and true.',1300,980,'piece',22,5,'["/images/spirit-level.webp"]',1,1,1760000000000,1760000000000),
 ('p008','panga','FM-9003','Panga','farm','Crocodile','Broad cutting blade for clearing and everyday work.',450,320,'piece',70,15,'["/images/machete.webp"]',1,1,1760000000000,1760000000000),
 ('p009','sururu','FM-9005','Sururu (Pickaxe) with Handle','farm','','Breaks hard ground, rock and old concrete.',1400,1050,'piece',25,8,'["/images/pickaxe.webp"]',1,1,1760000000000,1760000000000),
 ('p010','wheelbarrow','BM-3012','Wheelbarrow (Toroli)','farm','','Heavy-duty wheelbarrow for soil, sand and concrete.',5200,4300,'piece',14,4,'["/images/wheelbarrow.webp"]',1,1,1760000000000,1760000000000),
 ('p011','crown-silk-vinyl','PA-5001','Crown Silk Vinyl, 4L','paint','Crown Paints','Smooth washable finish for interior walls. Ask about tinting.',3400,2850,'tin',16,5,'["/images/paint-bucket.webp"]',1,1,1760000000000,1760000000000),
 ('p012','water-storage-tank','PL-6001','Kenpoly Water Tank, 1000L','plumbing','Kenpoly','Durable tank for homes, farms and commercial buildings. Ask about other sizes.',16500,14000,'piece',12,3,'["/images/tank-black.webp","/images/tank-green.webp"]',1,1,1760000000000,1760000000000),
 ('p013','pvc-pipes','PL-6003','PVC Pipe, 4 inch, 6m','plumbing','Kenpipe','Pipes for drainage and soil lines. Other sizes available.',1650,1350,'length',120,30,'["/images/pvc-stack.webp"]',1,1,1760000000000,1760000000000),
 ('p014','solex-padlock','LK-8101','Solex Padlock, 50mm','fittings','Solex','Trusted padlock for gates, doors and stores.',850,640,'piece',42,10,'["/images/padlocks.webp"]',1,1,1760000000000,1760000000000),
 ('p015','cable-2-5mm','EL-7001','Twin & Earth Cable, 2.5mm, 100m','electrical','Kenwest','House wiring cable for socket circuits.',14500,12300,'coil',12,4,'["/images/cable.webp"]',1,1,1760000000000,1760000000000);

INSERT OR IGNORE INTO stock_movements (id,product_id,delta,balance,reason,note,user_id,created_at)
 SELECT 'seed-' || id, id, stock, stock, 'opening', 'Opening stock', NULL, 1760000000000 FROM products;
