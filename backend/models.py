from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    investor = "investor"

class TransactionTypeEnum(str, enum.Enum):
    deposit = "deposit"
    withdrawal = "withdrawal"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.investor)
    total_units = Column(Numeric(precision=24, scale=8), default=0.0)
    performance_fee_percentage = Column(Numeric(precision=24, scale=8), default=0.50)
    high_water_mark = Column(Numeric(precision=24, scale=8), default=100.0)
    hwm_date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    transactions = relationship("Transaction", back_populates="user")
    fees_paid = relationship("FeeLedger", foreign_keys="[FeeLedger.user_id]", back_populates="user")
    fees_received = relationship("FeeLedger", foreign_keys="[FeeLedger.manager_id]", back_populates="manager")

class FeeLedger(Base):
    __tablename__ = "fee_ledger"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))
    old_hwm = Column(Numeric(precision=24, scale=8))
    new_nav = Column(Numeric(precision=24, scale=8))
    spy_return = Column(Numeric(precision=24, scale=8))
    fund_return = Column(Numeric(precision=24, scale=8))
    excess_return = Column(Numeric(precision=24, scale=8))
    units_transferred = Column(Numeric(precision=24, scale=8))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="fees_paid")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="fees_received")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    transaction_type = Column(Enum(TransactionTypeEnum))
    amount_fiat = Column(Numeric(precision=24, scale=8))
    units_transacted = Column(Numeric(precision=24, scale=8))
    nav_at_transaction = Column(Numeric(precision=24, scale=8))
    effective_date = Column(DateTime, default=datetime.datetime.utcnow)
    system_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="transactions")

class FundStatus(Base):
    __tablename__ = "fund_status"
    
    id = Column(Integer, primary_key=True, index=True)
    total_value = Column(Numeric(precision=24, scale=8), default=0.0)
    total_units = Column(Numeric(precision=24, scale=8), default=0.0)
    nav_per_unit = Column(Numeric(precision=24, scale=8), default=100.0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
