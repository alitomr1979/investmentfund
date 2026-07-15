# Endpoint Design: GET `/reports/investors-summary`

## Overview
This endpoint provides a consolidated report for all investors, showing their current balances and their performance (both the fund's gross performance and the investor's personal net performance after fees) over the last quarter (3 months) and the last year (12 months).

## Mathematical Logic & Formulas

### 1. Current Total Amount
The current fiat value of an investor's holdings.
*   **Formula:** `Total Amount = Investor's Current Units * Current NAV`
*   **Data Source:** `users` table (for current units) and `fund_status` (for the latest NAV).

### 2. Fund Gross Performance (NAV Return)
Because the fund uses the NAV method (where deposits and withdrawals do not affect the NAV per unit, and fees are paid by deducting units rather than dropping the NAV), the NAV perfectly represents the **Gross Time-Weighted Return** of the fund.
*   **Formula:** `Fund_Gross_Return = (NAV_end / NAV_start) - 1`
*   **Where:**
    *   `NAV_end` = Current NAV.
    *   `NAV_start` = NAV exactly 3 months ago (for Last Quarter) or 12 months ago (for Last Year). If the fund is newer than the period, use the inception NAV.
*   **Data Source:** `fund_status` table (historical NAV records).

### 3. Investor Net Performance (After-Fees)
Calculating the investor's personal return is more complex because performance fees are charged by *deducting units* from their account. Therefore, while the Fund NAV goes up by 20%, an investor's personal value might only go up by 10% because they lost units to pay the manager.

To calculate the true **Net Return** for an investor, we must account for their deposits and withdrawals (External Cash Flows) using a **Time-Weighted Return (TWR)** approach, treating fee deductions as internal losses rather than external cash flows.

**The TWR Algorithm (Event-based):**
1.  Identify the period `[t_start, t_end]`.
2.  Find the investor's Initial Value at `t_start`: `V_start = Units_at_t_start * NAV_at_t_start`.
3.  Fetch all *External Cash Flows* (Deposits and Withdrawals) for this investor between `t_start` and `t_end` from the `transactions` table. *(Do NOT include fee deductions from `fee_ledger` as cash flows; they are performance penalties)*.
4.  Break the period into sub-periods every time a cash flow occurs.
5.  For each sub-period `i` ending right before a cash flow:
    *   `Sub_Return_i = (Value_before_cashflow / Value_at_start_of_subperiod) - 1`
    *   `Value_before_cashflow = Units_before_cashflow * NAV_at_cashflow`
    *   `Value_at_start_of_subperiod` = Value at the end of the previous sub-period + Cashflow amount.
6.  Chain the sub-period returns to get the total Net Return:
    *   `Investor_Net_Return = [ (1 + Sub_Return_1) * (1 + Sub_Return_2) * ... * (1 + Sub_Return_N) ] - 1`

**Alternative (Simpler Modified Dietz Method):**
If exact daily TWR is computationally heavy, the Coder can use the Modified Dietz Method:
*   `Net_Return = (V_end - V_start - Net_Cash_Flows) / (V_start + Weighted_Net_Cash_Flows)`
*   Where `Weighted_Net_Cash_Flows` = sum of `(Cash_Flow * weight)`, weight being the fraction of the period remaining after the cash flow occurred.

## Pseudocode for the Coder

```python
def get_investors_summary():
    current_nav = get_latest_nav()
    nav_3m_ago = get_historical_nav(months_ago=3)
    nav_1y_ago = get_historical_nav(months_ago=12)
    
    # Calculate Fund Gross Returns
    fund_gross_3m = (current_nav / nav_3m_ago) - 1
    fund_gross_1y = (current_nav / nav_1y_ago) - 1
    
    investors = get_all_investors()
    summary = []
    
    for investor in investors:
        current_amount = investor.current_units * current_nav
        
        # Calculate Net Return 3 Months
        net_return_3m = calculate_twr(investor.id, start_date_3m, end_date_now, current_amount)
        
        # Calculate Net Return 1 Year
        net_return_1y = calculate_twr(investor.id, start_date_1y, end_date_now, current_amount)
        
        summary.append({
            "investor_name": investor.name,
            "total_amount": current_amount,
            "last_quarter": {
                "fund_gross_return": fund_gross_3m,
                "investor_net_return": net_return_3m
            },
            "last_year": {
                "fund_gross_return": fund_gross_1y,
                "investor_net_return": net_return_1y
            }
        })
        
    return summary

def calculate_twr(investor_id, start_date, end_date, current_amount):
    # 1. Get units and NAV at start_date
    initial_units = get_investor_units_at_date(investor_id, start_date)
    initial_nav = get_nav_at_date(start_date)
    v_start = initial_units * initial_nav
    
    if v_start == 0 and has_no_cashflows_in_period:
        return 0.0
        
    # 2. Get all deposits/withdrawals (cash flows) in period, ordered by date
    cash_flows = get_investor_transactions(investor_id, start_date, end_date)
    
    # 3. Calculate sub-period returns
    twr_multiplier = 1.0
    current_subperiod_start_value = v_start
    
    for cf in cash_flows:
        # Value right before this cash flow
        units_before_cf = get_investor_units_right_before_date(investor_id, cf.date)
        nav_at_cf = get_nav_at_date(cf.date)
        v_before_cf = units_before_cf * nav_at_cf
        
        if current_subperiod_start_value > 0:
            sub_return = (v_before_cf / current_subperiod_start_value) - 1
        else:
            sub_return = 0
            
        twr_multiplier *= (1 + sub_return)
        
        # New start value for next sub-period includes the cash flow
        current_subperiod_start_value = v_before_cf + cf.fiat_amount 
        
    # Final sub-period (from last cash flow to today)
    if current_subperiod_start_value > 0:
        final_sub_return = (current_amount / current_subperiod_start_value) - 1
        twr_multiplier *= (1 + final_sub_return)
        
    return twr_multiplier - 1
```

## Considerations for Implementation
*   **Performance:** Fetching `units_at_date` might require re-calculating balances by summing up transactions and fee deductions up to that point. The Coder should create a robust helper function or SQL View `get_investor_snapshot(investor_id, timestamp)` to efficiently retrieve historic balances.
*   **Database Indexes:** Ensure there are indexes on `date`/`timestamp` in `transactions`, `fee_ledger`, and `fund_status` tables to optimize the time-series queries.
