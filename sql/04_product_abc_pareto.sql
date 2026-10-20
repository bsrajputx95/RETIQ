-- ============================================================================
-- RetailIQ: ABC Inventory & Pareto (80/20) Product Classification
-- Categorizes catalog into Class A (Top 80%), Class B (Next 15%), Class C (Bottom 5%)
-- ============================================================================

WITH product_metrics AS (
    SELECT 
        p.product_id,
        p.product_sku,
        p.product_name,
        p.category,
        p.sub_category,
        p.unit_cost,
        p.standard_unit_price,
        COUNT(DISTINCT f.order_id) AS total_orders_present,
        SUM(f.order_quantity) AS total_quantity_sold,
        SUM(f.net_sales_amount) AS total_net_sales,
        SUM(f.gross_profit_amount) AS total_gross_profit,
        ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS profit_margin_pct
    FROM fact_sales f
    JOIN dim_products p ON f.product_id = p.product_id
    WHERE f.order_status = 'Completed'
    GROUP BY 
        p.product_id, 
        p.product_sku, 
        p.product_name, 
        p.category, 
        p.sub_category, 
        p.unit_cost, 
        p.standard_unit_price
),
product_returns AS (
    SELECT 
        f.product_id,
        COUNT(r.return_id) AS total_returned_items,
        SUM(r.refund_amount) AS total_refunded_amount
    FROM fact_returns r
    JOIN fact_sales f ON r.transaction_id = f.transaction_id
    GROUP BY f.product_id
),
pareto_calculations AS (
    SELECT 
        pm.product_id,
        pm.product_sku,
        pm.product_name,
        pm.category,
        pm.sub_category,
        pm.total_quantity_sold,
        pm.total_net_sales,
        pm.total_gross_profit,
        pm.profit_margin_pct,
        COALESCE(pr.total_returned_items, 0) AS units_returned,
        ROUND((COALESCE(pr.total_returned_items, 0)::NUMERIC / NULLIF(pm.total_quantity_sold, 0)) * 100, 2) AS return_rate_pct,
        -- Running Total Net Sales
        SUM(pm.total_net_sales) OVER (ORDER BY pm.total_net_sales DESC) AS running_net_sales,
        -- Grand Total Net Sales across entire catalog
        SUM(pm.total_net_sales) OVER () AS grand_total_net_sales,
        -- Rank products by sales volume
        ROW_NUMBER() OVER (ORDER BY pm.total_net_sales DESC) AS sales_rank,
        COUNT(*) OVER () AS total_products_count
    FROM product_metrics pm
    LEFT JOIN product_returns pr ON pm.product_id = pr.product_id
)
SELECT 
    sales_rank,
    product_sku,
    product_name,
    category,
    sub_category,
    ROUND(total_net_sales, 2) AS net_sales,
    ROUND(total_gross_profit, 2) AS gross_profit,
    profit_margin_pct,
    return_rate_pct,
    ROUND((running_net_sales / NULLIF(grand_total_net_sales, 0)) * 100, 2) AS cumulative_sales_pct,
    ROUND((sales_rank::NUMERIC / total_products_count) * 100, 2) AS catalog_rank_pct,
    CASE 
        WHEN (running_net_sales / NULLIF(grand_total_net_sales, 0)) <= 0.80 THEN 'Class A (Core Drivers - Top 80%)'
        WHEN (running_net_sales / NULLIF(grand_total_net_sales, 0)) <= 0.95 THEN 'Class B (Steady Performers - Next 15%)'
        ELSE 'Class C (Tail / Low Velocity - Bottom 5%)'
    END AS pareto_class
FROM pareto_calculations
ORDER BY sales_rank ASC;
