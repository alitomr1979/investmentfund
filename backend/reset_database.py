"""
Production Preparation: Database Data Cleanup Script

Usage:
    # Option 1: Clean all test transactions and NAV history, but keep User accounts
    python reset_database.py --keep-users

    # Option 2: Full clean slate (deletes all data so you can run the Setup Admin wizard on fresh launch)
    python reset_database.py --full-reset
"""

import sys
import argparse
from decimal import Decimal
import datetime
from database import engine, SessionLocal
import models

def reset_database(keep_users: bool = False):
    db = SessionLocal()
    try:
        print("--- Starting Production Preparation Cleanup ---")
        
        # Delete child tables first to respect Foreign Keys
        print("Clearing Fee Ledger...")
        db.query(models.FeeLedger).delete()
        
        print("Clearing Audit Logs...")
        db.query(models.AuditLog).delete()
        
        print("Clearing Transactions...")
        db.query(models.Transaction).delete()
        
        print("Clearing NAV History...")
        db.query(models.FundStatus).delete()
        
        if not keep_users:
            print("Clearing All Users...")
            db.query(models.User).delete()
            db.commit()
            print("Database is completely empty. Start the app to set up Master Admin!")
        else:
            print("Resetting User balances and units to 0.00...")
            users = db.query(models.User).all()
            for u in users:
                u.total_units = Decimal("0.0")
                u.high_water_mark = Decimal("100.0")
                u.hwm_date = datetime.datetime.utcnow()
            
            # Re-initialize starting NAV at $100.00 for Day 1
            initial_status = models.FundStatus(
                total_value=Decimal("0.0"),
                total_units=Decimal("0.0"),
                nav_per_unit=Decimal("100.0"),
                last_updated=datetime.datetime.utcnow()
            )
            db.add(initial_status)
            db.commit()
            print("Database reset successfully! Users retained with 0 balance. Starting NAV initialized at $100.00.")
            
    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean database for production")
    parser.add_argument("--keep-users", action="store_true", help="Keep user profiles but clear financial history")
    parser.add_argument("--full-reset", action="store_true", help="Wipe all data completely for a clean slate")
    
    args = parser.parse_args()
    if args.full_reset:
        reset_database(keep_users=False)
    elif args.keep_users:
        reset_database(keep_users=True)
    else:
        print("Please specify --keep-users or --full-reset")
