from typing import Dict
import pandas as pd
from sqlalchemy import text
from src.db import execute_sql_file, bulk_copy_df, db_session
from src.utils import setup_logger, timed_step

logger = setup_logger(__name__)

class DataLoader:
    """Manages DDL schema provisioning, date dimension seeding, and bulk fact/dim loading."""

    def __init__(self, config_path: str = "config/db_config.yaml"):
        self.config_path = config_path

    @timed_step("Initialize DDL Schema & Dimension Tables")
    def init_schema(self) -> None:
        """Executes table creation DDL and populates the date dimension."""
        execute_sql_file("sql/01_ddl_schema.sql", self.config_path)
        execute_sql_file("sql/02_dim_date_generator.sql", self.config_path)

    @timed_step("Bulk Load Dimensions & Facts")
    def load_all(self, datasets: Dict[str, pd.DataFrame]) -> Dict[str, int]:
        """Loads all cleansed dataframes into the PostgreSQL Star Schema."""
        results = {}

        # 1. Load Dimensions
        dim_cust_cols = [
            "customer_id", "customer_key", "full_name", "email", 
            "customer_segment", "city", "state", "postal_code", 
            "country", "first_purchase_date", "is_active"
        ]
        results["dim_customers"] = bulk_copy_df(
            datasets["customers"], "dim_customers", dim_cust_cols, self.config_path
        )

        dim_prod_cols = [
            "product_id", "product_sku", "product_name", "category", 
            "sub_category", "unit_cost", "standard_unit_price", 
            "supplier_name", "is_discontinued"
        ]
        results["dim_products"] = bulk_copy_df(
            datasets["products"], "dim_products", dim_prod_cols, self.config_path
        )

        dim_store_cols = [
            "store_id", "store_name", "store_type", "region", 
            "city", "state", "square_footage", "opening_date"
        ]
        results["dim_stores"] = bulk_copy_df(
            datasets["stores"], "dim_stores", dim_store_cols, self.config_path
        )

        # 2. Load Facts
        fact_sales_cols = [
            "transaction_id", "order_id", "line_item_id", "customer_id", 
            "product_id", "store_id", "order_date_id", "order_quantity", 
            "unit_price", "discount_amount", "tax_amount", "gross_sales_amount", 
            "net_sales_amount", "cogs_amount", "gross_profit_amount", 
            "order_status", "payment_method"
        ]
        results["fact_sales"] = bulk_copy_df(
            datasets["sales"], "fact_sales", fact_sales_cols, self.config_path
        )

        fact_returns_cols = [
            "return_id", "transaction_id", "return_date_id", 
            "return_quantity", "refund_amount", "return_reason"
        ]
        results["fact_returns"] = bulk_copy_df(
            datasets["returns"], "fact_returns", fact_returns_cols, self.config_path
        )

        return results

    def verify_database_counts(self) -> Dict[str, int]:
        """Audits row counts directly from PostgreSQL tables."""
        tables = ["dim_customers", "dim_products", "dim_stores", "dim_date", "fact_sales", "fact_returns"]
        counts = {}
        with db_session(self.config_path) as conn:
            for tbl in tables:
                res = conn.execute(text(f"SELECT COUNT(*) FROM {tbl};")).scalar()
                counts[tbl] = res
                logger.info(f"Verified PostgreSQL table '{tbl}': {res:,} rows")
        return counts
