# SQL HRMS reference analysis and adaptation

Reference reviewed: https://www.sql.com.my/sql-hrms/

## Useful product patterns

- One workspace groups attendance, leave, claims, payroll, and payslips.
- Employee and manager workflows are clearly separated.
- Attendance is presented as a live operational action rather than a passive report.
- Leave combines balances, application status, approvals, summaries, and calendar visibility.
- Managers receive an organization-level view of attendance exceptions and pending work.
- Payroll uses dashboard summaries and reporting to surface errors and save review time.
- The visual system uses a strong hero, pill-shaped actions, simple module cards, generous spacing, and a vivid accent color.

## Applied to this HRMS

- Added a unified HRMS Workspace command bar with live status.
- Added icon-based navigation with descriptive module labels.
- Added a dark operational launchpad for Attendance, Leave, Payroll, and Analytics.
- Enhanced KPI cards for Employees, Managers, Present today, and Pending leave.
- Added a visible refresh action and loading animation.
- Improved desktop sidebar hierarchy and mobile horizontal module navigation.
- Preserved the existing LAN-only clock-in/out rule, ZKTeco integration, two-level leave approval, bulk balance tools, and existing data contracts.

## Deliberately not copied

- SQL branding, artwork, text, screenshots, and proprietary implementation were not copied.
- Geofence and site-photo attendance were not introduced because this HRMS currently requires company-LAN attendance.
- Claims were not added because that requires a separately defined data policy, approval workflow, file retention policy, and accounting integration.

