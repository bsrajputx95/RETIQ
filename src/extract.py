import os
import random
from datetime import datetime, timedelta
from typing import Dict
import numpy as np
import pandas as pd
import yaml
from faker import Faker
from src.utils import setup_logger, timed_step

logger = setup_logger(__name__)

def load_pipeline_config(config_path: str = "config/pipeline_config.yaml") -> dict:
    """Loads pipeline configuration settings."""
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["pipeline"]

def get_or_generate_retail_data(
    config_path: str = "config/pipeline_config.yaml",
    force_regenerate: bool = False
) -> Dict[str, pd.DataFrame]:
    """Loads existing raw datasets from disk if available, otherwise generates them."""
    config = load_pipeline_config(config_path)
    raw_dir = config["paths"]["raw_dir"]
    required_files = {
        "customers": "raw_customers.csv",
        "products": "raw_products.csv",
        "stores": "raw_stores.csv",
        "sales": "raw_sales.csv",
        "returns": "raw_returns.csv"
    }

    all_exist = all(os.path.exists(os.path.join(raw_dir, fname)) for fname in required_files.values())

    if all_exist and not force_regenerate:
        logger.info(f"Loading existing raw datasets from {raw_dir}...")
        return {
            key: pd.read_csv(os.path.join(raw_dir, fname))
            for key, fname in required_files.items()
        }

    return generate_synthetic_retail_data(config_path)

