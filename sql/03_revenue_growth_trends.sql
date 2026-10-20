-- ============================================================================
-- RetailIQ: Revenue Growth Trends & Time-Series Intelligence
-- Calculates MoM, YoY, Cumulative Running Totals, and Order Volume Metrics
-- ============================================================================

WITH monthly_sales AS (
    SELECT 
        d.year,
        d.month_number,
        d.month_name,
        d.quarter,
        COUNT(DISTINCT f.order_id) AS total_orders,
        COUNT(f.transaction_id) AS total_line_items,
        SUM(f.order_quantity) AS total_units_sold,
        SUM(f.gross_sales_amount) AS total_gross_revenue,
        SUM(f.discount_amount) AS total_discounts,
        SUM(f.net_sales_amount) AS total_net_revenue,
        SUM(f.cogs_amount) AS total_cogs,
        SUM(f.gross_profit_amount) AS total_gross_profit,
        ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS gross_margin_pct
    FROM fact_sales f
    JOIN dim_date d ON f.order_date_id = d.date_id
    WHERE f.order_status = 'Completed'
    GROUP BY d.year, d.month_number, d.month_name, d.quarter
),
growth_calculations AS (
    SELECT 
        year,
        month_number,
        month_name,
        quarter,
        total_orders,
        total_units_sold,
        total_net_revenue,
        total_gross_profit,
        gross_margin_pct,
        -- Prior Month
        LAG(total_net_revenue, 1) OVER (ORDER BY year, month_number) AS prev_month_net_revenue,
        -- Prior Year Same Month (12 periods prior)
        LAG(total_net_revenue, 12) OVER (ORDER BY year, month_number) AS prev_year_same_month_revenue,
        -- Running Total within Calendar Year
        SUM(total_net_revenue) OVER (
            PARTITION BY year 
            ORDER BY month_number 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS ytd_cumulative_revenue,
        -- 3-Month Moving Average
        ROUND(AVG(total_net_revenue) OVER (
            ORDER BY year, month_number 
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 2) AS rolling_3mo_avg_revenue
    FROM monthly_sales
)
SELECT 
    year,
    month_name,
    quarter,
    total_orders,
    total_units_sold,
    ROUND(total_net_revenue, 2) AS current_net_revenue,
    ROUND(prev_month_net_revenue, 2) AS prev_month_revenue,
    ROUND(
        COALESCE(((total_net_revenue - prev_month_net_revenue) / NULLIF(prev_month_net_revenue, 0)) * 100, 0),
        2
    ) AS mom_growth_pct,
    ROUND(prev_year_same_month_revenue, 2) AS prev_year_revenue,
    ROUND(
        COALESCE(((total_net_revenue - prev_year_same_month_revenue) / NULLIF(prev_year_same_month_revenue, 0)) * 100, 0),
        2
    ) AS yoy_growth_pct,
    ROUND(ytd_cumulative_revenue, 2) AS ytd_running_revenue,
    rolling_3mo_avg_revenue,
    ROUND(total_gross_profit, 2) AS net_gross_profit,
    gross_margin_pct
FROM growth_calculations
ORDER BY year ASC, month_number ASC;
