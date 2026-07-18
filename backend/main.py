from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from decimal import Decimal
import models, schemas
from database import engine, get_db
import calculation_engine

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
    
    calculation_engine.process_hwm_fees(db, effective_date, new_nav)
    
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
    return calculation_engine.get_investors_summary(db)

@app.get("/reports/executive-dashboard")
def executive_dashboard(db: Session = Depends(get_db)):
    data = calculation_engine.get_executive_dashboard(db)
    if not data:
        raise HTTPException(status_code=400, detail="Not enough data")
    return data

@app.get("/reports/investor-statement/{user_id}")
def investor_statement(user_id: int, db: Session = Depends(get_db)):
    data = calculation_engine.get_investor_statement(db, user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Investor not found")
    return data

import datetime
from typing import Optional

@app.get("/reports/nav-history")
def nav_history(start_date: Optional[str] = None, end_date: Optional[str] = None, db: Session = Depends(get_db)):
    sd = datetime.datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    data = calculation_engine.get_nav_history(db, sd, ed)
    return data

@app.get("/reports/fund-performance")
def fund_performance(db: Session = Depends(get_db)):
    data = calculation_engine.get_fund_performance_report(db)
    if not data:
        raise HTTPException(status_code=400, detail="Not enough data")
    return data

@app.get("/reports/investor-performance")
def investor_performance_list(db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.total_units > 0).all()
    results = []
    for u in users:
        rep = calculation_engine.get_investor_performance_report(db, u.id)
        if rep:
            results.append(rep)
    return results

@app.get("/reports/investor-performance/{user_id}")
def investor_performance_single(user_id: int, db: Session = Depends(get_db)):
    data = calculation_engine.get_investor_performance_report(db, user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Investor not found or not enough data")
    return data
