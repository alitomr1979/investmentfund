from sqlalchemy.orm import Session
from decimal import Decimal
import datetime
import pandas as pd
import yfinance as yf
from dateutil.relativedelta import relativedelta
import models

def process_hwm_fees(db: Session, effective_date: datetime.datetime, new_nav: Decimal):
    manager = db.query(models.User).filter(models.User.role == "admin").first()
    investors = db.query(models.User).filter(models.User.total_units > 0).all()
    
    if not manager or not investors:
        return
        
    earliest_date = min(user.hwm_date for user in investors).strftime('%Y-%m-%d')
    try:
        spy = yf.download("SPY", start=earliest_date, end=effective_date.strftime('%Y-%m-%d'), progress=False)
        if not spy.empty:
            spy.index = pd.to_datetime(spy.index).tz_localize(None)
            spy_end_val = Decimal(str(spy["Close"].iloc[-1].item()))
            
            for user in investors:
                if user.performance_fee_percentage <= Decimal("0.0") or user.role == "admin":
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

def get_units_at_date(db: Session, investor_id: int, target_date: datetime.datetime) -> Decimal:
    deposits = db.query(models.Transaction).filter(models.Transaction.user_id == investor_id, models.Transaction.transaction_type == "deposit", models.Transaction.effective_date <= target_date).all()
    withdrawals = db.query(models.Transaction).filter(models.Transaction.user_id == investor_id, models.Transaction.transaction_type == "withdrawal", models.Transaction.effective_date <= target_date).all()
    fees = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == investor_id, models.FeeLedger.created_at <= target_date).all()
    total = sum(d.units_transacted for d in deposits) - sum(w.units_transacted for w in withdrawals) - sum(f.units_transferred for f in fees)
    return Decimal(str(total)) if total else Decimal("0.0")

def get_nav_at_date(db: Session, target_date: datetime.datetime) -> Decimal:
    status = db.query(models.FundStatus).filter(models.FundStatus.last_updated <= target_date).order_by(models.FundStatus.id.desc()).first()
    if status:
        return status.nav_per_unit
    first_status = db.query(models.FundStatus).order_by(models.FundStatus.id.asc()).first()
    return first_status.nav_per_unit if first_status else Decimal("100.0")

def calculate_dietz(db: Session, investor_id: int, start_date: datetime.datetime, end_date: datetime.datetime, v_end: Decimal) -> Decimal:
    v_start = get_units_at_date(db, investor_id, start_date) * get_nav_at_date(db, start_date)
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

def get_investors_summary(db: Session):
    now = datetime.datetime.utcnow()
    date_3m = now - relativedelta(months=3)
    date_1y = now - relativedelta(years=1)
    
    current_nav = get_nav_at_date(db, now)
    nav_3m = get_nav_at_date(db, date_3m)
    nav_1y = get_nav_at_date(db, date_1y)
    
    fund_gross_3m = (current_nav / nav_3m) - Decimal("1.0") if nav_3m > Decimal("0.0") else Decimal("0.0")
    fund_gross_1y = (current_nav / nav_1y) - Decimal("1.0") if nav_1y > Decimal("0.0") else Decimal("0.0")
    
    investors = db.query(models.User).all()
    summary_list = []
    
    for inv in investors:
        current_amount = inv.total_units * current_nav
        net_return_3m = calculate_dietz(db, inv.id, date_3m, now, current_amount)
        net_return_1y = calculate_dietz(db, inv.id, date_1y, now, current_amount)
        
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

