-- ============================================================================
-- RetailIQ: Customer RFM Segmentation & Lifecycle Personas
-- Uses NTILE(5) on Recency, Frequency, and Monetary to assign dynamic tiers
-- ============================================================================

WITH analysis_anchor AS (
    SELECT MAX(d.full_date) AS max_date 
    FROM fact_sales f 
    JOIN dim_date d ON f.order_date_id = d.date_id
),
customer_summary AS (
    SELECT 
        c.customer_id,
        c.customer_key,
        c.full_name,
        c.customer_segment AS base_segment,
        c.state,
        c.country,
        -- Recency: Days since last completed purchase
        (a.max_date - MAX(d.full_date))::INT AS recency_days,
        -- Frequency: Unique order count
        COUNT(DISTINCT f.order_id) AS frequency_orders,
        -- Monetary: Total spend
        SUM(f.net_sales_amount) AS monetary_spend,
        -- Profitability: Total gross profit
        SUM(f.gross_profit_amount) AS total_customer_profit,
        -- First purchase date
        MIN(d.full_date) AS customer_first_order_date
    FROM fact_sales f
    JOIN dim_customers c ON f.customer_id = c.customer_id
    JOIN dim_date d ON f.order_date_id = d.date_id
    CROSS JOIN analysis_anchor a
    WHERE f.order_status = 'Completed'
    GROUP BY 
        c.customer_id, 
        c.customer_key, 
        c.full_name, 
        c.customer_segment, 
        c.state, 
        c.country,
        a.max_date
),
rfm_scoring AS (
    SELECT 
        customer_id,
        customer_key,
        full_name,
        base_segment,
        state,
        country,
        recency_days,
        frequency_orders,
        monetary_spend,
        total_customer_profit,
        customer_first_order_date,
        -- Higher R score = more recent (lower recency_days)
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
        -- Higher F score = higher frequency
        NTILE(5) OVER (ORDER BY frequency_orders ASC) AS f_score,
        -- Higher M score = higher monetary spend
        NTILE(5) OVER (ORDER BY monetary_spend ASC) AS m_score
    FROM customer_summary
),
rfm_personas AS (
    SELECT 
        customer_id,
        customer_key,
        full_name,
        base_segment,
        state,
        recency_days,
        frequency_orders,
        ROUND(monetary_spend, 2) AS monetary_spend,
        ROUND(total_customer_profit, 2) AS customer_profit,
        r_score,
        f_score,
        m_score,
        CONCAT(r_score, f_score, m_score) AS rfm_code,
        ROUND((r_score + f_score + m_score)::NUMERIC / 3.0, 2) AS composite_rfm_score,
        CASE
            WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
            WHEN r_score >= 3 AND f_score >= 4 THEN 'Loyal Customers'
            WHEN r_score >= 4 AND f_score BETWEEN 1 AND 2 THEN 'Recent New Customers'
            WHEN r_score >= 3 AND f_score >= 2 AND m_score >= 3 THEN 'Potential Loyalists'
            WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At Risk / Need Attention'
            WHEN r_score = 1 AND f_score >= 4 THEN 'Can’t Lose Them (Critical)'
            WHEN r_score <= 2 AND f_score <= 2 AND m_score >= 3 THEN 'About to Sleep'
            WHEN r_score <= 2 AND f_score <= 2 AND m_score <= 2 THEN 'Hibernating / Churned'
            ELSE 'Standard / Promising'
        END AS rfm_persona
    FROM rfm_scoring
)
SELECT * 
FROM rfm_personas
ORDER BY composite_rfm_score DESC, monetary_spend DESC;
