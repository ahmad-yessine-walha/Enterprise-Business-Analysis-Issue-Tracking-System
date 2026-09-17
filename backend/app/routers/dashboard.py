import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.routers.deps import get_db, get_current_manager_user
from app.models import Issue, User, Department, StatusEnum

router = APIRouter()


def _df_from_query(db: Session, query):
    """Execute a SQLAlchemy select statement and return a pandas DataFrame."""
    result = db.execute(query)
    columns = result.keys()
    rows = result.fetchall()
    return pd.DataFrame(rows, columns=list(columns))


@router.get("/kpis")
def get_dashboard_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_manager_user)):
    query = db.query(
        Issue.id, Issue.status, Issue.priority, Issue.created_at, Issue.resolved_at
    ).statement
    df = _df_from_query(db, query)

    if df.empty:
        return {
            "total_issues": 0,
            "open_issues": 0,
            "resolved_issues": 0,
            "critical_issues": 0,
            "avg_resolution_time_hours": 0.0,
            "resolution_rate": 0.0
        }

    total_issues = len(df)
    open_statuses = {StatusEnum.open.value, StatusEnum.in_progress.value, StatusEnum.pending.value}
    resolved_statuses = {StatusEnum.resolved.value, StatusEnum.closed.value}

    open_issues = len(df[df['status'].isin(open_statuses)])
    resolved_issues = len(df[df['status'].isin(resolved_statuses)])
    critical_issues = len(df[(df['priority'] == 'critical') & (~df['status'].isin(resolved_statuses))])

    resolved_df = df.dropna(subset=['resolved_at'])
    if not resolved_df.empty:
        resolution_time = pd.to_datetime(resolved_df['resolved_at']) - pd.to_datetime(resolved_df['created_at'])
        avg_res_time_hours = resolution_time.dt.total_seconds().mean() / 3600
    else:
        avg_res_time_hours = 0.0

    resolution_rate = (resolved_issues / total_issues * 100) if total_issues > 0 else 0

    return {
        "total_issues": int(total_issues),
        "open_issues": int(open_issues),
        "resolved_issues": int(resolved_issues),
        "critical_issues": int(critical_issues),
        "avg_resolution_time_hours": round(float(avg_res_time_hours), 2),
        "resolution_rate": round(float(resolution_rate), 2)
    }


@router.get("/trends")
def get_issue_trends(db: Session = Depends(get_db), current_user: User = Depends(get_current_manager_user)):
    query = db.query(Issue.created_at, Issue.status).statement
    df = _df_from_query(db, query)
    if df.empty:
        return []

    df['date'] = pd.to_datetime(df['created_at']).dt.date
    trend = df.groupby('date').size().reset_index(name='count')
    trend['date'] = trend['date'].astype(str)
    return trend.to_dict(orient="records")


@router.get("/departments")
def get_department_issues(db: Session = Depends(get_db), current_user: User = Depends(get_current_manager_user)):
    rows = db.query(Issue.department_id, Department.name).join(Department, Issue.department_id == Department.id).all()
    if not rows:
        return []
    df = pd.DataFrame(rows, columns=["department_id", "name"])
    dept_counts = df.groupby('name').size().reset_index(name='count')
    return dept_counts.to_dict(orient="records")


@router.get("/priority-breakdown")
def get_priority_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_manager_user)):
    query = db.query(Issue.priority, Issue.status).statement
    df = _df_from_query(db, query)
    if df.empty:
        return []
    breakdown = df.groupby('priority').size().reset_index(name='count')
    return breakdown.to_dict(orient="records")