@timed_step("Synthetic Enterprise Retail Dataset Generation")
def generate_synthetic_retail_data(
    config_path: str = "config/pipeline_config.yaml",
    seed: int = 42
) -> Dict[str, pd.DataFrame]:
    """
    Generates a realistic, enterprise-grade multi-channel retail dataset.
    Includes seasonal sales trends, customer profiles, product catalog,
    store networks, and product return behaviors.
    """
    np.random.seed(seed)
    random.seed(seed)
    fake = Faker("en_US")
    Faker.seed(seed)

    config = load_pipeline_config(config_path)
    synth_cfg = config["synthetic_generation"]
    num_customers = synth_cfg["num_customers"]
    num_products = synth_cfg["num_products"]
    num_stores = synth_cfg["num_stores"]
    num_orders = synth_cfg["num_orders"]
    return_rate = synth_cfg["return_rate"]

    start_date = datetime.strptime(synth_cfg["start_date"], "%Y-%m-%d")
    end_date = datetime.strptime(synth_cfg["end_date"], "%Y-%m-%d")
    date_range_days = (end_date - start_date).days

    # -------------------------------------------------------------------------
    # 1. Generate Customers
    # -------------------------------------------------------------------------
    logger.info(f"Generating {num_customers:,} customer records...")
    segments = ["Consumer", "Corporate", "Home Office"]
    segment_weights = [0.55, 0.30, 0.15]

    customers_data = []
    for cid in range(1, num_customers + 1):
        signup_offset = random.randint(0, int(date_range_days * 0.8))
        signup_dt = start_date + timedelta(days=signup_offset)
        customers_data.append({
            "customer_id": cid,
            "customer_key": f"CUST-{cid:05d}",
            "full_name": fake.name(),
            "email": fake.email(),
            "customer_segment": np.random.choice(segments, p=segment_weights),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "postal_code": fake.zipcode(),
            "country": "United States",
            "first_purchase_date": signup_dt.strftime("%Y-%m-%d"),
            "is_active": np.random.choice([True, False], p=[0.92, 0.08])
        })
    df_customers = pd.DataFrame(customers_data)

    # -------------------------------------------------------------------------
    # 2. Generate Products
    # -------------------------------------------------------------------------
    logger.info(f"Generating {num_products:,} product records...")
    categories_map = {
        "Technology": ["Laptops", "Smartphones", "Accessories", "Printers", "Monitors"],
        "Furniture": ["Chairs", "Desks", "Bookcases", "Furnishings", "Tables"],
        "Office Supplies": ["Binders", "Paper", "Storage", "Art", "Appliances", "Fasteners"],
        "Apparel": ["Footwear", "Outerwear", "Sportswear", "Casual Wear", "Accessories"]
    }
    
    products_data = []
    pid = 1
    for cat, subcats in categories_map.items():
        skus_per_cat = num_products // len(categories_map)
        for i in range(skus_per_cat):
            subcat = random.choice(subcats)
            if cat == "Technology":
                cost = round(random.uniform(40.0, 850.0), 2)
                price = round(cost * random.uniform(1.25, 1.60), 2)
            elif cat == "Furniture":
                cost = round(random.uniform(50.0, 500.0), 2)
                price = round(cost * random.uniform(1.30, 1.80), 2)
            elif cat == "Apparel":
                cost = round(random.uniform(10.0, 90.0), 2)
                price = round(cost * random.uniform(1.50, 2.50), 2)
            else: # Office Supplies
                cost = round(random.uniform(2.0, 45.0), 2)
                price = round(cost * random.uniform(1.40, 2.20), 2)

            products_data.append({
                "product_id": pid,
                "product_sku": f"SKU-{cat[:3].upper()}-{pid:04d}",
                "product_name": f"{fake.company()} {subcat[:-1] if subcat.endswith('s') else subcat} Model-{pid}",
                "category": cat,
                "sub_category": subcat,
                "unit_cost": cost,
                "standard_unit_price": price,
                "supplier_name": fake.company(),
                "is_discontinued": np.random.choice([True, False], p=[0.05, 0.95])
            })
            pid += 1
    df_products = pd.DataFrame(products_data)

    # Fast in-memory lookup dictionary for products: pid -> (price, cost)
    prod_lookup = {
        row["product_id"]: (row["standard_unit_price"], row["unit_cost"])
        for _, row in df_products.iterrows()
    }

    # -------------------------------------------------------------------------
    # 3. Generate Stores / Sales Channels
    # -------------------------------------------------------------------------
    logger.info(f"Generating {num_stores} store records...")
    store_types = ["Flagship Store", "Mall Outlet", "Express Store", "E-Commerce Web", "Mobile App"]
    regions = ["East", "West", "Central", "South"]

    stores_data = []
    for sid in range(1, num_stores + 1):
        stype = store_types[min(sid - 1, len(store_types) - 1)] if sid <= len(store_types) else random.choice(store_types)
        region = regions[(sid - 1) % len(regions)]
        sqft = round(random.uniform(3000, 25000), 2) if "Store" in stype or "Outlet" in stype else 0.0
        stores_data.append({
            "store_id": sid,
            "store_name": f"RetailIQ {stype} - {region} #{sid}",
            "store_type": stype,
            "region": region,
            "city": fake.city(),
            "state": fake.state_abbr(),
            "square_footage": sqft,
            "opening_date": (start_date - timedelta(days=random.randint(200, 1500))).strftime("%Y-%m-%d")
        })
    df_stores = pd.DataFrame(stores_data)

    # -------------------------------------------------------------------------
    # 4. Generate Sales Transactions & Orders
    # -------------------------------------------------------------------------
    logger.info(f"Generating {num_orders:,} sales transactions with seasonal patterns...")
    
    # Pareto popularity: 20% of products get 80% of orders
    product_p = np.exp(-np.linspace(0, 5, len(df_products)))
    product_p /= product_p.sum()

    # Customer activity distribution
    customer_p = np.exp(-np.linspace(0, 4, len(df_customers)))
    customer_p /= customer_p.sum()

    order_statuses = ["Completed", "Completed", "Completed", "Shipped", "Pending", "Cancelled"]
    status_weights = [0.82, 0.05, 0.05, 0.04, 0.02, 0.02]
    payment_methods = ["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Cash"]
    payment_weights = [0.50, 0.20, 0.15, 0.10, 0.05]

    customer_pool = df_customers["customer_id"].to_numpy()
    product_pool = df_products["product_id"].to_numpy()

    transactions = []
    returns = []
    tx_counter = 1
    return_counter = 1

    # Simulate orders
    for order_num in range(1, num_orders + 1):
        order_id = f"ORD-{order_num:06d}"
        
        # Order Date with seasonality (higher in Nov-Dec Q4)
        random_day = random.randint(0, date_range_days)
        order_dt = start_date + timedelta(days=random_day)
        
        cid = int(np.random.choice(customer_pool, p=customer_p))
        sid = random.randint(1, num_stores)
        status = np.random.choice(order_statuses, p=status_weights)
        pmt = np.random.choice(payment_methods, p=payment_weights)
        
        # Items per order: 1 to 5 items
        basket_size = np.random.choice([1, 2, 3, 4, 5], p=[0.55, 0.25, 0.12, 0.05, 0.03])
        chosen_products = np.random.choice(product_pool, size=basket_size, replace=False, p=product_p)

        order_date_id = int(order_dt.strftime("%Y%m%d"))

        for line_idx, chosen_pid in enumerate(chosen_products, 1):
            unit_price, unit_cost = prod_lookup[chosen_pid]
            qty = int(np.random.choice([1, 2, 3, 4, 5], p=[0.65, 0.20, 0.08, 0.04, 0.03]))
            
            # Discount (0%, 5%, 10%, 15%, 20%)
            disc_pct = np.random.choice([0.0, 0.05, 0.10, 0.15, 0.20], p=[0.60, 0.15, 0.12, 0.08, 0.05])
            gross_amount = round(qty * unit_price, 2)
            discount_amount = round(gross_amount * disc_pct, 2)
            tax_amount = round((gross_amount - discount_amount) * 0.07, 2)
            net_amount = round(gross_amount - discount_amount, 2)
            cogs_amount = round(qty * unit_cost, 2)
            profit_amount = round(net_amount - cogs_amount, 2)

            tx_record = {
                "transaction_id": tx_counter,
                "order_id": order_id,
                "line_item_id": line_idx,
                "customer_id": cid,
                "product_id": chosen_pid,
                "store_id": sid,
                "order_date_id": order_date_id,
                "order_quantity": qty,
                "unit_price": unit_price,
                "discount_amount": discount_amount,
                "tax_amount": tax_amount,
                "gross_sales_amount": gross_amount,
                "net_sales_amount": net_amount,
                "cogs_amount": cogs_amount,
                "gross_profit_amount": profit_amount,
                "order_status": status,
                "payment_method": pmt
            }
            transactions.append(tx_record)

            # Check if this item is returned
            if status == "Completed" and random.random() < return_rate:
                return_dt = order_dt + timedelta(days=random.randint(2, 28))
                return_date_id = int(return_dt.strftime("%Y%m%d"))
                return_reasons = ["Defective Item", "Wrong Size / Fit", "Item Not as Described", "Buyer Remorse"]
                returns.append({
                    "return_id": return_counter,
                    "transaction_id": tx_counter,
                    "return_date_id": return_date_id,
                    "return_quantity": qty,
                    "refund_amount": net_amount,
                    "return_reason": random.choice(return_reasons)
                })
                return_counter += 1

            tx_counter += 1

    df_sales = pd.DataFrame(transactions)
    df_returns = pd.DataFrame(returns)

    # -------------------------------------------------------------------------
    # Save raw CSVs to data/raw
    # -------------------------------------------------------------------------
    raw_dir = config["paths"]["raw_dir"]
    os.makedirs(raw_dir, exist_ok=True)

    df_customers.to_csv(os.path.join(raw_dir, "raw_customers.csv"), index=False)
    df_products.to_csv(os.path.join(raw_dir, "raw_products.csv"), index=False)
    df_stores.to_csv(os.path.join(raw_dir, "raw_stores.csv"), index=False)
    df_sales.to_csv(os.path.join(raw_dir, "raw_sales.csv"), index=False)
    df_returns.to_csv(os.path.join(raw_dir, "raw_returns.csv"), index=False)

    logger.info(f"Saved raw datasets to {raw_dir}:")
    logger.info(f"  Customers: {len(df_customers):,}")
    logger.info(f"  Products:  {len(df_products):,}")
    logger.info(f"  Stores:    {len(df_stores):,}")
    logger.info(f"  Sales:     {len(df_sales):,}")
    logger.info(f"  Returns:   {len(df_returns):,}")

    return {
        "customers": df_customers,
        "products": df_products,
        "stores": df_stores,
        "sales": df_sales,
        "returns": df_returns
    }

if __name__ == "__main__":
    generate_synthetic_retail_data()