def get_executive_dashboard(db: Session):
    status = db.query(models.FundStatus).order_by(models.FundStatus.id.desc()).first()
    if not status:
        return None
        
    current_nav = status.nav_per_unit
    global_aum = status.total_value
    investors_count = db.query(models.User).count()
    
    now = datetime.datetime.utcnow()
    
    # Dates for 4 periods
    first_status = db.query(models.FundStatus).order_by(models.FundStatus.id.asc()).first()
    inception_date = first_status.last_updated if first_status and first_status.last_updated else now
    ytd_date = datetime.datetime(now.year, 1, 1)
    date_3m = now - relativedelta(months=3)
    date_1y = now - relativedelta(years=1)
    date_1m = now - relativedelta(months=1)
    date_1d = now - relativedelta(days=1)
    
    nav_inception = get_nav_at_date(db, inception_date)
    nav_ytd = get_nav_at_date(db, ytd_date)
    nav_1m = get_nav_at_date(db, date_1m)
    nav_1d = get_nav_at_date(db, date_1d)
    nav_3m = get_nav_at_date(db, date_3m)
    nav_1y = get_nav_at_date(db, date_1y)
    
    def calc_ret(nav_past):
        if not nav_past or nav_past == Decimal("0.0"): return Decimal("0.0")
        return (current_nav / nav_past) - Decimal("1.0")
        
    ret_fund_inception = calc_ret(nav_inception)
    ret_fund_ytd = calc_ret(nav_ytd)
    ret_fund_1m = calc_ret(nav_1m)
    ret_fund_1d = calc_ret(nav_1d)
    ret_fund_3m = calc_ret(nav_3m)
    ret_fund_1y = calc_ret(nav_1y)
    
    spy_inception = Decimal("0.0")
    spy_ytd = Decimal("0.0")
    spy_1m = Decimal("0.0")
    spy_1d = Decimal("0.0")
    spy_3m = Decimal("0.0")
    spy_1y = Decimal("0.0")
    
    try:
        start_fetch = min(inception_date, ytd_date, date_1m, date_1d, date_3m, date_1y) - datetime.timedelta(days=10)
        end_fetch = now + datetime.timedelta(days=1)
        spy = yf.download("SPY", start=start_fetch.strftime('%Y-%m-%d'), end=end_fetch.strftime('%Y-%m-%d'), progress=False)
        if not spy.empty:
            spy.index = pd.to_datetime(spy.index).tz_localize(None)
            
            def get_spy_price_at(target):
                valid_dates = spy[spy.index <= target]
                if valid_dates.empty:
                    return Decimal(str(spy["Close"].iloc[0].item()))
                return Decimal(str(valid_dates["Close"].iloc[-1].item()))
            
            spy_curr = get_spy_price_at(now)
            spy_p_inception = get_spy_price_at(inception_date)
            spy_p_ytd = get_spy_price_at(ytd_date)
            spy_p_1m = get_spy_price_at(date_1m)
            spy_p_1d = get_spy_price_at(date_1d)
            spy_p_3m = get_spy_price_at(date_3m)
            spy_p_1y = get_spy_price_at(date_1y)
            
            def calc_spy_ret(spy_past):
                if not spy_past or spy_past == Decimal("0.0"): return Decimal("0.0")
                return (spy_curr / spy_past) - Decimal("1.0")
                
            spy_inception = calc_spy_ret(spy_p_inception)
            spy_ytd = calc_spy_ret(spy_p_ytd)
            spy_1m = calc_spy_ret(spy_p_1m)
            spy_1d = calc_spy_ret(spy_p_1d)
            spy_3m = calc_spy_ret(spy_p_3m)
            spy_1y = calc_spy_ret(spy_p_1y)
    except Exception as e:
        print("Error fetching SPY", e)
        
    days_since_update = (now - status.last_updated).days
    price_missing_alert = days_since_update > 3
    
    return {
        "nav": current_nav,
        "global_aum": global_aum,
        "investors_count": investors_count,
        "price_missing_alert": price_missing_alert,
        "days_since_update": days_since_update,
        "returns": {
            "daily": {"fund": ret_fund_1d, "spy": spy_1d},
            "monthly": {"fund": ret_fund_1m, "spy": spy_1m},
            "quarterly": {"fund": ret_fund_3m, "spy": spy_3m},
            "annual": {"fund": ret_fund_1y, "spy": spy_1y},
            "ytd": {"fund": ret_fund_ytd, "spy": spy_ytd},
            "inception": {"fund": ret_fund_inception, "spy": spy_inception}
        }
    }

