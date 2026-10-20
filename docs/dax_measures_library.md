# RetailIQ Power BI DAX Measures Library

This document contains the complete repository of DAX measures configured for the **RetailIQ Power BI Executive Dashboard**.

---

## 1. Sales & Profitability Base Measures

### 1.1 `[Total Gross Revenue]`
```dax
Total Gross Revenue = 
SUM(fact_sales[gross_sales_amount])
```
*Description*: Aggregate gross transactional order volume prior to promotional discounts.

### 1.2 `[Total Net Revenue]`
```dax
Total Net Revenue = 
SUM(fact_sales[net_sales_amount])
```
*Description*: Core top-line revenue recognizing valid deductions and promotional coupon codes.

### 1.3 `[Total Discounts]`
```dax
Total Discounts = 
SUM(fact_sales[discount_amount])
```

### 1.4 `[Discount Rate %]`
```dax
Discount Rate % = 
DIVIDE([Total Discounts], [Total Gross Revenue], 0)
```

### 1.5 `[Total COGS]`
```dax
Total COGS = 
SUM(fact_sales[cogs_amount])
```
*Description*: Aggregate cost of goods sold based on unit cost at purchase timestamp.

### 1.6 `[Total Gross Profit]`
```dax
Total Gross Profit = 
[Total Net Revenue] - [Total COGS]
```

### 1.7 `[Gross Margin %]`
```dax
Gross Margin % = 
DIVIDE([Total Gross Profit], [Total Net Revenue], 0)
```
*Formatting*: Percentage (`0.0%`).

### 1.8 `[Total Orders]`
```dax
Total Orders = 
DISTINCTCOUNT(fact_sales[order_id])
```

### 1.9 `[Average Order Value (AOV)]`
```dax
Average Order Value = 
DIVIDE([Total Net Revenue], [Total Orders], 0)
```

### 1.10 `[Average Basket Size]`
```dax
Average Basket Size = 
DIVIDE(SUM(fact_sales[order_quantity]), [Total Orders], 0)
```

---

## 2. Customer Analytics & Retention Measures

### 2.1 `[Active Transacting Customers]`
```dax
Active Transacting Customers = 
DISTINCTCOUNT(fact_sales[customer_id])
```

### 2.2 `[Repeat Customers]`
```dax
Repeat Customers = 
CALCULATE(
    DISTINCTCOUNT(fact_sales[customer_id]),
    FILTER(
        VALUES(fact_sales[customer_id]),
        CALCULATE(DISTINCTCOUNT(fact_sales[order_id])) > 1
    )
)
```

### 2.3 `[Repeat Customer Rate %]`
```dax
Repeat Customer Rate % = 
DIVIDE([Repeat Customers], [Active Transacting Customers], 0)
```

### 2.4 `[Return Rate %]`
```dax
Return Rate % = 
DIVIDE(
    COUNT(fact_returns[return_id]), 
    [Total Orders], 
    0
)
```

---

## 3. Time Intelligence & Comparative Variance

### 3.1 `[Revenue Prior Month]`
```dax
Revenue Prior Month = 
CALCULATE(
    [Total Net Revenue],
    DATEADD(dim_date[full_date], -1, MONTH)
)
```

### 3.2 `[MoM Revenue Growth %]`
```dax
MoM Revenue Growth % = 
DIVIDE(
    [Total Net Revenue] - [Revenue Prior Month],
    [Revenue Prior Month],
    0
)
```

### 3.3 `[Revenue SPLY (Same Period Last Year)]`
```dax
Revenue SPLY = 
CALCULATE(
    [Total Net Revenue],
    SAMEPERIODLASTYEAR(dim_date[full_date])
)
```

### 3.4 `[YoY Revenue Growth %]`
```dax
YoY Revenue Growth % = 
DIVIDE(
    [Total Net Revenue] - [Revenue SPLY],
    [Revenue SPLY],
    0
)
```

### 3.5 `[Revenue YTD (Year-to-Date)]`
```dax
Revenue YTD = 
TOTALYTD(
    [Total Net Revenue],
    dim_date[full_date]
)
```

### 3.6 `[Rolling 3M Net Revenue]`
```dax
Rolling 3M Net Revenue = 
CALCULATE(
    [Total Net Revenue],
    DATESINPERIOD(
        dim_date[full_date],
        LASTDATE(dim_date[full_date]),
        -3,
        MONTH
    )
) / 3
```
