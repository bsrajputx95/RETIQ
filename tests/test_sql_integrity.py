import pytest
from sqlalchemy import text
from src.db import db_session

def test_database_referential_integrity():
    """Validates that no orphaned records exist in PostgreSQL fact_sales."""
    with db_session() as conn:
        # Check orphaned customer_id
        orphaned_cust = conn.execute(text("""
            SELECT COUNT(*) FROM fact_sales 
            WHERE customer_id NOT IN (SELECT customer_id FROM dim_customers);
        """)).scalar()
        assert orphaned_cust == 0

        # Check orphaned product_id
        orphaned_prod = conn.execute(text("""
            SELECT COUNT(*) FROM fact_sales 
            WHERE product_id NOT IN (SELECT product_id FROM dim_products);
        """)).scalar()
        assert orphaned_prod == 0

        # Check orphaned store_id
        orphaned_store = conn.execute(text("""
            SELECT COUNT(*) FROM fact_sales 
            WHERE store_id NOT IN (SELECT store_id FROM dim_stores);
        """)).scalar()
        assert orphaned_store == 0