def get_investor_statement(db: Session, user_id: int, start_date: datetime.datetime = None, end_date: datetime.datetime = None):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
        
    now = datetime.datetime.utcnow()
    effective_end_date = end_date or now
    
    current_nav = get_nav_at_date(db, effective_end_date)
    
    dep_query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id, models.Transaction.transaction_type == "deposit")
    with_query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id, models.Transaction.transaction_type == "withdrawal")
    fee_query = db.query(models.FeeLedger).filter(models.FeeLedger.user_id == user_id)
    
    if start_date:
        dep_query = dep_query.filter(models.Transaction.effective_date >= start_date)
        with_query = with_query.filter(models.Transaction.effective_date >= start_date)
        fee_query = fee_query.filter(models.FeeLedger.created_at >= start_date)
    if end_date:
        dep_query = dep_query.filter(models.Transaction.effective_date <= end_date)
        with_query = with_query.filter(models.Transaction.effective_date <= end_date)
        fee_query = fee_query.filter(models.FeeLedger.created_at <= end_date)
        
    deposits = dep_query.all()
    withdrawals = with_query.all()
    fees = fee_query.all()
    
    total_contributions = sum(d.amount_fiat for d in deposits)
    total_withdrawals = sum(w.amount_fiat for w in withdrawals)
    
    initial_balance = Decimal("0.0")
    if start_date:
        initial_units = get_units_at_date(db, user_id, start_date - datetime.timedelta(seconds=1))
        initial_nav = get_nav_at_date(db, start_date - datetime.timedelta(seconds=1))
        initial_balance = initial_units * initial_nav
        
    ending_units = get_units_at_date(db, user_id, effective_end_date)
    ending_balance = ending_units * current_nav
    
    total_fees_paid_units = sum(f.units_transferred for f in fees)
    
    net_profit = ending_balance - initial_balance - total_contributions + total_withdrawals
    
    # Get total fund units at end_date for ownership percentage
    status = db.query(models.FundStatus).filter(models.FundStatus.last_updated <= effective_end_date).order_by(models.FundStatus.id.desc()).first()
    total_fund_units = status.total_units if status and status.total_units > Decimal("0.0") else Decimal("1.0")
    ownership_pct = (ending_units / total_fund_units) * Decimal("100.0") if total_fund_units > Decimal("0.0") else Decimal("0.0")
    
    # Percentage Return
    base_capital = initial_balance + total_contributions
    pct_return = (net_profit / base_capital) if base_capital > Decimal("0.0") else Decimal("0.0")
    
    period_str = f"{start_date.strftime('%Y-%m-%d')} to {effective_end_date.strftime('%Y-%m-%d')}" if start_date else f"Inception to {effective_end_date.strftime('%Y-%m-%d')}"
    
    return {
        "investor_id": user.id,
        "investor_name": user.name,
        "investor_email": user.email,
        "reporting_period": period_str,
        "initial_balance": initial_balance,
        "total_contributions": total_contributions,
        "total_withdrawals": total_withdrawals,
        "net_profit": net_profit,
        "ending_balance": ending_balance,
        "units_owned": ending_units,
        "ownership_percentage": ownership_pct,
        "nav_per_unit": current_nav,
        "market_value": ending_balance,
        "total_fees_paid_units": total_fees_paid_units,
        "total_return_usd": net_profit,
        "percentage_return": pct_return
    }

def get_nav_history(db: Session, start_date: datetime.datetime = None, end_date: datetime.datetime = None):
    query = db.query(models.FundStatus)
    if start_date:
        query = query.filter(models.FundStatus.last_updated >= start_date)
    if end_date:
        query = query.filter(models.FundStatus.last_updated <= end_date)
    
    records = query.order_by(models.FundStatus.last_updated.desc()).all()
    history = []
    for r in records:
        history.append({
            "calculation_date": r.last_updated,
            "nav": r.total_value,
            "nav_per_unit": r.nav_per_unit,
            "total_units_outstanding": r.total_units,
            "total_investor_equity": r.total_value,
            "calculation_status": "Finalized",
            "calculation_timestamp": r.last_updated
        })
    return history

