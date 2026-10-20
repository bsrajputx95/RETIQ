import pytest
import pandas as pd
from src.transform import DataTransformer

@pytest.fixture
def sample_sales_df():
    return pd.DataFrame([{
        "transaction_id": 1,
        "order_id": "ord-0001 ",
        "line_item_id": 1,
        "customer_id": 10,
        "product_id": 20,
        "store_id": 1,
        "order_date_id": 20240101,
        "order_quantity": 2,
        "unit_price": 50.00,
        "discount_amount": 10.00,
        "tax_amount": 6.30,
        "gross_sales_amount": 100.00,
        "net_sales_amount": 90.00,
        "cogs_amount": 60.00,
        "gross_profit_amount": 30.00,
        "order_status": " Completed ",
        "payment_method": "Credit Card"
    }])

def test_sales_transform_calculations(sample_sales_df, tmp_path):
    transformer = DataTransformer(processed_dir=str(tmp_path))
    transformed = transformer.transform_sales(sample_sales_df)
    
    row = transformed.iloc[0]
    assert row["order_id"] == "ORD-0001"
    assert row["order_status"] == "Completed"
    assert row["gross_sales_amount"] == 100.00
    assert row["net_sales_amount"] == 90.00
    assert row["gross_profit_amount"] == 30.00
