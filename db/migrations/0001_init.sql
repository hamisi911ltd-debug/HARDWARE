CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'seller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  brand TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'piece',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_at INTEGER NOT NULL DEFAULT 5,
  images TEXT NOT NULL DEFAULT '[]',
  visible INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX products_category ON products(category_id);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX movements_product ON stock_movements(product_id, created_at);
CREATE INDEX movements_created ON stock_movements(created_at);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  condition TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'used')),
  price INTEGER NOT NULL CHECK (price >= 0),
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  whatsapp TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold')),
  reject_reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX listings_status ON listings(status, created_at);
CREATE INDEX listings_seller ON listings(seller_id);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('general', 'product', 'listing', 'quote')),
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  seller_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX enquiries_status ON enquiries(status, created_at);
CREATE INDEX enquiries_seller ON enquiries(seller_id, created_at);
CREATE INDEX enquiries_product ON enquiries(product_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
