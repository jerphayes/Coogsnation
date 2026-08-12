CREATE TABLE IF NOT EXISTS commerce_click_events (
  id serial PRIMARY KEY,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  site_key varchar(80) NOT NULL,
  school_key varchar(80) NOT NULL,
  provider varchar(40) NOT NULL,
  product_id varchar(260) NOT NULL,
  merchant varchar(160) NOT NULL,
  destination_host varchar(255),
  purchase_mode varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_clicks_site_created
  ON commerce_click_events(site_key, created_at);
CREATE INDEX IF NOT EXISTS idx_commerce_clicks_product_created
  ON commerce_click_events(product_id, created_at);

CREATE TABLE IF NOT EXISTS commerce_inquiries (
  id serial PRIMARY KEY,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  site_key varchar(80) NOT NULL,
  school_key varchar(80) NOT NULL,
  product_id varchar(260),
  merchant varchar(160),
  name varchar(160) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(40),
  budget_range varchar(80),
  message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_inquiries_site_status
  ON commerce_inquiries(site_key, status);
CREATE INDEX IF NOT EXISTS idx_commerce_inquiries_created
  ON commerce_inquiries(created_at);
