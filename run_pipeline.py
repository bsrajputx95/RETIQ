"""
RetailIQ Pipeline Runner
Ingestion -> Validation -> Transformation -> DWH Loading -> SQL Verification
"""
import sys
import time
from sqlalchemy import text
from src.extract import get_or_generate_retail_data
from src.validate import DataValidator
from src.transform import DataTransformer
from src.load import DataLoader
from src.db import execute_sql_file, db_session
from src.utils import setup_logger

logger = setup_logger("retailiq")

def run_master_pipeline():
    start_time = time.perf_counter()
    logger.info("Starting retail analytics pipeline...")

    # Step 1: Ingestion
    logger.info("Step 1: Ingesting transactional sales and dimensional data...")
    raw_datasets = get_or_generate_retail_data()

    # Step 2: Quality validation
    logger.info("Step 2: Running schema integrity and referential checks...")
    validator = DataValidator()
    valid_customers = validator.validate_customers(raw_datasets["customers"])
    valid_products = validator.validate_products(raw_datasets["products"])
    valid_stores = validator.validate_stores(raw_datasets["stores"])
    valid_sales = validator.validate_sales(raw_datasets["sales"], valid_customers, valid_products, valid_stores)
    valid_returns = validator.validate_returns(raw_datasets["returns"], valid_sales)

    # Step 3: Transformation
    logger.info("Step 3: Transforming transactional data and writing processed files...")
    transformer = DataTransformer()
    trans_customers = transformer.transform_customers(valid_customers)
    trans_products = transformer.transform_products(valid_products)
    trans_stores = transformer.transform_stores(valid_stores)
    trans_sales = transformer.transform_sales(valid_sales)
    trans_returns = transformer.transform_returns(valid_returns)

    transformed_datasets = {
        "customers": trans_customers,
        "products": trans_products,
        "stores": trans_stores,
        "sales": trans_sales,
        "returns": trans_returns
    }

    # Step 4: Schema provisioning and bulk load
    logger.info("Step 4: Provisioning PostgreSQL schema and bulk loading tables...")
    loader = DataLoader()
    loader.init_schema()
    loaded_counts = loader.load_all(transformed_datasets)
    dwh_counts = loader.verify_database_counts()

    # Step 5: Verification query
    logger.info("Step 5: Verifying warehouse metrics against fact tables...")
    with db_session() as conn:
        kpi_query = text("""
            SELECT 
                COUNT(DISTINCT f.order_id) AS total_orders,
                SUM(f.net_sales_amount) AS total_net_revenue,
                SUM(f.gross_profit_amount) AS total_gross_profit,
                ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS gross_margin_pct,
                COUNT(r.return_id) AS total_returns
            FROM fact_sales f
            LEFT JOIN fact_returns r ON f.transaction_id = r.transaction_id
            WHERE f.order_status = 'Completed';
        """)
        row = conn.execute(kpi_query).fetchone()

    elapsed = time.perf_counter() - start_time
    logger.info(f"Pipeline completed in {elapsed:.2f}s.")
    logger.info(
        f"Warehouse stats: {dwh_counts['fact_sales']:,} sales rows, "
        f"{dwh_counts['dim_customers']:,} customers, {dwh_counts['dim_products']:,} products, "
        f"{dwh_counts['dim_stores']:,} stores, {dwh_counts['fact_returns']:,} returns."
    )
    logger.info(
        f"Completed Orders: {row[0]:,} | Net Revenue: ${row[1]:,.2f} | "
        f"Gross Profit: ${row[2]:,.2f} | Gross Margin: {row[3]}%"
    )

if __name__ == "__main__":
    run_master_pipeline()
