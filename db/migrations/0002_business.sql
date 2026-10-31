-- Running the shop: sales, customers, purchasing, expenses, end-of-day cash and an activity log.
-- Staff stay role='admin' so existing admin checks keep working; staff_role narrows what each one can do.
ALTER TABLE users ADD COLUMN staff_role TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE products ADD COLUMN cost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN supplier_id TEXT;

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  kra_pin TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  credit_limit INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX customers_name ON customers(name);

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

-- The CHECKs do real work: breaking one rolls back the whole D1 batch, so a sale, return or
-- payment either applies completely or not at all, even with two tills running at once.
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('quote', 'completed', 'voided')),
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  vat INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  cost_total INTEGER NOT NULL DEFAULT 0,
  returned_total INTEGER NOT NULL DEFAULT 0,
  returned_cost INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  enquiry_id TEXT,
  void_reason TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  user_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  CHECK (paid >= 0),
  CHECK (status = 'voided' OR paid <= total - returned_total)
);
CREATE INDEX sales_completed ON sales(status, completed_at);
CREATE INDEX sales_customer ON sales(customer_id);

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'piece',
  qty INTEGER NOT NULL CHECK (qty > 0),
  price INTEGER NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  returned_qty INTEGER NOT NULL DEFAULT 0,
  CHECK (returned_qty >= 0 AND returned_qty <= qty)
);
CREATE INDEX sale_items_sale ON sale_items(sale_id);
CREATE INDEX sale_items_product ON sale_items(product_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'mpesa', 'bank', 'cheque', 'card')),
  reference TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  voided INTEGER NOT NULL DEFAULT 0,
  user_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX payments_created ON payments(created_at);
CREATE INDEX payments_sale ON payments(sale_id);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  status TEXT NOT NULL CHECK (status IN ('ordered', 'partial', 'received', 'cancelled')),
  invoice_ref TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL,
  received_value INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  user_id TEXT,
  created_at INTEGER NOT NULL,
  received_at INTEGER,
  CHECK (paid >= 0 AND paid <= total)
);
CREATE INDEX purchases_supplier ON purchases(supplier_id);

CREATE TABLE purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  qty INTEGER NOT NULL CHECK (qty > 0),
  qty_received INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL,
  CHECK (qty_received >= 0 AND qty_received <= qty)
);
CREATE INDEX purchase_items_purchase ON purchase_items(purchase_id);

CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'mpesa', 'bank', 'cheque', 'card')),
  reference TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount > 0),
  user_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX supplier_payments_created ON supplier_payments(created_at);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash', 'mpesa', 'bank', 'cheque', 'card')),
  reference TEXT NOT NULL DEFAULT '',
  spent_at INTEGER NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX expenses_spent ON expenses(spent_at);

CREATE TABLE cash_closings (
  day TEXT PRIMARY KEY,
  expected INTEGER NOT NULL,
  counted INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX audit_created ON audit_log(created_at);
