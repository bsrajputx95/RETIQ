import os
from datetime import datetime
from typing import Dict, List, Tuple
import pandas as pd
from src.utils import setup_logger, timed_step

logger = setup_logger(__name__)

class DataValidator:
    """Validates raw data integrity, types, constraints, and referential keys."""

    def __init__(self, quarantine_dir: str = "data/quarantine"):
        self.quarantine_dir = quarantine_dir
        os.makedirs(self.quarantine_dir, exist_ok=True)
        self.validation_summary = {}

    def log_quarantine(self, bad_df: pd.DataFrame, reason: str, entity_name: str) -> None:
        """Saves quarantined records to CSV with reason metadata."""
        if bad_df.empty:
            return
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bad_df = bad_df.copy()
        bad_df["quarantine_reason"] = reason
        bad_df["quarantined_at"] = timestamp
        
        file_path = os.path.join(self.quarantine_dir, f"{entity_name}_quarantine_{timestamp}.csv")
        bad_df.to_csv(file_path, index=False)
        logger.warning(f"Quarantined {len(bad_df)} rows for {entity_name} due to '{reason}' -> {file_path}")

    @timed_step("Validate Customers Dimension")
    def validate_customers(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()
        initial_count = len(clean_df)

        # 1. Null check on customer_id
        null_mask = clean_df["customer_id"].isna()
        if null_mask.any():
            self.log_quarantine(clean_df[null_mask], "Missing customer_id", "customers")
            clean_df = clean_df[~null_mask]

        # 2. Duplicate customer_id
        dup_mask = clean_df.duplicated(subset=["customer_id"], keep="first")
        if dup_mask.any():
            self.log_quarantine(clean_df[dup_mask], "Duplicate customer_id", "customers")
            clean_df = clean_df[~dup_mask]

        self.validation_summary["customers"] = {
            "initial": initial_count,
            "valid": len(clean_df),
            "rejected": initial_count - len(clean_df)
        }
        return clean_df

    @timed_step("Validate Products Dimension")
    def validate_products(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()
        initial_count = len(clean_df)

        # 1. Null check on product_id or negative prices/costs
        invalid_mask = (
            clean_df["product_id"].isna() |
            (clean_df["standard_unit_price"] < 0) |
            (clean_df["unit_cost"] < 0)
        )
        if invalid_mask.any():
            self.log_quarantine(clean_df[invalid_mask], "Negative price/cost or missing product_id", "products")
            clean_df = clean_df[~invalid_mask]

        self.validation_summary["products"] = {
            "initial": initial_count,
            "valid": len(clean_df),
            "rejected": initial_count - len(clean_df)
        }
        return clean_df

    @timed_step("Validate Stores Dimension")
    def validate_stores(self, df: pd.DataFrame) -> pd.DataFrame:
        clean_df = df.copy()
        initial_count = len(clean_df)
        valid_df = clean_df.dropna(subset=["store_id", "store_name"]).drop_duplicates(subset=["store_id"])
        
        self.validation_summary["stores"] = {
            "initial": initial_count,
            "valid": len(valid_df),
            "rejected": initial_count - len(valid_df)
        }
        return valid_df

    @timed_step("Validate Sales & Referential Integrity")
    def validate_sales(
        self, 
        df_sales: pd.DataFrame, 
        df_customers: pd.DataFrame, 
        df_products: pd.DataFrame, 
        df_stores: pd.DataFrame
    ) -> pd.DataFrame:
        clean_df = df_sales.copy()
        initial_count = len(clean_df)

        # 1. Value constraints (quantity > 0, price >= 0)
        invalid_values = (
            clean_df["transaction_id"].isna() |
            (clean_df["order_quantity"] <= 0) |
            (clean_df["unit_price"] < 0)
        )
        if invalid_values.any():
            self.log_quarantine(clean_df[invalid_values], "Invalid quantity or negative unit price", "sales")
            clean_df = clean_df[~invalid_values]

        # 2. Referential integrity: customer_id
        valid_cids = set(df_customers["customer_id"])
        orphaned_cust = ~clean_df["customer_id"].isin(valid_cids)
        if orphaned_cust.any():
            self.log_quarantine(clean_df[orphaned_cust], "Orphaned customer_id (not in dim_customers)", "sales")
            clean_df = clean_df[~orphaned_cust]

        # 3. Referential integrity: product_id
        valid_pids = set(df_products["product_id"])
        orphaned_prod = ~clean_df["product_id"].isin(valid_pids)
        if orphaned_prod.any():
            self.log_quarantine(clean_df[orphaned_prod], "Orphaned product_id (not in dim_products)", "sales")
            clean_df = clean_df[~orphaned_prod]

        # 4. Referential integrity: store_id
        valid_sids = set(df_stores["store_id"])
        orphaned_store = ~clean_df["store_id"].isin(valid_sids)
        if orphaned_store.any():
            self.log_quarantine(clean_df[orphaned_store], "Orphaned store_id (not in dim_stores)", "sales")
            clean_df = clean_df[~orphaned_store]

        self.validation_summary["sales"] = {
            "initial": initial_count,
            "valid": len(clean_df),
            "rejected": initial_count - len(clean_df)
        }
        return clean_df

    @timed_step("Validate Returns Integrity")
    def validate_returns(self, df_returns: pd.DataFrame, df_sales: pd.DataFrame) -> pd.DataFrame:
        clean_df = df_returns.copy()
        initial_count = len(clean_df)

        # Referential integrity: transaction_id must exist in fact_sales
        valid_tx_ids = set(df_sales["transaction_id"])
        orphaned_tx = ~clean_df["transaction_id"].isin(valid_tx_ids)
        if orphaned_tx.any():
            self.log_quarantine(clean_df[orphaned_tx], "Orphaned transaction_id (not in fact_sales)", "returns")
            clean_df = clean_df[~orphaned_tx]

        # Return quantity must be positive
        invalid_qty = clean_df["return_quantity"] <= 0
        if invalid_qty.any():
            self.log_quarantine(clean_df[invalid_qty], "Non-positive return quantity", "returns")
            clean_df = clean_df[~invalid_qty]

        self.validation_summary["returns"] = {
            "initial": initial_count,
            "valid": len(clean_df),
            "rejected": initial_count - len(clean_df)
        }
        return clean_df