def get_fund_performance_report(db: Session):
    dashboard = get_executive_dashboard(db)
    if not dashboard: return None
    
    now = datetime.datetime.utcnow()
    first_status = db.query(models.FundStatus).order_by(models.FundStatus.id.asc()).first()
    inception_date = first_status.last_updated if first_status and first_status.last_updated else now
    
    returns = dashboard["returns"]
    years_since_inception = max((now - inception_date).days / 365.25, 0.001)
    
    cagr = ((Decimal("1.0") + returns["inception"]["fund"]) ** Decimal(str(1 / years_since_inception))) - Decimal("1.0")
    spy_cagr = ((Decimal("1.0") + returns["inception"]["spy"]) ** Decimal(str(1 / years_since_inception))) - Decimal("1.0")
    
    return {
        "daily": {"fund": returns["daily"]["fund"], "spy": returns["daily"]["spy"]},
        "monthly": {"fund": returns["monthly"]["fund"], "spy": returns["monthly"]["spy"]},
        "quarterly": {"fund": returns.get("quarterly", {}).get("fund", Decimal("0.0")), "spy": returns.get("quarterly", {}).get("spy", Decimal("0.0"))},
        "ytd": {"fund": returns["ytd"]["fund"], "spy": returns["ytd"]["spy"]},
        "annual": {"fund": returns.get("annual", {}).get("fund", Decimal("0.0")), "spy": returns.get("annual", {}).get("spy", Decimal("0.0"))},
        "inception": {"fund": returns["inception"]["fund"], "spy": returns["inception"]["spy"]},
        "cagr": {"fund": cagr, "spy": spy_cagr},
        "dollar_return": dashboard["global_aum"] - (first_status.total_value if first_status else Decimal("0.0"))
    }

def get_investor_performance_report(db: Session, user_id: int, start_date: datetime.datetime = None, end_date: datetime.datetime = None):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return None
    
    now = datetime.datetime.utcnow()
    effective_end_date = end_date or now
    
    dep_query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id, models.Transaction.transaction_type == "deposit")
    with_query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id, models.Transaction.transaction_type == "withdrawal")
    
    if start_date:
        dep_query = dep_query.filter(models.Transaction.effective_date >= start_date)
        with_query = with_query.filter(models.Transaction.effective_date >= start_date)
    if end_date:
        dep_query = dep_query.filter(models.Transaction.effective_date <= end_date)
        with_query = with_query.filter(models.Transaction.effective_date <= end_date)
        
    deposits = dep_query.all()
    withdrawals = with_query.all()
    
    total_contributions = sum(d.amount_fiat for d in deposits)
    total_withdrawals = sum(w.amount_fiat for w in withdrawals)
    
    beginning_value = Decimal("0.0")
    start_calc_date = user.created_at
    if start_date:
        initial_units = get_units_at_date(db, user_id, start_date - datetime.timedelta(seconds=1))
        initial_nav = get_nav_at_date(db, start_date - datetime.timedelta(seconds=1))
        beginning_value = initial_units * initial_nav
        start_calc_date = max(start_date, user.created_at)
        
    ending_units = get_units_at_date(db, user_id, effective_end_date)
    nav_at_end = get_nav_at_date(db, effective_end_date)
    ending_value = ending_units * nav_at_end
    
    gain_loss = ending_value - beginning_value - total_contributions + total_withdrawals
    base_for_return = beginning_value + total_contributions
    total_return = (gain_loss / base_for_return) if base_for_return > Decimal("0.0") else Decimal("0.0")
    
    years = max((effective_end_date - start_calc_date).days / 365.25, 0.001)
    annualized_return = ((Decimal("1.0") + total_return) ** Decimal(str(1 / years))) - Decimal("1.0")
    
    return {
        "investor_name": user.name,
        "beginning_value": beginning_value,
        "ending_value": ending_value,
        "net_contributions": total_contributions,
        "net_withdrawals": total_withdrawals,
        "investment_gain_loss": gain_loss,
        "total_return_percentage": total_return,
        "annualized_return_percentage": annualized_return
    }



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

