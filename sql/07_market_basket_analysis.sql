-- ============================================================================
-- RetailIQ: Market Basket Analysis & Product Affinity (Co-occurrence)
-- Identifies item pairs most frequently bought together in the same order
-- ============================================================================

WITH order_product_pairs AS (
    SELECT 
        f1.order_id,
        f1.product_id AS product_a_id,
        f2.product_id AS product_b_id
    FROM fact_sales f1
    JOIN fact_sales f2 
        ON f1.order_id = f2.order_id 
        AND f1.product_id < f2.product_id -- Avoid duplicate permutations (A,B) vs (B,A) and self-pairs
    WHERE f1.order_status = 'Completed' AND f2.order_status = 'Completed'
),
pair_frequencies AS (
    SELECT 
        product_a_id,
        product_b_id,
        COUNT(DISTINCT order_id) AS co_occurrence_count
    FROM order_product_pairs
    GROUP BY product_a_id, product_b_id
),
total_order_metrics AS (
    SELECT COUNT(DISTINCT order_id) AS grand_total_orders FROM fact_sales WHERE order_status = 'Completed'
),
single_product_orders AS (
    SELECT 
        product_id, 
        COUNT(DISTINCT order_id) AS single_order_count 
    FROM fact_sales 
    WHERE order_status = 'Completed' 
    GROUP BY product_id
)
SELECT 
    pa.product_sku AS product_a_sku,
    pa.product_name AS product_a_name,
    pa.category AS product_a_category,
    pb.product_sku AS product_b_sku,
    pb.product_name AS product_b_name,
    pb.category AS product_b_category,
    pf.co_occurrence_count,
    ROUND((pf.co_occurrence_count::NUMERIC / tom.grand_total_orders) * 100, 3) AS pair_support_pct,
    -- Confidence (A -> B): P(B|A) = Count(A & B) / Count(A)
    ROUND((pf.co_occurrence_count::NUMERIC / NULLIF(spa.single_order_count, 0)) * 100, 2) AS confidence_a_to_b_pct,
    -- Lift = P(A & B) / (P(A) * P(B))
    ROUND(
        (pf.co_occurrence_count::NUMERIC * tom.grand_total_orders) / 
        NULLIF(spa.single_order_count * spb.single_order_count, 0),
        2
    ) AS affinity_lift_score
FROM pair_frequencies pf
JOIN dim_products pa ON pf.product_a_id = pa.product_id
JOIN dim_products pb ON pf.product_b_id = pb.product_id
JOIN single_product_orders spa ON pf.product_a_id = spa.product_id
JOIN single_product_orders spb ON pf.product_b_id = spb.product_id
CROSS JOIN total_order_metrics tom
WHERE pf.co_occurrence_count >= 5
ORDER BY affinity_lift_score DESC, pf.co_occurrence_count DESC
LIMIT 50;
