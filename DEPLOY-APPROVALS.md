# HRMS two-level approval update

Prepared from the supplied hrms.zip and the locally available editable frontend.
Not deployed to IIS or tested against the live database.

## HRMS workspace interface refresh

The administration panel now uses a unified control-center layout inspired by modern HR platforms: icon-based modules, a responsive desktop sidebar/mobile navigation strip, operational quick links, live status, refresh controls, and clearer workforce KPI cards. The design is an original adaptation and does not copy third-party branding or artwork.

## Policy
- New requests: Sick, Personal, Vacation, Emergency, Funeral.
- Personal/Vacation/Emergency deduct annual days, Sick deducts sick days.
- New employees default to 24 annual and 6 sick days. Existing remaining balances are preserved. HR can set remaining balances in Admin > Leave.
- Funeral and excuses deduct no leave days.
- Each excuse lasts exactly two hours within a single day.
- Two excuses per employee per requested calendar month; rejected and pending requests count too. Requests cannot be deleted to recover quota.
- Direct manager decides first; only then may the assigned general manager decide. Applicant and approvers must be three distinct active employees. Administrators cannot bypass approval.
- Approvers are recorded at submission, so later settings changes affect new requests.
- Final approval atomically updates the request, audit history and balance in one MongoDB account document using optimistic concurrency. Works without a MongoDB replica set.
- Leave days are inclusive calendar days, retaining the previous report convention (weekends are counted).

## Install
1. Back up the IIS site and MongoDB database. Preserve the production .env and web.config.
2. Stop only the hrms application pool during the update.
3. Copy the CONTENTS of `site` into `C:\inetpub\wwwroot\hrms`, replacing matching files. No npm install or APK rebuild is required; existing node_modules are used.
4. Start the hrms pool and check /api/health. Refresh/reopen the mobile application.
5. Admin > Settings > Two-level approval settings: select the general manager and save.
6. Admin > Settings > Direct manager per employee: select an employee, select their direct manager, and save. Repeat for other employees. Core HR also retains its existing manager field.
7. Employees and managers use Leave > Leave and excuses. Managers see 'Waiting for my decision'.
8. Test with three different accounts: employee submits; direct manager approves (still Pending); general manager approves (Approved and balance deducted).

## Historical records
Existing Leave collection records are retained as read-only history. Old pending requests must be resubmitted under the new process; they are not silently approved or converted from WFH to another category. New requests live in RequestAccount documents, so old direct status-update endpoints cannot bypass approval. Existing cleanup scripts targeting Leave do not erase the new request audit or excuse quota.

## Verification and limits
Seven Node tests exercise the policy, route decisions, and bulk balance update using mocked persistence; the actual database and phone still require the acceptance check above. Frontend production build and modified backend syntax checks pass. Requests are embedded per employee; unusually large historical volumes will eventually need archival that preserves monthly quota/audit data.

## Rollback
Restore the site backup. Retain the new requestaccounts collection: do not drop it or reset balances. If any requests were approved after installing, reconcile those balances before using the older application, whose Employee balance fields do not include the new deductions.

The `frontend-source` folder is editable source, not IIS content. The `tests` folder contains the checks used for this update.
## Set every employee to the same leave balance

In **Admin → Leave and excuses → Employee balances**, enter the Annual and Sick values under **Set everyone to the same balance**, then confirm the update. This replaces every employee's remaining balance; it does not add days to the existing values.
