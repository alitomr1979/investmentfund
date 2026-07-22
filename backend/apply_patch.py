import os

def append_to_file(filepath, content):
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write("\n" + content + "\n")

calc_content = """
def get_fee_report(db: Session, start_date: datetime.datetime = None, end_date: datetime.datetime = None, user_id: int = None):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return None

    hwm_nav = user.high_water_mark
    hwm_date = user.hwm_date

    fee_query = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == user_id)
    if start_date:
        fee_query = fee_query.filter(models.FeeLedger.created_at >= start_date)
    if end_date:
        fee_query = fee_query.filter(models.FeeLedger.created_at <= end_date)
    fees = fee_query.order_by(models.FeeLedger.created_at.desc()).all()

    now = datetime.datetime.utcnow()
    last_30_days = now - datetime.timedelta(days=30)
    last_30_query = db.query(models.FeeLedger).filter(
        models.FeeLedger.user_id == user_id, 
        models.FeeLedger.created_at >= last_30_days
    ).order_by(models.FeeLedger.created_at.desc()).all()
    
    paid_fees_units = sum(f.units_transferred for f in fees)
    
    paid_fees_usd = Decimal("0.0")
    for f in fees:
        paid_fees_usd += (f.units_transferred * f.new_nav)
        
    last_30_days_fees = []
    for f in last_30_query:
        last_30_days_fees.append({
            "id": f.id,
            "user_id": f.user_id,
            "units_transferred": f.units_transferred,
            "fee_usd": f.units_transferred * f.new_nav,
            "created_at": f.created_at
        })

    current_nav = get_nav_at_date(db, now)

    spy_return = Decimal("0.0")
    if user.hwm_date:
        try:
            spy = yf.download("SPY", start=user.hwm_date.strftime('%Y-%m-%d'), end=(now + datetime.timedelta(days=1)).strftime('%Y-%m-%d'), progress=False)
            if not spy.empty:
                spy.index = pd.to_datetime(spy.index).tz_localize(None)
                valid_spy = spy[spy.index >= user.hwm_date]
                if not valid_spy.empty:
                    spy_start_val = Decimal(str(valid_spy["Close"].iloc[0].item()))
                    spy_end_val = Decimal(str(spy["Close"].iloc[-1].item()))
                    spy_return = (spy_end_val - spy_start_val) / spy_start_val
        except Exception:
            pass

    hurdle_price = user.high_water_mark * (Decimal("1.0") + spy_return)
    
    accrued_fees_usd = Decimal("0.0")
    if current_nav > hurdle_price:
        excess_profit_per_unit = current_nav - hurdle_price
        accrued_fees_usd = excess_profit_per_unit * user.total_units * user.performance_fee_percentage

    investor_statement = get_investor_statement(db, user_id, start_date, end_date)
    net_return_after_fees = investor_statement["percentage_return"] if investor_statement else Decimal("0.0")

    return {
        "hwm_nav": hwm_nav,
        "hwm_date": hwm_date,
        "management_fee": Decimal("0.00"),
        "performance_fee_percentage": user.performance_fee_percentage,
        "paid_fees_units": paid_fees_units,
        "paid_fees_usd": paid_fees_usd,
        "accrued_fees_usd": accrued_fees_usd,
        "net_return_after_fees": net_return_after_fees,
        "last_30_days_fees": last_30_days_fees
    }
"""

main_content = """
@app.get("/settings", response_model=schemas.SystemSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings(fee_collection_frequency="monthly")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@app.put("/settings", response_model=schemas.SystemSettingsResponse)
def update_settings(payload: schemas.SystemSettingsBase, db: Session = Depends(get_db)):
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
    settings.fee_collection_frequency = payload.fee_collection_frequency
    db.commit()
    db.refresh(settings)
    return settings

@app.get("/reports/fee-report", response_model=schemas.FeeReportResponse)
def get_fee_report_api(user_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None, db: Session = Depends(get_db)):
    sd = datetime.datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    
    rep = calculation_engine.get_fee_report(db, sd, ed, user_id)
    if not rep:
        raise HTTPException(status_code=404, detail="User not found")
    return rep
"""

append_to_file(r"C:\Users\aleja\.gemini\antigravity\scratch\investment_fund_app\backend\calculation_engine.py", calc_content)
append_to_file(r"C:\Users\aleja\.gemini\antigravity\scratch\investment_fund_app\backend\main.py", main_content)

print("Patched successfully")
