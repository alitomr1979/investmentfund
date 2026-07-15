from pydantic import BaseModel
class FundStatusResponse(BaseModel):
    id: int

    class Config:
        orm_mode = True
