# HRMS Mobile Suite v7

This release adapts the supplied mobile HR reference into the existing HRMS without copying its company branding or demo data.

## Employee mobile experience

- Four primary areas: TMS, Leave, Claim, and Payroll.
- Profile header and slide-out menu for personal, payroll, manager, team, announcement, company, settings, help, administration, and logout views.
- TMS dashboard, attendance log chart, attendance/location timeline, overtime entitlement, and manager team log.
- Leave dashboard, Full Day / Half Day / Time application, calendar, own status, and manager approval queue.
- Approved / Pending / Rejected status views throughout.
- Claim submission with receipt attachment and manager approval.
- Payroll profile and published payslip views.
- Searchable, department-grouped employee and manager lists.

## Existing business rules preserved

- Attendance clock actions remain company-network-only. GPS is displayed when already recorded, but is not required by the redesigned UI.
- Leave and excuses retain direct-manager then general-manager approval.
- Sick uses Sick balance. Personal, Vacation, and Emergency use Annual balance. Funeral deducts no balance.
- Every employee may submit two two-hour excuses per month; rejected requests still count toward the quota.

## Deployment

1. Extract the package on the HRMS server.
2. Confirm `C:\inetpub\wwwroot\hrms\.env` exists. The package intentionally never replaces production secrets.
3. Run PowerShell as Administrator.
4. Run `Set-ExecutionPolicy -Scope Process Bypass`, then run `REPAIR-IISNODE.ps1` from the extracted package.
5. The script backs up the current site, copies this release, validates Node files, applies IIS permissions, restarts the `hrms` application pool, and checks `/api/health`.

The new MongoDB fields are optional and backward-compatible. Populate employee personal/payroll data and company profile/work schedule/overtime values from Administration to replace placeholders.
