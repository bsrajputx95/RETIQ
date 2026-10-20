# RetailIQ Data Dictionary

## 1. Tables Overview

| Table Name | Schema Type | Description | Primary Key | Total Records (Est.) |
| :--- | :--- | :--- | :--- | :--- |
| `dim_customers` | Dimension | Customer profiles, demographic segmentation, and geography | `customer_id` | 2,500 |
| `dim_products` | Dimension | Merchandising catalog, category hierarchy, unit cost, and price | `product_id` | 150 |
| `dim_stores` | Dimension | Physical brick-and-mortar stores and digital e-commerce channels | `store_id` | 12 |
| `dim_date` | Dimension | Standardized enterprise date dimension with fiscal calendar mapping | `date_id` | 3,653 (2022–2030) |
| `fact_sales` | Fact | Granular line-item sales transactions with financial margins | `transaction_id` | ~85,000–100,000 |
| `fact_returns` | Fact | Customer return events linked directly to original transactions | `return_id` | ~5,000–8,000 |

---

## 2. Table Schemas & Column Definitions

### 2.1 `dim_customers`
- **`customer_id`** (INTEGER, PK): Unique surrogate identifier for the customer.
- **`customer_key`** (VARCHAR(64), UNIQUE): Business key (e.g., `CUST-00042`).
- **`full_name`** (VARCHAR(128)): Cleaned title-case customer name.
- **`email`** (VARCHAR(128)): Lowercase standardized contact email.
- **`customer_segment`** (VARCHAR(32)): Customer tier (`Consumer`, `Corporate`, `Home Office`).
- **`city`** (VARCHAR(64)): Residential city.
- **`state`** (VARCHAR(64)): Two-letter US state postal abbreviation.
- **`postal_code`** (VARCHAR(16)): US ZIP code.
- **`country`** (VARCHAR(64)): Country (default `United States`).
- **`first_purchase_date`** (DATE): Date of initial transaction.
- **`is_active`** (BOOLEAN): Status flag indicating active account standing.

### 2.2 `dim_products`
- **`product_id`** (INTEGER, PK): Unique surrogate identifier for the SKU.
- **`product_sku`** (VARCHAR(32), UNIQUE): Alphanumeric SKU (e.g., `SKU-TEC-0012`).
- **`product_name`** (VARCHAR(256)): Descriptive product trade name.
- **`category`** (VARCHAR(64)): High-level department (`Technology`, `Furniture`, `Office Supplies`, `Apparel`).
- **`sub_category`** (VARCHAR(64)): Granular category (e.g., `Laptops`, `Chairs`, `Binders`, `Footwear`).
- **`unit_cost`** (NUMERIC(12,2)): Supplier wholesale acquisition cost.
- **`standard_unit_price`** (NUMERIC(12,2)): Baseline retail selling price.
- **`supplier_name`** (VARCHAR(128)): Commercial vendor or manufacturer.
- **`is_discontinued`** (BOOLEAN): Catalog lifecycle state.

### 2.3 `dim_stores`
- **`store_id`** (INTEGER, PK): Unique surrogate store identifier.
- **`store_name`** (VARCHAR(128)): Brand location name (e.g., `RetailIQ Flagship Store - East #1`).
- **`store_type`** (VARCHAR(32)): Channel format (`Flagship Store`, `Mall Outlet`, `Express Store`, `E-Commerce Web`, `Mobile App`).
- **`region`** (VARCHAR(32)): Macro sales territory (`East`, `West`, `Central`, `South`).
- **`square_footage`** (NUMERIC(10,2)): Physical footprint (0.00 for digital storefronts).
- **`opening_date`** (DATE): Commercial launch date.

### 2.4 `fact_sales`
- **`transaction_id`** (BIGINT, PK): Unique line-item sequence ID.
- **`order_id`** (VARCHAR(32)): Composite header basket identifier (e.g., `ORD-012345`).
- **`line_item_id`** (INTEGER): Position index within order basket.
- **`customer_id`** (INTEGER, FK): Reference to `dim_customers`.
- **`product_id`** (INTEGER, FK): Reference to `dim_products`.
- **`store_id`** (INTEGER, FK): Reference to `dim_stores`.
- **`order_date_id`** (INTEGER, FK): Reference to `dim_date.date_id` (YYYYMMDD).
- **`order_quantity`** (INTEGER): Units purchased ($\ge 1$).
- **`unit_price`** (NUMERIC(12,2)): Price charged per unit.
- **`discount_amount`** (NUMERIC(12,2)): Promo deduction amount.
- **`tax_amount`** (NUMERIC(12,2)): Calculated state/local sales tax.
- **`gross_sales_amount`** (NUMERIC(12,2)): $\text{order\_quantity} \times \text{unit\_price}$.
- **`net_sales_amount`** (NUMERIC(12,2)): $\text{gross\_sales\_amount} - \text{discount\_amount}$.
- **`cogs_amount`** (NUMERIC(12,2)): $\text{order\_quantity} \times \text{unit\_cost}$.
- **`gross_profit_amount`** (NUMERIC(12,2)): $\text{net\_sales\_amount} - \text{cogs\_amount}$.
- **`order_status`** (VARCHAR(32)): `Completed`, `Shipped`, `Pending`, `Cancelled`.
- **`payment_method`** (VARCHAR(32)): `Credit Card`, `Debit Card`, `PayPal`, `Apple Pay`, `Cash`.

### 2.5 `fact_returns`
- **`return_id`** (INTEGER, PK): Return incident identifier.
- **`transaction_id`** (BIGINT, FK): Reference to original `fact_sales.transaction_id`.
- **`return_date_id`** (INTEGER, FK): Return occurrence date in `dim_date.date_id`.
- **`return_quantity`** (INTEGER): Returned unit count.
- **`refund_amount`** (NUMERIC(12,2)): Total monetary reimbursement.
- **`return_reason`** (VARCHAR(64)): `Defective Item`, `Wrong Size / Fit`, `Item Not as Described`, `Buyer Remorse`.
