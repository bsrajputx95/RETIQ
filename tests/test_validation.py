import pytest
import pandas as pd
from src.validate import DataValidator

def test_validation_quarantines_orphaned_customer(tmp_path):
    validator = DataValidator(quarantine_dir=str(tmp_path))
    
    customers_df = pd.DataFrame([{"customer_id": 1, "customer_key": "C1"}])
    products_df = pd.DataFrame([{"product_id": 10, "standard_unit_price": 20.0, "unit_cost": 10.0}])
    stores_df = pd.DataFrame([{"store_id": 100, "store_name": "Store 1"}])
    
    sales_df = pd.DataFrame([
        {
            "transaction_id": 1,
            "order_id": "ORD-1",
            "line_item_id": 1,
            "customer_id": 9999, # Non-existent customer
            "product_id": 10,
            "store_id": 100,
            "order_date_id": 20240101,
            "order_quantity": 1,
            "unit_price": 20.0
        }
    ])
    
    clean_sales = validator.validate_sales(sales_df, customers_df, products_df, stores_df)
    assert len(clean_sales) == 0
    assert validator.validation_summary["sales"]["rejected"] == 1
