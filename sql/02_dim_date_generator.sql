-- ============================================================================
-- RetailIQ: Automated Date Dimension Generator
-- Generates daily calendar records from 2022-01-01 to 2030-12-31
-- ============================================================================

INSERT INTO dim_date (
    date_id,
    full_date,
    day_of_week,
    day_name,
    day_of_month,
    day_of_year,
    week_of_year,
    month_number,
    month_name,
    quarter,
    year,
    is_weekend,
    is_holiday,
    fiscal_quarter,
    fiscal_year
)
SELECT
    TO_CHAR(datum, 'YYYYMMDD')::INT AS date_id,
    datum AS full_date,
    EXTRACT(ISODOW FROM datum)::INT AS day_of_week,
    TO_CHAR(datum, 'FMDay') AS day_name,
    EXTRACT(DAY FROM datum)::INT AS day_of_month,
    EXTRACT(DOY FROM datum)::INT AS day_of_year,
    EXTRACT(WEEK FROM datum)::INT AS week_of_year,
    EXTRACT(MONTH FROM datum)::INT AS month_number,
    TO_CHAR(datum, 'FMMonth') AS month_name,
    EXTRACT(QUARTER FROM datum)::INT AS quarter,
    EXTRACT(YEAR FROM datum)::INT AS year,
    CASE WHEN EXTRACT(ISODOW FROM datum) IN (6, 7) THEN TRUE ELSE FALSE END AS is_weekend,
    CASE 
        -- Standard US Holidays Approximation
        WHEN TO_CHAR(datum, 'MMDD') IN ('0101', '0704', '1111', '1225') THEN TRUE
        ELSE FALSE 
    END AS is_holiday,
    'Q' || EXTRACT(QUARTER FROM datum)::TEXT AS fiscal_quarter,
    EXTRACT(YEAR FROM datum)::INT AS fiscal_year
FROM (
    SELECT '2022-01-01'::DATE + SEQUENCE.DAY AS datum
    FROM GENERATE_SERIES(0, 3652) AS SEQUENCE(DAY)
) DQ
ON CONFLICT (date_id) DO NOTHING;
