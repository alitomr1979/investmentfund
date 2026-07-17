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
    import yfinance as yf
    import pandas as pd
    import datetime
    
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        status = models.FundStatus(total_value=Decimal("0.0"), total_units=Decimal("0.0"), nav_per_unit=Decimal("100.0"))
    
    new_nav = payload.total_value / status.total_units if status.total_units > Decimal("0.0") else Decimal("100.0")
    effective_date = datetime.datetime.strptime(payload.effective_date, "%Y-%m-%d")
    
    new_status = models.FundStatus(
        total_value=payload.total_value,
        total_units=status.total_units,
        nav_per_unit=new_nav,
        last_updated=effective_date
    )
    db.add(new_status)
    db.flush()
    
    manager = db.query(models.User).filter(models.User.role == "admin").first()
    investors = db.query(models.User).filter(models.User.role == "investor", models.User.total_units > 0).all()
    
    if manager and investors:
        earliest_date = min(user.hwm_date for user in investors).strftime('%Y-%m-%d')
        try:
            spy = yf.download("SPY", start=earliest_date, end=payload.effective_date, progress=False)
            if not spy.empty:
                spy.index = pd.to_datetime(spy.index).tz_localize(None)
                spy_end_val = Decimal(str(spy["Close"].iloc[-1].item()))
                
                for user in investors:
                    if user.performance_fee_percentage <= Decimal("0.0"):
                        continue
                        
                    user_hwm_ts = pd.to_datetime(user.hwm_date).tz_localize(None)
                    valid_spy_starts = spy[spy.index >= user_hwm_ts]
                    
                    if valid_spy_starts.empty:
                        spy_start_val = spy_end_val
                    else:
                        spy_start_val = Decimal(str(valid_spy_starts["Close"].iloc[0].item()))
                        
                    spy_return = (spy_end_val - spy_start_val) / spy_start_val
                    hurdle_price = user.high_water_mark * (Decimal("1.0") + spy_return)
                    
                    if new_nav > hurdle_price:
                        excess_profit_per_unit = new_nav - hurdle_price
                        total_fiat_fee = excess_profit_per_unit * user.total_units * user.performance_fee_percentage
                        fee_units = total_fiat_fee / new_nav
                        
                        user.total_units -= fee_units
                        manager.total_units += fee_units
                        
                        old_hwm = user.high_water_mark
                        user.high_water_mark = new_nav
                        user.hwm_date = effective_date
                        
                        fee_ledger = models.FeeLedger(
                            user_id=user.id,
                            manager_id=manager.id,
                            old_hwm=old_hwm,
                            new_nav=new_nav,
                            spy_return=spy_return,
                            fund_return=(new_nav - old_hwm) / old_hwm,
                            excess_return=(new_nav - hurdle_price) / old_hwm,
                            units_transferred=fee_units,
                            created_at=effective_date
                        )
                        db.add(fee_ledger)
        except Exception as e:
            print("Error processing SPY data", e)

    # Note: total_units might have changed due to fee transfers, but overall fund units remain the same.
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

@app.put("/users/{user_id}/fee")
def update_user_fee(user_id: int, payload: schemas.UserFeeUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.performance_fee_percentage = payload.performance_fee_percentage
    db.commit()
    return {"status": "success", "new_fee_percentage": user.performance_fee_percentage}

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

@app.get("/transactions", response_model=list[schemas.EnrichedTransactionResponse])
def get_transactions(skip: int = 0, limit: int = 25, db: Session = Depends(get_db)):
    txs = db.query(models.Transaction).order_by(models.Transaction.effective_date.desc(), models.Transaction.id.desc()).offset(skip).limit(limit).all()
    
    enriched = []
    for tx in txs:
        user = db.query(models.User).filter(models.User.id == tx.user_id).first()
        
        deposits = db.query(models.Transaction).filter(models.Transaction.user_id == tx.user_id, models.Transaction.transaction_type == "deposit", models.Transaction.id <= tx.id).all()
        withdrawals = db.query(models.Transaction).filter(models.Transaction.user_id == tx.user_id, models.Transaction.transaction_type == "withdrawal", models.Transaction.id <= tx.id).all()
        fees = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == tx.user_id, models.FeeLedger.created_at <= tx.effective_date).all()
        
        total_units = sum(d.units_transacted for d in deposits) - sum(w.units_transacted for w in withdrawals) - sum(f.units_transferred for f in fees)
        running_units = Decimal(str(total_units)) if total_units else Decimal("0.0")
        running_fiat = running_units * tx.nav_at_transaction
        
        enriched.append({
            "id": tx.id,
            "user_id": tx.user_id,
            "transaction_type": tx.transaction_type,
            "amount_fiat": tx.amount_fiat,
            "effective_date": tx.effective_date,
            "units_transacted": tx.units_transacted,
            "nav_at_transaction": tx.nav_at_transaction,
            "system_timestamp": tx.system_timestamp,
            "investor_name": user.name if user else "Unknown",
            "running_balance_units": running_units,
            "running_balance_fiat": running_fiat
        })
        
    return enriched

@app.get("/users/{user_id}/transactions", response_model=list[schemas.EnrichedTransactionResponse])
def get_user_transactions(user_id: int, skip: int = 0, limit: int = 25, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.effective_date.desc(), models.Transaction.id.desc()).offset(skip).limit(limit).all()
    
    enriched = []
    for tx in txs:
        deposits = db.query(models.Transaction).filter(models.Transaction.user_id == tx.user_id, models.Transaction.transaction_type == "deposit", models.Transaction.id <= tx.id).all()
        withdrawals = db.query(models.Transaction).filter(models.Transaction.user_id == tx.user_id, models.Transaction.transaction_type == "withdrawal", models.Transaction.id <= tx.id).all()
        fees = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == tx.user_id, models.FeeLedger.created_at <= tx.effective_date).all()
        
        total_units = sum(d.units_transacted for d in deposits) - sum(w.units_transacted for w in withdrawals) - sum(f.units_transferred for f in fees)
        running_units = Decimal(str(total_units)) if total_units else Decimal("0.0")
        running_fiat = running_units * tx.nav_at_transaction
        
        enriched.append({
            "id": tx.id,
            "user_id": tx.user_id,
            "transaction_type": tx.transaction_type,
            "amount_fiat": tx.amount_fiat,
            "effective_date": tx.effective_date,
            "units_transacted": tx.units_transacted,
            "nav_at_transaction": tx.nav_at_transaction,
            "system_timestamp": tx.system_timestamp,
            "investor_name": user.name,
            "running_balance_units": running_units,
            "running_balance_fiat": running_fiat
        })
        
    return enriched


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
