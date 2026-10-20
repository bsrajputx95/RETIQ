-- ============================================================================
-- RetailIQ: Data Warehouse DDL Schema (Star Schema)
-- Database: PostgreSQL 14+
-- ============================================================================

-- Clean up existing tables if rebuilding
DROP TABLE IF EXISTS fact_returns CASCADE;
DROP TABLE IF EXISTS fact_sales CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;
DROP TABLE IF EXISTS dim_stores CASCADE;
DROP TABLE IF EXISTS dim_products CASCADE;
DROP TABLE IF EXISTS dim_customers CASCADE;

-- ----------------------------------------------------------------------------
-- 1. DIMENSION: Customers
-- ----------------------------------------------------------------------------
CREATE TABLE dim_customers (
    customer_id         INTEGER PRIMARY KEY,
    customer_key        VARCHAR(64) NOT NULL UNIQUE,
    full_name           VARCHAR(128) NOT NULL,
    email               VARCHAR(128),
    customer_segment    VARCHAR(32) NOT NULL DEFAULT 'Regular', -- Consumer, Corporate, Home Office
    city                VARCHAR(64),
    state               VARCHAR(64),
    postal_code         VARCHAR(16),
    country             VARCHAR(64) DEFAULT 'United States',
    first_purchase_date DATE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_customers_segment ON dim_customers(customer_segment);
CREATE INDEX idx_dim_customers_state ON dim_customers(state);

-- ----------------------------------------------------------------------------
-- 2. DIMENSION: Products
-- ----------------------------------------------------------------------------
CREATE TABLE dim_products (
    product_id          INTEGER PRIMARY KEY,
    product_sku         VARCHAR(32) NOT NULL UNIQUE,
    product_name        VARCHAR(256) NOT NULL,
    category            VARCHAR(64) NOT NULL,       -- Technology, Furniture, Office Supplies, Apparel
    sub_category        VARCHAR(64) NOT NULL,
    unit_cost           NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    standard_unit_price NUMERIC(12, 2) NOT NULL CHECK (standard_unit_price >= 0),
    supplier_name       VARCHAR(128),
    is_discontinued     BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_products_category ON dim_products(category);
CREATE INDEX idx_dim_products_subcategory ON dim_products(sub_category);

-- ----------------------------------------------------------------------------
-- 3. DIMENSION: Stores / Sales Channels
-- ----------------------------------------------------------------------------
CREATE TABLE dim_stores (
    store_id            INTEGER PRIMARY KEY,
    store_name          VARCHAR(128) NOT NULL,
    store_type          VARCHAR(32) NOT NULL,       -- Flagship, Mall Outlet, Express, Online Web, Mobile App
    region              VARCHAR(32) NOT NULL,       -- East, West, Central, South
    city                VARCHAR(64) NOT NULL,
    state               VARCHAR(64) NOT NULL,
    square_footage      NUMERIC(10, 2),
    opening_date        DATE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_stores_region ON dim_stores(region);

-- ----------------------------------------------------------------------------
-- 4. DIMENSION: Date
-- ----------------------------------------------------------------------------
CREATE TABLE dim_date (
    date_id             INTEGER PRIMARY KEY,        -- Format: YYYYMMDD
    full_date           DATE NOT NULL UNIQUE,
    day_of_week         INTEGER NOT NULL,           -- 1 = Monday, 7 = Sunday
    day_name            VARCHAR(16) NOT NULL,
    day_of_month        INTEGER NOT NULL,
    day_of_year         INTEGER NOT NULL,
    week_of_year        INTEGER NOT NULL,
    month_number        INTEGER NOT NULL,
    month_name          VARCHAR(16) NOT NULL,
    quarter             INTEGER NOT NULL,
    year                INTEGER NOT NULL,
    is_weekend          BOOLEAN NOT NULL,
    is_holiday          BOOLEAN DEFAULT FALSE,
    fiscal_quarter      VARCHAR(8) NOT NULL,
    fiscal_year         INTEGER NOT NULL
);

CREATE INDEX idx_dim_date_year_month ON dim_date(year, month_number);

-- ----------------------------------------------------------------------------
-- 5. FACT: Sales Transactions
-- ----------------------------------------------------------------------------
CREATE TABLE fact_sales (
    transaction_id      BIGINT PRIMARY KEY,
    order_id            VARCHAR(32) NOT NULL,
    line_item_id        INTEGER NOT NULL DEFAULT 1,
    customer_id         INTEGER NOT NULL REFERENCES dim_customers(customer_id),
    product_id          INTEGER NOT NULL REFERENCES dim_products(product_id),
    store_id            INTEGER NOT NULL REFERENCES dim_stores(store_id),
    order_date_id       INTEGER NOT NULL REFERENCES dim_date(date_id),
    order_quantity      INTEGER NOT NULL CHECK (order_quantity > 0),
    unit_price          NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_sales_amount  NUMERIC(12, 2) NOT NULL,
    net_sales_amount    NUMERIC(12, 2) NOT NULL,
    cogs_amount         NUMERIC(12, 2) NOT NULL,
    gross_profit_amount NUMERIC(12, 2) NOT NULL,
    order_status        VARCHAR(32) NOT NULL DEFAULT 'Completed', -- Completed, Pending, Shipped, Cancelled
    payment_method      VARCHAR(32) NOT NULL DEFAULT 'Credit Card', -- Credit Card, Debit Card, PayPal, Apple Pay, Cash
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fact_sales_order_date ON fact_sales(order_date_id);
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_id);
CREATE INDEX idx_fact_sales_product ON fact_sales(product_id);
CREATE INDEX idx_fact_sales_store ON fact_sales(store_id);
CREATE INDEX idx_fact_sales_order_id ON fact_sales(order_id);
CREATE INDEX idx_fact_sales_status ON fact_sales(order_status);

-- ----------------------------------------------------------------------------
-- 6. FACT: Returns
-- ----------------------------------------------------------------------------
CREATE TABLE fact_returns (
    return_id           INTEGER PRIMARY KEY,
    transaction_id      BIGINT NOT NULL REFERENCES fact_sales(transaction_id),
    return_date_id      INTEGER NOT NULL REFERENCES dim_date(date_id),
    return_quantity     INTEGER NOT NULL CHECK (return_quantity > 0),
    refund_amount       NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
    return_reason       VARCHAR(64) NOT NULL DEFAULT 'Defective', -- Defective, Wrong Size, Not as Described, Buyer Remorse
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fact_returns_transaction ON fact_returns(transaction_id);
CREATE INDEX idx_fact_returns_date ON fact_returns(return_date_id);
