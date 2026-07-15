from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from decimal import Decimal
import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Family Investment Fund API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Family Investment Fund API"}

@app.get("/fund-status", response_model=schemas.FundStatusResponse)
def get_fund_status(db: Session = Depends(get_db)):
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        status = models.FundStatus(total_value=Decimal("0.0"), total_units=Decimal("0.0"), nav_per_unit=Decimal("100.0"))
        db.add(status)
        db.commit()
        db.refresh(status)
    return status

@app.post("/fund-status/update-value", response_model=schemas.FundStatusResponse)
def update_fund_value(payload: schemas.FundStatusBase, db: Session = Depends(get_db)):
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        status = models.FundStatus(total_value=Decimal("0.0"), total_units=Decimal("0.0"), nav_per_unit=Decimal("100.0"))
    
    new_nav = payload.total_value / status.total_units if status.total_units > Decimal("0.0") else Decimal("100.0")
    
    new_status = models.FundStatus(
        total_value=payload.total_value,
        total_units=status.total_units,
        nav_per_unit=new_nav
    )
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status

@app.post("/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    import datetime
    new_user = models.User(
        name=user.name,
        email=user.email,
        role=user.role,
        total_units=Decimal("0.0"),
        performance_fee_percentage=user.performance_fee_percentage,
        high_water_mark=user.high_water_mark,
        hwm_date=datetime.datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users", response_model=list[schemas.UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/transactions", response_model=schemas.TransactionResponse)
def create_transaction(tx: schemas.TransactionBase, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == tx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        status = models.FundStatus(total_value=Decimal("0.0"), total_units=Decimal("0.0"), nav_per_unit=Decimal("100.0"))
        
    if tx.amount_fiat <= Decimal("0.0"):
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    units = tx.amount_fiat / status.nav_per_unit
    
    if tx.transaction_type == "withdrawal":
        if user.total_units < units:
            raise HTTPException(status_code=400, detail="Insufficient units for withdrawal")
        
        user.total_units -= units
        new_total_units = status.total_units - units
        new_total_value = status.total_value - tx.amount_fiat
    elif tx.transaction_type == "deposit":
        import datetime
        if user.total_units == Decimal("0.0"):
            user.high_water_mark = status.nav_per_unit
            user.hwm_date = tx.effective_date or datetime.datetime.utcnow()
        user.total_units += units
        new_total_units = status.total_units + units
        new_total_value = status.total_value + tx.amount_fiat
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")
        
    # Transaction record
    import datetime
    db_tx = models.Transaction(
        user_id=user.id,
        transaction_type=tx.transaction_type,
        amount_fiat=tx.amount_fiat,
        units_transacted=units,
        nav_at_transaction=status.nav_per_unit,
        effective_date=tx.effective_date or datetime.datetime.utcnow(),
        system_timestamp=datetime.datetime.utcnow()
    )
    
    # New fund status
    # NAV should remain exactly the same during deposits and withdrawals
    new_status = models.FundStatus(
        total_value=new_total_value,
        total_units=new_total_units,
        nav_per_unit=status.nav_per_unit
    )
    
    db.add(db_tx)
    db.add(new_status)
    db.commit()
    db.refresh(db_tx)
    
    return db_tx

@app.get("/transactions", response_model=list[schemas.TransactionResponse])
def get_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.id.desc()).offset(skip).limit(limit).all()

@app.get("/users/{user_id}/transactions", response_model=list[schemas.TransactionResponse])
def get_user_transactions(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.id.desc()).offset(skip).limit(limit).all()

@app.post("/evaluate-performance")
def evaluate_performance(req: schemas.FeeEvaluationRequest, db: Session = Depends(get_db)):
    import yfinance as yf
    import pandas as pd
    import datetime
    
    manager = db.query(models.User).filter(models.User.id == req.manager_id, models.User.role == "admin").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
        
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        raise HTTPException(status_code=400, detail="Fund has no status")
        
    current_nav = status.nav_per_unit
    
    investors = db.query(models.User).filter(models.User.role == "investor", models.User.total_units > 0).all()
    if not investors:
        return {"message": "No investors to evaluate"}
        
    earliest_date = min(user.hwm_date for user in investors).strftime('%Y-%m-%d')
    end_date_parsed = datetime.datetime.strptime(req.end_date, "%Y-%m-%d")
    
    # Fetch SPY data
    try:
        spy = yf.download("SPY", start=earliest_date, end=req.end_date, progress=False)
        if spy.empty:
            raise ValueError("Not enough SPY data for the given dates")
        spy.index = pd.to_datetime(spy.index).tz_localize(None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch SPY data: {str(e)}")
        
    spy_end_val = Decimal(str(spy["Close"].iloc[-1].item()))
    
    fee_records = []
    for user in investors:
        if current_nav > user.high_water_mark:
            user_hwm_ts = pd.to_datetime(user.hwm_date).tz_localize(None)
            valid_spy_starts = spy[spy.index >= user_hwm_ts]
            
            if valid_spy_starts.empty:
                # Fallback to the latest available if HWM date is very recent
                spy_start_val = spy_end_val
            else:
                spy_start_val = Decimal(str(valid_spy_starts["Close"].iloc[0].item()))
                
            spy_return = (spy_end_val - spy_start_val) / spy_start_val
            fund_return = (current_nav - user.high_water_mark) / user.high_water_mark
            excess_return = fund_return - spy_return
            
            if excess_return > Decimal("0.0"):
                profit_excess_per_unit = excess_return * user.high_water_mark
                fee_per_unit = profit_excess_per_unit * user.performance_fee_percentage
                total_fee_fiat = fee_per_unit * user.total_units
                units_to_transfer = total_fee_fiat / current_nav
                
                # Perform the transfer
                user.total_units -= units_to_transfer
                manager.total_units += units_to_transfer
                
                old_hwm = user.high_water_mark
                user.high_water_mark = current_nav
                user.hwm_date = end_date_parsed
                
                fee_ledger = models.FeeLedger(
                    user_id=user.id,
                    manager_id=manager.id,
                    old_hwm=old_hwm,
                    new_nav=current_nav,
                    spy_return=spy_return,
                    fund_return=fund_return,
                    excess_return=excess_return,
                    units_transferred=units_to_transfer
                )
                db.add(fee_ledger)
                fee_records.append(fee_ledger)
                
    db.commit()
    for record in fee_records:
        db.refresh(record)
        
    return {"message": "Evaluation completed", "fees_charged": len(fee_records)}

@app.get("/fee-ledger", response_model=list[schemas.FeeLedgerResponse])
def get_fee_ledger(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.FeeLedger).order_by(models.FeeLedger.id.desc()).offset(skip).limit(limit).all()

@app.get("/users/{user_id}/fees", response_model=list[schemas.FeeLedgerResponse])
def get_user_fees(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.FeeLedger).filter(models.FeeLedger.user_id == user_id).order_by(models.FeeLedger.id.desc()).offset(skip).limit(limit).all()

@app.get("/reports/investors-summary", response_model=schemas.InvestorsSummaryResponse)
def get_investors_summary(db: Session = Depends(get_db)):
    import datetime
    from dateutil.relativedelta import relativedelta
    
    now = datetime.datetime.utcnow()
    date_3m = now - relativedelta(months=3)
    date_1y = now - relativedelta(years=1)
    
    def get_units_at_date(investor_id, target_date):
        deposits = db.query(models.Transaction).filter(models.Transaction.user_id == investor_id, models.Transaction.transaction_type == "deposit", models.Transaction.effective_date <= target_date).all()
        withdrawals = db.query(models.Transaction).filter(models.Transaction.user_id == investor_id, models.Transaction.transaction_type == "withdrawal", models.Transaction.effective_date <= target_date).all()
        fees = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == investor_id, models.FeeLedger.created_at <= target_date).all()
        total = sum(d.units_transacted for d in deposits) - sum(w.units_transacted for w in withdrawals) - sum(f.units_transferred for f in fees)
        return Decimal(str(total)) if total else Decimal("0.0")

    def get_nav_at_date(target_date):
        status = db.query(models.FundStatus).filter(models.FundStatus.last_updated <= target_date).order_by(models.FundStatus.id.desc()).first()
        if status:
            return status.nav_per_unit
        first_status = db.query(models.FundStatus).order_by(models.FundStatus.id.asc()).first()
        return first_status.nav_per_unit if first_status else Decimal("100.0")

    def calculate_dietz(investor_id, start_date, end_date, v_end):
        v_start = get_units_at_date(investor_id, start_date) * get_nav_at_date(start_date)
        cash_flows = db.query(models.Transaction).filter(
            models.Transaction.user_id == investor_id,
            models.Transaction.effective_date > start_date,
            models.Transaction.effective_date <= end_date
        ).all()
        
        net_cf = Decimal("0.0")
        weighted_cf = Decimal("0.0")
        total_days = Decimal(max((end_date - start_date).days, 1))
        
        for cf in cash_flows:
            amount = cf.amount_fiat if cf.transaction_type == "deposit" else -cf.amount_fiat
            net_cf += amount
            weight = Decimal(max((end_date - cf.effective_date).days, 0)) / total_days
            weighted_cf += amount * weight
            
        denominator = v_start + weighted_cf
        if denominator == Decimal("0.0"):
            return Decimal("0.0")
        return (v_end - v_start - net_cf) / denominator

    current_nav = get_nav_at_date(now)
    nav_3m = get_nav_at_date(date_3m)
    nav_1y = get_nav_at_date(date_1y)
    
    fund_gross_3m = (current_nav / nav_3m) - Decimal("1.0") if nav_3m > Decimal("0.0") else Decimal("0.0")
    fund_gross_1y = (current_nav / nav_1y) - Decimal("1.0") if nav_1y > Decimal("0.0") else Decimal("0.0")
    
    investors = db.query(models.User).filter(models.User.role == "investor").all()
    summary_list = []
    
    for inv in investors:
        current_amount = inv.total_units * current_nav
        net_return_3m = calculate_dietz(inv.id, date_3m, now, current_amount)
        net_return_1y = calculate_dietz(inv.id, date_1y, now, current_amount)
        
        summary_list.append({
            "investor_name": inv.name,
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
        
    return {"summary": summary_list}
