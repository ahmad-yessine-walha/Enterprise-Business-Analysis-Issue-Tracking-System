import bcrypt as _bcrypt
import random
from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.models import User, Department, Issue, Comment, IssueHistory, SLARule, RoleEnum, PriorityEnum, StatusEnum


def get_password_hash(password: str) -> str:
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if we already seeded
    if db.query(Department).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding database...")

    # Departments
    departments_data = ["IT", "HR", "Finance", "Operations", "Customer Service", "Data & Reporting"]
    departments = []
    for name in departments_data:
        dept = Department(name=name)
        db.add(dept)
        departments.append(dept)
    db.commit()
    for d in departments:
        db.refresh(d)

    # SLA Rules
    sla_data = [
        (PriorityEnum.critical, 4.0),
        (PriorityEnum.high, 24.0),
        (PriorityEnum.medium, 72.0),
        (PriorityEnum.low, 168.0),
    ]
    for p, hours in sla_data:
        db.add(SLARule(priority=p, target_resolution_hours=hours))

    # Users
    users = []

    # Create Manager User for UI tests
    manager = User(
        name="Alice Manager", email="manager@example.com",
        password_hash=get_password_hash("manager123"), role=RoleEnum.manager,
        department_id=departments[0].id
    )
    db.add(manager)

    # Create Agent User
    agent = User(
        name="Bob Agent", email="agent@example.com",
        password_hash=get_password_hash("agent123"), role=RoleEnum.agent,
        department_id=departments[0].id
    )
    db.add(agent)

    # Create Employee User
    employee = User(
        name="Charlie Employee", email="employee@example.com",
        password_hash=get_password_hash("employee123"), role=RoleEnum.employee,
        department_id=departments[2].id
    )
    db.add(employee)

    # Random Employees & Agents
    for i in range(10):
        u = User(
            name=f"User {i}",
            email=f"user{i}@example.com",
            password_hash=get_password_hash("password"),
            role=random.choice([RoleEnum.employee, RoleEnum.employee, RoleEnum.agent]),
            department_id=random.choice(departments).id
        )
        db.add(u)
        users.append(u)

    db.commit()

    all_users = db.query(User).all()
    reporters = [u for u in all_users if u.role == RoleEnum.employee]
    agents = [u for u in all_users if u.role == RoleEnum.agent]

    # Issues
    categories = ["Hardware", "Software", "Access", "Payroll", "Benefits", "Reporting", "Process", "Other"]
    issue_titles = [
        "VPN connection dropping repeatedly",
        "Email client crashes on startup",
        "Printer on floor 2 not responding",
        "Payroll export missing overtime entries",
        "CRM login blocked for sales team",
        "Dashboard KPI figures out of date",
        "Network drive inaccessible from remote",
        "Software license expiring this week",
        "New employee laptop not provisioned",
        "Customer complaint portal down",
        "Database backup job failed overnight",
        "Access card not working for server room",
        "HR system slow during peak hours",
        "Incorrect tax codes on payslips",
        "Customer data export format incorrect",
        "Antivirus flagging internal tool as threat",
        "ERP module throwing validation error",
        "Report scheduled job not sending emails",
        "Teams meetings dropping mid-call",
        "Onboarding checklist missing new starter",
    ]

    now = datetime.utcnow()

    for i in range(50):
        created = now - timedelta(days=random.randint(1, 30), hours=random.randint(1, 24))
        status = random.choices(
            [StatusEnum.open, StatusEnum.in_progress, StatusEnum.pending, StatusEnum.resolved, StatusEnum.closed],
            weights=[20, 20, 10, 30, 20]
        )[0]

        reporter = random.choice(reporters)
        assignee = random.choice(agents) if agents and status != StatusEnum.open else None

        priority = random.choices(
            [PriorityEnum.low, PriorityEnum.medium, PriorityEnum.high, PriorityEnum.critical],
            weights=[40, 40, 15, 5]
        )[0]

        issue = Issue(
            title=issue_titles[i % len(issue_titles)],
            description=f"Reported by {reporter.name} in {reporter.department_id} department. "
                        f"This issue is affecting operations and needs to be addressed promptly.",
            category=random.choice(categories),
            priority=priority,
            status=status,
            reporter_id=reporter.id,
            assignee_id=assignee.id if assignee else None,
            department_id=reporter.department_id,
            created_at=created,
            updated_at=created + timedelta(hours=random.randint(1, 48))
        )

        if priority == PriorityEnum.critical:
            issue.due_date = created + timedelta(hours=4)
        elif priority == PriorityEnum.high:
            issue.due_date = created + timedelta(hours=24)
        elif priority == PriorityEnum.medium:
            issue.due_date = created + timedelta(hours=72)
        else:
            issue.due_date = created + timedelta(hours=168)

        if status in [StatusEnum.resolved, StatusEnum.closed]:
            resolved_time = created + timedelta(hours=random.randint(1, 100))
            issue.resolved_at = resolved_time
            issue.updated_at = resolved_time

        db.add(issue)
        db.flush()  # get ID

        # History
        h1 = IssueHistory(
            issue_id=issue.id, user_id=reporter.id,
            field_changed="status", old_value=None, new_value=StatusEnum.open.value,
            changed_at=created
        )
        db.add(h1)

        if status != StatusEnum.open and assignee:
            assigned_time = created + timedelta(minutes=random.randint(10, 60))
            h2 = IssueHistory(
                issue_id=issue.id, user_id=assignee.id,
                field_changed="status", old_value=StatusEnum.open.value, new_value=StatusEnum.in_progress.value,
                changed_at=assigned_time
            )
            db.add(h2)
            c = Comment(issue_id=issue.id, user_id=assignee.id, content="Looking into this now.", created_at=assigned_time)
            db.add(c)

        if status in [StatusEnum.resolved, StatusEnum.closed] and assignee:
            h3 = IssueHistory(
                issue_id=issue.id, user_id=assignee.id,
                field_changed="status", old_value=StatusEnum.in_progress.value, new_value=StatusEnum.resolved.value,
                changed_at=issue.resolved_at
            )
            db.add(h3)
            c2 = Comment(
                issue_id=issue.id, user_id=assignee.id,
                content="Issue has been resolved. Closing after verification period.",
                created_at=issue.resolved_at
            )
            db.add(c2)

    db.commit()
    db.close()
    print("Seeding complete! Demo credentials:")
    print("  Manager:  manager@example.com / manager123")
    print("  Agent:    agent@example.com / agent123")
    print("  Employee: employee@example.com / employee123")


if __name__ == "__main__":
    seed()
