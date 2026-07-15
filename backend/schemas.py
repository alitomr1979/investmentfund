from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class FundStatusBase(BaseModel):
    total_value: Decimal

class FundStatusResponse(BaseModel):
    id: int
    total_value: Decimal
    total_units: Decimal
    nav_per_unit: Decimal
    last_updated: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: str
    role: str = "investor"
    performance_fee_percentage: Decimal = Decimal("0.50")
    high_water_mark: Decimal = Decimal("100.0")

class UserResponse(UserBase):
    id: int
    total_units: Decimal
    hwm_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    user_id: int
    transaction_type: str
    amount_fiat: Decimal
    effective_date: datetime | None = None

class TransactionResponse(TransactionBase):
    id: int
    units_transacted: Decimal
    nav_at_transaction: Decimal
    system_timestamp: datetime
    effective_date: datetime

    class Config:
        from_attributes = True

class FeeEvaluationRequest(BaseModel):
    manager_id: int
    end_date: str # YYYY-MM-DD

class FeeLedgerResponse(BaseModel):
    id: int
    user_id: int
    manager_id: int
    old_hwm: Decimal
    new_nav: Decimal
    spy_return: Decimal
    fund_return: Decimal
    excess_return: Decimal
    units_transferred: Decimal
    created_at: datetime

    class Config:
        from_attributes = True
