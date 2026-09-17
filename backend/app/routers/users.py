from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.routers.deps import get_db, get_current_manager_user
from app.models import User, Department
from app.schemas import UserResponse, DepartmentResponse

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_user)
):
    return db.query(User).order_by(User.name).all()


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_user)
):
    return db.query(Department).order_by(Department.name).all()
