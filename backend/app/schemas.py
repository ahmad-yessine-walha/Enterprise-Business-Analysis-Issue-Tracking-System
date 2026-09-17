from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import RoleEnum, PriorityEnum, StatusEnum

# Users
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleEnum
    department_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Departments
class DepartmentBase(BaseModel):
    name: str

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

# Issues
class IssueBase(BaseModel):
    title: str
    description: str
    category: str
    priority: PriorityEnum

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[StatusEnum] = None
    assignee_id: Optional[int] = None

class IssueResponse(IssueBase):
    id: int
    status: StatusEnum
    reporter_id: int
    assignee_id: Optional[int]
    department_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    due_date: Optional[datetime]
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

# Comments
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    issue_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard
class KPIDashboard(BaseModel):
    total_issues: int
    open_issues: int
    resolved_issues: int
    critical_issues: int
    avg_resolution_time_hours: float
    resolution_rate: float

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[RoleEnum] = None
