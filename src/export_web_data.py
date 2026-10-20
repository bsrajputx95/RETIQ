"""
Exports real aggregated analytics from PostgreSQL to web/data.js for Vercel deployment.
"""
import os
import json
import pandas as pd
from sqlalchemy import text
from src.db import db_session

def export_web_data():
    os.makedirs("web", exist_ok=True)
    
    with db_session() as conn:
        # 1. Executive KPIs
        kpi = conn.execute(text("""
            SELECT 
                COUNT(DISTINCT f.order_id) AS total_orders,
                SUM(f.net_sales_amount) AS total_revenue,
                SUM(f.gross_profit_amount) AS total_profit,
                ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS gross_margin_pct,
                COUNT(DISTINCT f.customer_id) AS total_customers,
                ROUND(AVG(f.net_sales_amount), 2) AS avg_item_price,
                COUNT(r.return_id) AS total_returns,
                ROUND((COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(DISTINCT f.order_id), 0)) * 100, 2) AS return_rate_pct
            FROM fact_sales f
            LEFT JOIN fact_returns r ON f.transaction_id = r.transaction_id
            WHERE f.order_status = 'Completed';
        """)).mappings().fetchone()

        # 2. Monthly Revenue
        monthly_df = pd.read_sql(text("""
            SELECT 
                d.year,
                d.month_number,
                d.month_name,
                TO_CHAR(d.full_date, 'Mon YY') AS period_label,
                COUNT(DISTINCT f.order_id) AS orders,
                ROUND(SUM(f.net_sales_amount), 2) AS net_revenue,
                ROUND(SUM(f.gross_profit_amount), 2) AS gross_profit,
                ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS margin_pct
            FROM fact_sales f
            JOIN dim_date d ON f.order_date_id = d.date_id
            WHERE f.order_status = 'Completed'
            GROUP BY d.year, d.month_number, d.month_name, TO_CHAR(d.full_date, 'Mon YY')
            ORDER BY d.year, d.month_number;
        """), conn)

        # 3. Category & Region Breakdown
        cat_df = pd.read_sql(text("""
            SELECT 
                p.category,
                ROUND(SUM(f.net_sales_amount), 2) AS revenue,
                ROUND(SUM(f.gross_profit_amount), 2) AS profit,
                ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS margin_pct,
                COUNT(DISTINCT f.order_id) AS orders
            FROM fact_sales f
            JOIN dim_products p ON f.product_id = p.product_id
            WHERE f.order_status = 'Completed'
            GROUP BY p.category
            ORDER BY revenue DESC;
        """), conn)

        region_df = pd.read_sql(text("""
            SELECT 
                s.region,
                s.store_type,
                COUNT(DISTINCT s.store_id) AS store_count,
                ROUND(SUM(f.net_sales_amount), 2) AS revenue,
                ROUND(SUM(f.gross_profit_amount), 2) AS profit
            FROM fact_sales f
            JOIN dim_stores s ON f.store_id = s.store_id
            WHERE f.order_status = 'Completed'
            GROUP BY s.region, s.store_type
            ORDER BY revenue DESC;
        """), conn)

        # 4. Top 30 Product ABC Pareto
        pareto_df = pd.read_sql(text("""
            WITH product_sales AS (
                SELECT 
                    p.product_sku,
                    p.product_name,
                    p.category,
                    p.sub_category,
                    SUM(f.order_quantity) AS units_sold,
                    SUM(f.net_sales_amount) AS revenue,
                    SUM(f.gross_profit_amount) AS profit,
                    ROUND((SUM(f.gross_profit_amount) / NULLIF(SUM(f.net_sales_amount), 0)) * 100, 2) AS margin_pct
                FROM fact_sales f
                JOIN dim_products p ON f.product_id = p.product_id
                WHERE f.order_status = 'Completed'
                GROUP BY p.product_sku, p.product_name, p.category, p.sub_category
            ),
            pareto AS (
                SELECT 
                    *,
                    SUM(revenue) OVER (ORDER BY revenue DESC) AS running_rev,
                    SUM(revenue) OVER () AS total_rev,
                    ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rank
                FROM product_sales
            )
            SELECT 
                rank,
                product_sku,
                product_name,
                category,
                sub_category,
                units_sold,
                ROUND(revenue, 2) AS revenue,
                ROUND(profit, 2) AS profit,
                margin_pct,
                ROUND((running_rev / total_rev) * 100, 2) AS cum_pct,
                CASE 
                    WHEN (running_rev / total_rev) <= 0.80 THEN 'Class A'
                    WHEN (running_rev / total_rev) <= 0.95 THEN 'Class B'
                    ELSE 'Class C'
                END AS pareto_class
            FROM pareto
            ORDER BY rank ASC
            LIMIT 40;
        """), conn)

        # 5. RFM Persona Summary
        rfm_summary_df = pd.read_sql(text("""
            WITH ref AS (SELECT MAX(d.full_date) AS mdate FROM fact_sales f JOIN dim_date d ON f.order_date_id = d.date_id),
            cust AS (
                SELECT 
                    f.customer_id,
                    (r.mdate - MAX(d.full_date))::INT AS recency,
                    COUNT(DISTINCT f.order_id) AS freq,
                    SUM(f.net_sales_amount) AS monetary
                FROM fact_sales f
                JOIN dim_date d ON f.order_date_id = d.date_id
                CROSS JOIN ref r
                WHERE f.order_status = 'Completed'
                GROUP BY f.customer_id, r.mdate
            ),
            scored AS (
                SELECT 
                    customer_id,
                    recency,
                    freq,
                    monetary,
                    NTILE(5) OVER (ORDER BY recency DESC) AS r,
                    NTILE(5) OVER (ORDER BY freq ASC) AS f,
                    NTILE(5) OVER (ORDER BY monetary ASC) AS m
                FROM cust
            ),
            personas AS (
                SELECT 
                    CASE
                        WHEN r >= 4 AND f >= 4 AND m >= 4 THEN 'Champions'
                        WHEN r >= 3 AND f >= 4 THEN 'Loyal Customers'
                        WHEN r >= 4 AND f BETWEEN 1 AND 2 THEN 'Recent New Customers'
                        WHEN r >= 3 AND f >= 2 AND m >= 3 THEN 'Potential Loyalists'
                        WHEN r <= 2 AND f >= 3 AND m >= 3 THEN 'At Risk'
                        WHEN r = 1 AND f >= 4 THEN 'Can’t Lose Them'
                        WHEN r <= 2 AND f <= 2 AND m >= 3 THEN 'About to Sleep'
                        WHEN r <= 2 AND f <= 2 AND m <= 2 THEN 'Hibernating'
                        ELSE 'Standard'
                    END AS persona,
                    monetary
                FROM scored
            )
            SELECT 
                persona,
                COUNT(*) AS customer_count,
                ROUND(AVG(monetary), 2) AS avg_monetary,
                ROUND(SUM(monetary), 2) AS total_segment_revenue
            FROM personas
            GROUP BY persona
            ORDER BY total_segment_revenue DESC;
        """), conn)

        # 6. Cohort Retention Summary
        cohort_df = pd.read_sql(text("""
            WITH first_orders AS (
                SELECT f.customer_id, DATE_TRUNC('month', MIN(d.full_date))::DATE AS cohort_month
                FROM fact_sales f JOIN dim_date d ON f.order_date_id = d.date_id
                WHERE f.order_status = 'Completed'
                GROUP BY f.customer_id
            ),
            activity AS (
                SELECT f.customer_id, DATE_TRUNC('month', d.full_date)::DATE AS act_month
                FROM fact_sales f JOIN dim_date d ON f.order_date_id = d.date_id
                WHERE f.order_status = 'Completed'
                GROUP BY f.customer_id, DATE_TRUNC('month', d.full_date)
            ),
            c_sizes AS (
                SELECT cohort_month, COUNT(DISTINCT customer_id) AS total_users FROM first_orders GROUP BY cohort_month
            ),
            ret AS (
                SELECT 
                    fo.cohort_month,
                    (EXTRACT(YEAR FROM a.act_month) - EXTRACT(YEAR FROM fo.cohort_month)) * 12 +
                    (EXTRACT(MONTH FROM a.act_month) - EXTRACT(MONTH FROM fo.cohort_month)) AS period,
                    COUNT(DISTINCT a.customer_id) AS active_users
                FROM first_orders fo
                JOIN activity a ON fo.customer_id = a.customer_id
                GROUP BY fo.cohort_month, period
            )
            SELECT 
                TO_CHAR(r.cohort_month, 'YYYY-MM') AS cohort,
                cs.total_users,
                r.period,
                r.active_users,
                ROUND((r.active_users::NUMERIC / cs.total_users) * 100, 1) AS retention_rate
            FROM ret r
            JOIN c_sizes cs ON r.cohort_month = cs.cohort_month
            WHERE r.period BETWEEN 0 AND 8
            ORDER BY r.cohort_month, r.period;
        """), conn)

        # 7. Market Basket Association Rules
        basket_df = pd.read_sql(text("""
            WITH pairs AS (
                SELECT f1.product_id AS p1, f2.product_id AS p2, COUNT(DISTINCT f1.order_id) AS cnt
                FROM fact_sales f1
                JOIN fact_sales f2 ON f1.order_id = f2.order_id AND f1.product_id < f2.product_id
                WHERE f1.order_status = 'Completed' AND f2.order_status = 'Completed'
                GROUP BY f1.product_id, f2.product_id
            ),
            total AS (SELECT COUNT(DISTINCT order_id) AS ords FROM fact_sales WHERE order_status = 'Completed'),
            single AS (SELECT product_id, COUNT(DISTINCT order_id) AS s_ords FROM fact_sales WHERE order_status = 'Completed' GROUP BY product_id)
            SELECT 
                pa.product_sku AS item_a,
                pa.product_name AS name_a,
                pb.product_sku AS item_b,
                pb.product_name AS name_b,
                p.cnt AS pair_orders,
                ROUND((p.cnt::NUMERIC * t.ords) / NULLIF(sa.s_ords * sb.s_ords, 0), 2) AS lift,
                ROUND((p.cnt::NUMERIC / sa.s_ords) * 100, 1) AS confidence_pct
            FROM pairs p
            JOIN dim_products pa ON p.p1 = pa.product_id
            JOIN dim_products pb ON p.p2 = pb.product_id
            JOIN single sa ON p.p1 = sa.product_id
            JOIN single sb ON p.p2 = sb.product_id
            CROSS JOIN total t
            WHERE p.cnt >= 5
            ORDER BY lift DESC
            LIMIT 15;
        """), conn)

    # Convert Decimal to float in kpi dict
    kpi_dict = {
        k: float(v) if hasattr(v, '__float__') else v
        for k, v in dict(kpi).items()
    }

    # Write data.js
    content = f"""// RetailIQ Generated Dataset Cache (Synchronized from PostgreSQL Warehouse)
export const executiveKpis = {json.dumps(kpi_dict, indent=2)};

export const monthlyTrends = {monthly_df.to_json(orient='records', indent=2)};

export const categoryBreakdown = {cat_df.to_json(orient='records', indent=2)};

export const regionalBreakdown = {region_df.to_json(orient='records', indent=2)};

export const productPareto = {pareto_df.to_json(orient='records', indent=2)};

export const rfmPersonas = {rfm_summary_df.to_json(orient='records', indent=2)};

export const cohortRetention = {cohort_df.to_json(orient='records', indent=2)};

export const basketAffinity = {basket_df.to_json(orient='records', indent=2)};
"""

    with open("web/data.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully generated web/data.js")

if __name__ == "__main__":
    export_web_data()
