import os
from typing import Dict
import pandas as pd
import numpy as np
from src.utils import setup_logger, timed_step

logger = setup_logger(__name__)

class DataTransformer:
    """Performs data cleaning, standardization, type casting, and feature calculation."""

    def __init__(self, processed_dir: str = "data/processed"):
        self.processed_dir = processed_dir
        os.makedirs(self.processed_dir, exist_ok=True)

    def _save_dataset(self, df: pd.DataFrame, base_name: str) -> None:
        csv_path = os.path.join(self.processed_dir, f"{base_name}.csv")
        df.to_csv(csv_path, index=False)
        try:
            parquet_path = os.path.join(self.processed_dir, f"{base_name}.parquet")
            df.to_parquet(parquet_path, index=False)
        except Exception:
            pass
        logger.info(f"Saved transformed {base_name} ({len(df):,} rows) -> CSV/Parquet")

    @timed_step("Transform Customers Dimension")
    def transform_customers(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()
        
        # Clean string attributes
        clean_df["full_name"] = clean_df["full_name"].astype(str).str.strip().str.title()
        clean_df["email"] = clean_df["email"].astype(str).str.strip().str.lower()
        clean_df["city"] = clean_df["city"].astype(str).str.strip().str.title()
        clean_df["state"] = clean_df["state"].astype(str).str.strip().str.upper()
        clean_df["postal_code"] = clean_df["postal_code"].astype(str).str.strip()
        clean_df["country"] = clean_df["country"].fillna("United States").astype(str).str.strip()
        clean_df["customer_segment"] = clean_df["customer_segment"].astype(str).str.strip()
        clean_df["is_active"] = clean_df["is_active"].astype(bool)

        # Ensure correct datatypes
        clean_df["customer_id"] = clean_df["customer_id"].astype(int)
        clean_df["first_purchase_date"] = pd.to_datetime(clean_df["first_purchase_date"]).dt.strftime("%Y-%m-%d")

        self._save_dataset(clean_df, "dim_customers")
        return clean_df

    @timed_step("Transform Products Dimension")
    def transform_products(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()

        clean_df["product_id"] = clean_df["product_id"].astype(int)
        clean_df["product_sku"] = clean_df["product_sku"].astype(str).str.strip().str.upper()
        clean_df["product_name"] = clean_df["product_name"].astype(str).str.strip()
        clean_df["category"] = clean_df["category"].astype(str).str.strip()
        clean_df["sub_category"] = clean_df["sub_category"].astype(str).str.strip()
        clean_df["supplier_name"] = clean_df["supplier_name"].astype(str).str.strip()
        clean_df["unit_cost"] = clean_df["unit_cost"].astype(float).round(2)
        clean_df["standard_unit_price"] = clean_df["standard_unit_price"].astype(float).round(2)
        clean_df["is_discontinued"] = clean_df["is_discontinued"].astype(bool)

        self._save_dataset(clean_df, "dim_products")
        return clean_df

    @timed_step("Transform Stores Dimension")
    def transform_stores(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()

        clean_df["store_id"] = clean_df["store_id"].astype(int)
        clean_df["store_name"] = clean_df["store_name"].astype(str).str.strip()
        clean_df["store_type"] = clean_df["store_type"].astype(str).str.strip()
        clean_df["region"] = clean_df["region"].astype(str).str.strip().str.title()
        clean_df["city"] = clean_df["city"].astype(str).str.strip().str.title()
        clean_df["state"] = clean_df["state"].astype(str).str.strip().str.upper()
        clean_df["square_footage"] = clean_df["square_footage"].astype(float).round(2)
        clean_df["opening_date"] = pd.to_datetime(clean_df["opening_date"]).dt.strftime("%Y-%m-%d")

        self._save_dataset(clean_df, "dim_stores")
        return clean_df

    @timed_step("Transform Sales Fact")
    def transform_sales(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()

        clean_df["transaction_id"] = clean_df["transaction_id"].astype(int)
        clean_df["order_id"] = clean_df["order_id"].astype(str).str.strip().str.upper()
        clean_df["line_item_id"] = clean_df["line_item_id"].astype(int)
        clean_df["customer_id"] = clean_df["customer_id"].astype(int)
        clean_df["product_id"] = clean_df["product_id"].astype(int)
        clean_df["store_id"] = clean_df["store_id"].astype(int)
        clean_df["order_date_id"] = clean_df["order_date_id"].astype(int)
        clean_df["order_quantity"] = clean_df["order_quantity"].astype(int)
        clean_df["unit_price"] = clean_df["unit_price"].astype(float).round(2)
        clean_df["discount_amount"] = clean_df["discount_amount"].astype(float).round(2)
        clean_df["tax_amount"] = clean_df["tax_amount"].astype(float).round(2)

        # Strict financial calculations
        clean_df["gross_sales_amount"] = (clean_df["order_quantity"] * clean_df["unit_price"]).round(2)
        clean_df["net_sales_amount"] = (clean_df["gross_sales_amount"] - clean_df["discount_amount"]).round(2)
        clean_df["cogs_amount"] = clean_df["cogs_amount"].astype(float).round(2)
        clean_df["gross_profit_amount"] = (clean_df["net_sales_amount"] - clean_df["cogs_amount"]).round(2)

        clean_df["order_status"] = clean_df["order_status"].astype(str).str.strip()
        clean_df["payment_method"] = clean_df["payment_method"].astype(str).str.strip()

        self._save_dataset(clean_df, "fact_sales")
        return clean_df

    @timed_step("Transform Returns Fact")
    def transform_returns(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()

        clean_df["return_id"] = clean_df["return_id"].astype(int)
        clean_df["transaction_id"] = clean_df["transaction_id"].astype(int)
        clean_df["return_date_id"] = clean_df["return_date_id"].astype(int)
        clean_df["return_quantity"] = clean_df["return_quantity"].astype(int)
        clean_df["refund_amount"] = clean_df["refund_amount"].astype(float).round(2)
        clean_df["return_reason"] = clean_df["return_reason"].astype(str).str.strip()

        self._save_dataset(clean_df, "fact_returns")
        return clean_df
