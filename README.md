# RetailIQ — Retail Sales & Business Intelligence Analytics

Retail sales analytics workflow and data warehouse modeling transactional sales data using Python, Pandas, PostgreSQL, Power BI, and Excel.

Live Web Dashboard: [https://retiq-chi.vercel.app](https://retiq-chi.vercel.app)

---

## Overview

The project implements a complete retail analytics stack:
1. **ETL Pipeline**: Cleans, validates, and transforms transactional order data, isolating bad records into quarantine logs and bulk-loading into PostgreSQL using native `COPY` operations.
2. **PostgreSQL Data Warehouse**: Star schema relational model (`fact_sales`, `fact_returns`, `dim_customers`, `dim_products`, `dim_stores`, `dim_date`).
3. **Analytical SQL Marts**:
   - Time-series revenue trends (MoM, YoY, rolling 3-month average, and YTD totals using window functions).
   - ABC inventory classification applying Pareto (80/20) analysis on cumulative product revenue.
   - RFM customer segmentation using `NTILE(5)` scoring for lifecycle cohort analysis.
   - Cohort retention tracking customer order persistence across 12-month periods.
   - Market basket analysis calculating item co-occurrence support, confidence, and cross-sell lift.
4. **BI & Reporting Layer**:
   - Power BI DAX measure scripts for margin calculations and time-series variance.
   - Multi-tab Excel financial workbook with dynamic What-If price elasticity sensitivity modeling.
   - Web analytics dashboard built with React and Tailwind CSS for cloud deployment on Vercel.

---

## Warehouse Schema

```text
[dim_customers] ────┐
                    ├──< [fact_sales] >─── [fact_returns]
[dim_products]  ────┤         │
                    │         v
[dim_stores]    ────┤    [dim_date]
```

- **`fact_sales`**: Granular line-item transactions with quantity, unit price, discounts, net sales, COGS, and gross profit.
- **`fact_returns`**: Refund transactions tied to original sales records with categorized return reasons.
- **`dim_customers`**: Customer demographics, assigned segment (`Consumer`, `Corporate`, `Home Office`), and location.
- **`dim_products`**: Product catalog across Technology, Furniture, Office Supplies, and Apparel with unit costs and standard prices.
- **`dim_stores`**: 12 retail channels (Flagship, Outlet, Express, and E-Commerce web/app) across 4 US regions.
- **`dim_date`**: Calendar table spanning 2022 to 2030 with fiscal quarters and holiday flags.

---

## Project Structure

```text
.
├── config/
│   ├── db_config.yaml              # PostgreSQL connection parameters
│   └── pipeline_config.yaml        # Pipeline thresholds & parameters
├── data/
│   ├── raw/                        # Ingested raw CSV files
│   ├── processed/                  # Transformed Parquet & CSV files
│   └── quarantine/                 # Quarantined invalid records with error logs
├── docs/
│   ├── data_dictionary.md          # Table and column schema documentation
│   └── dax_measures_library.md     # Reference library for Power BI DAX formulas
├── excel/
│   └── RetailIQ_Financial_Model.xlsx # Excel model with KPI summary and What-If scenarios
├── powerbi/
│   ├── templates/
│   │   └── retailiq_theme.json     # Power BI color palette theme
│   └── dax_scripts/                # DAX formulas for sales, customers, and time intelligence
├── sql/
│   ├── 01_ddl_schema.sql           # DDL schema, tables, foreign keys, and indexes
│   ├── 02_dim_date_generator.sql   # Automated calendar dimension generator
│   ├── 03_revenue_growth_trends.sql# MoM, YoY, and running revenue queries
│   ├── 04_product_abc_pareto.sql   # 80/20 ABC inventory classification
│   ├── 05_rfm_customer_segmentation.sql # RFM NTILE scoring and persona mapping
│   ├── 06_cohort_retention_matrix.sql # Monthly cohort retention heatmap
│   └── 07_market_basket_analysis.sql # Market basket association rules & lift
├── src/
│   ├── db.py                       # PostgreSQL connection engine and COPY loader
│   ├── extract.py                  # Data ingestion & synthetic generator
│   ├── transform.py                # Data cleaning and feature engineering
│   ├── validate.py                 # Schema and referential integrity assertions
│   ├── load.py                     # DDL execution and bulk loading
│   └── export_excel_model.py       # Excel financial model builder
├── tests/
│   ├── test_sql_integrity.py       # Referential integrity tests
│   ├── test_transform.py           # Unit tests for data transformations
│   └── test_validation.py          # Data quarantine validation tests
├── web/                            # React analytics dashboard (Vercel)
│   ├── App.jsx                     # Dashboard views, charts, and What-If simulator
│   ├── data.js                     # Pre-aggregated data cache from warehouse
│   ├── index.css                   # Tailwind styles
│   └── main.jsx
├── run_pipeline.py                 # Pipeline entrypoint
├── package.json                    # Web frontend dependencies & scripts
├── vercel.json                     # Vercel deployment configuration
└── requirements.txt                # Python dependencies
```

---

## Setup & Execution

### 1. Python Environment Setup
```bash
# Clone the repository
git clone https://github.com/bsrajputx95/RETIQ.git
cd RETIQ

# Install Python requirements
pip install -r requirements.txt
```

### 2. Configure Database Connection
Update `config/db_config.yaml` with your PostgreSQL instance credentials:
```yaml
postgres:
  host: "127.0.0.1"
  port: 5432
  user: "postgres"
  password: "your_password"
  database: "retailiq_db"
```

### 3. Run Pipeline
Execute the end-to-end data pipeline:
```bash
python run_pipeline.py
```

### 4. Run Tests
```bash
python -m pytest
```

### 5. Run Web Dashboard Locally
```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

---

## Core Findings & Business Insights

- **Pareto Concentration**: 18.9% of catalog SKUs generate 80.0% of total revenue ($53.7M). Class C products (58.1% of catalog) account for only 5.0% of revenue ($3.3M), indicating opportunities to streamline catalog carrying costs.
- **Customer Churn Dynamics**: Customer retention drops significantly after Month 1 (from 100% to ~46%), stabilizing at ~45% through Month 12. Retention workflows should focus on the first 30-45 days post-acquisition.
- **Cross-Sell Affinities**: Desks and Bookcases exhibited statistically significant association with office accessories (Paper and Binders) with lift metrics exceeding $3.0\times$, supporting targeted checkout bundling.
