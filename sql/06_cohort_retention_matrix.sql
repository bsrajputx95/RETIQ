-- ============================================================================
-- RetailIQ: Monthly Cohort Retention Matrix
-- Measures customer retention percentages from Month 0 to Month 12
-- ============================================================================

WITH customer_first_orders AS (
    SELECT 
        f.customer_id,
        DATE_TRUNC('month', MIN(d.full_date))::DATE AS cohort_month
    FROM fact_sales f
    JOIN dim_date d ON f.order_date_id = d.date_id
    WHERE f.order_status = 'Completed'
    GROUP BY f.customer_id
),
customer_monthly_activity AS (
    SELECT 
        f.customer_id,
        DATE_TRUNC('month', d.full_date)::DATE AS activity_month
    FROM fact_sales f
    JOIN dim_date d ON f.order_date_id = d.date_id
    WHERE f.order_status = 'Completed'
    GROUP BY f.customer_id, DATE_TRUNC('month', d.full_date)
),
cohort_base_sizes AS (
    SELECT 
        cohort_month,
        COUNT(DISTINCT customer_id) AS total_cohort_users
    FROM customer_first_orders
    GROUP BY cohort_month
),
cohort_retention_counts AS (
    SELECT 
        cfo.cohort_month,
        -- Calculate index of elapsed months (0, 1, 2, ... 12)
        (EXTRACT(YEAR FROM cma.activity_month) - EXTRACT(YEAR FROM cfo.cohort_month)) * 12 +
        (EXTRACT(MONTH FROM cma.activity_month) - EXTRACT(MONTH FROM cfo.cohort_month)) AS period_offset,
        COUNT(DISTINCT cma.customer_id) AS active_users
    FROM customer_first_orders cfo
    JOIN customer_monthly_activity cma ON cfo.customer_id = cma.customer_id
    GROUP BY cfo.cohort_month, period_offset
)
SELECT 
    TO_CHAR(crc.cohort_month, 'YYYY-MM') AS cohort_month,
    cbs.total_cohort_users,
    crc.period_offset AS month_number,
    crc.active_users,
    ROUND((crc.active_users::NUMERIC / NULLIF(cbs.total_cohort_users, 0)) * 100, 2) AS retention_rate_pct
FROM cohort_retention_counts crc
JOIN cohort_base_sizes cbs ON crc.cohort_month = cbs.cohort_month
WHERE crc.period_offset BETWEEN 0 AND 12
ORDER BY crc.cohort_month ASC, crc.period_offset ASC;
