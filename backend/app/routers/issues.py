from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.routers.deps import get_db, get_current_user
from app.models import Issue, User, IssueHistory, Comment, SLARule, StatusEnum, RoleEnum
from app.schemas import IssueCreate, IssueUpdate, IssueResponse, CommentCreate, CommentResponse

router = APIRouter()

@router.get("/", response_model=List[IssueResponse])
def get_issues(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == RoleEnum.manager:
        issues = db.query(Issue).order_by(desc(Issue.created_at)).offset(skip).limit(limit).all()
    elif current_user.role == RoleEnum.agent:
        issues = db.query(Issue).filter(Issue.department_id == current_user.department_id).order_by(desc(Issue.created_at)).offset(skip).limit(limit).all()
    else:
        issues = db.query(Issue).filter(Issue.reporter_id == current_user.id).order_by(desc(Issue.created_at)).offset(skip).limit(limit).all()
    return issues

@router.post("/", response_model=IssueResponse)
def create_issue(issue: IssueCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sla = db.query(SLARule).filter(SLARule.priority == issue.priority).first()
    due_date = None
    if sla:
        from datetime import timedelta
        due_date = datetime.utcnow() + timedelta(hours=sla.target_resolution_hours)

    new_issue = Issue(
        title=issue.title,
        description=issue.description,
        category=issue.category,
        priority=issue.priority,
        reporter_id=current_user.id,
        department_id=current_user.department_id,
        due_date=due_date
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    # History log
    history = IssueHistory(
        issue_id=new_issue.id,
        user_id=current_user.id,
        field_changed="status",
        old_value=None,
        new_value=StatusEnum.open.value
    )
    db.add(history)
    db.commit()

    return new_issue

@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.put("/{issue_id}", response_model=IssueResponse)
def update_issue(issue_id: int, issue_update: IssueUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    update_data = issue_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        if getattr(db_issue, key) != value:
            # log history
            history = IssueHistory(
                issue_id=db_issue.id,
                user_id=current_user.id,
                field_changed=key,
                old_value=str(getattr(db_issue, key)),
                new_value=str(value)
            )
            db.add(history)
            setattr(db_issue, key, value)

    if "status" in update_data and update_data["status"] in [StatusEnum.resolved, StatusEnum.closed]:
        db_issue.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(db_issue)
    return db_issue

@router.post("/{issue_id}/comments", response_model=CommentResponse)
def add_comment(issue_id: int, comment: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_comment = Comment(
        issue_id=issue_id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@router.get("/{issue_id}/comments", response_model=List[CommentResponse])
def get_comments(issue_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comments = db.query(Comment).filter(Comment.issue_id == issue_id).order_by(Comment.created_at).all()
    return comments
