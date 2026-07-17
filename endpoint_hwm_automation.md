# Endpoint Redesign: HWM Automation & Fee Settings

## Overview
The architecture has been updated to fully automate the High Water Mark (HWM) and performance fee deduction logic. The manual `/evaluate-performance` endpoint is deprecated. Its logic is now natively integrated into the `POST /fund-status/update-value` lifecycle. Additionally, a new endpoint allows the Manager to customize the performance fee percentage per investor.

## 1. Pydantic Schemas

```python
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class FundValueUpdate(BaseModel):
    total_value: float = Field(..., gt=0, description="The new total fiat value of the fund.")
    effective_date: date = Field(..., description="The date for this NAV calculation.")

class UserFeeUpdate(BaseModel):
    performance_fee_percentage: float = Field(..., ge=0, le=1, description="Fee percentage (e.g., 0.50 for 50%).")

class FeeLedgerEntry(BaseModel):
    user_id: int
    old_hwm_nav: float
    new_hwm_nav: float
    spy_return: float
    excess_profit_per_unit: float
    units_transferred: float
    fiat_fee_value: float
    date: date
```

## 2. Endpoint: `PUT /users/{user_id}/fee`

**Purpose:** Allows the Admin/Manager to update the performance fee percentage for a specific investor.

### Pseudocode

```python
@router.put("/users/{user_id}/fee")
def update_user_fee(user_id: int, payload: UserFeeUpdate, db: Session = Depends(get_db)):
    # 1. Verify caller is Admin
    verify_admin_access()
    
    # 2. Fetch User
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
         raise HTTPException(404, "User not found")
         
    # 3. Update Fee
    user.performance_fee_percentage = payload.performance_fee_percentage
    db.commit()
    
    return {"status": "success", "new_fee_percentage": user.performance_fee_percentage}
```

## 3. Endpoint: `POST /fund-status/update-value`

**Purpose:** Registers the new total value of the fund, calculates the new Net Asset Value (NAV), and subsequently iterates over all investors to evaluate and execute performance fees if they surpassed their personalized High Water Mark (HWM) + SPY hurdle.

### Mathematical Logic for Fees
*   **Hurdle Price:** `HWM_NAV * (1 + SPY_Return)`
*   **Excess Profit per Unit:** `New_NAV - Hurdle_Price`
*   **Total Fiat Fee:** `Excess_Profit_per_Unit * Investor_Units * Fee_Percentage`
*   **Units to Deduct:** `Total_Fiat_Fee / New_NAV`

### Pseudocode

```python
@router.post("/fund-status/update-value")
def update_fund_value_and_process_hwm(payload: FundValueUpdate, db: Session = Depends(get_db)):
    # 1. Verify caller is Admin
    verify_admin_access()
    
    # 2. Calculate New NAV
    total_outstanding_units = db.query(func.sum(User.current_units)).scalar()
    new_nav = payload.total_value / total_outstanding_units
    
    # 3. Save New Fund Status (NAV record)
    new_status = FundStatus(
        total_value=payload.total_value,
        nav_per_unit=new_nav,
        date=payload.effective_date
    )
    db.add(new_status)
    db.flush() # Get the new status ID if needed
    
    # 4. Fetch the Admin/Manager user (to receive the fee units)
    manager = get_manager_account(db)
    
    # 5. Process HWM and Fees for all Investors
    investors = db.query(User).filter(User.is_admin == False).all()
    
    for investor in investors:
        # If the user has 0 units or 0% fee, skip
        if investor.current_units <= 0 or investor.performance_fee_percentage <= 0:
            continue
            
        # Fetch SPY performance from user's last HWM date to the effective_date
        # If user has no previous fee deduction, use their initial deposit date or fund inception date
        spy_start_date = investor.last_hwm_date
        spy_end_date = payload.effective_date
        
        spy_return = fetch_spy_return(spy_start_date, spy_end_date) # Uses yfinance
        
        # Calculate the Hurdle Price based on SPY
        hurdle_price = investor.hwm_nav * (1 + spy_return)
        
        # Check if New NAV exceeds the Hurdle Price
        if new_nav > hurdle_price:
            # Calculate Excess
            excess_profit_per_unit = new_nav - hurdle_price
            
            # Calculate Total Fiat Fee for this user
            total_fiat_fee = excess_profit_per_unit * investor.current_units * investor.performance_fee_percentage
            
            # Convert Fiat Fee to Units at the NEW NAV price
            fee_units = total_fiat_fee / new_nav
            
            # Execute Transfer
            investor.current_units -= fee_units
            manager.current_units += fee_units
            
            # Update User's HWM
            investor.hwm_nav = new_nav
            investor.last_hwm_date = payload.effective_date
            
            # Log to Fee Ledger
            fee_log = FeeLedger(
                user_id=investor.id,
                old_hwm_nav=hurdle_price / (1 + spy_return), # The base HWM used
                new_hwm_nav=new_nav,
                spy_return=spy_return,
                excess_profit_per_unit=excess_profit_per_unit,
                units_transferred=fee_units,
                fiat_fee_value=total_fiat_fee,
                date=payload.effective_date
            )
            db.add(fee_log)
            
    # 6. Commit all changes atomically
    db.commit()
    
    return {
        "status": "success", 
        "new_nav": new_nav, 
        "message": "NAV updated and HWM fees processed."
    }
```

## Database Schema Updates Needed
The `users` table requires the following fields to support this logic:
*   `hwm_nav` (float): The NAV at which the user last paid a performance fee (or the NAV at their initial deposit).
*   `last_hwm_date` (date): The date the `hwm_nav` was set (used as the start date for the SPY fetch).
*   `performance_fee_percentage` (float): Configurable fee rate (e.g., `0.50` for 50%).
