# Upgrade Drill Report - 2026-03-05

## Scope
Upgrade rehearsal from currently running beta deployment to a new candidate build from workspace changes, then rollback.

## Baseline
- Baseline listener image (running before drill): `sha256:ed7eaecbad91d777c95e9e88fc5c557940a1d3635f6a9a84042c5441b89df657`
- Baseline web image (running before drill): `sha256:0f14e77dba4f166bf688f3b4a6c50fbfc25532ee8bd19e29ef52c9c46cac5cba`
- Baseline event row count: `1367`
- `.env` had `NODE_ENV=production` and no `API_TOKEN`

## Backup
- Pre-upgrade DB snapshot created:
  - `plans/upgrade-drill/backup-before-upgrade-20260305-111220.sql`

## Candidate Build
Built locally from current workspace:
- `homechronicle-listener:upgrade-drill-20260305-111249`
- `homechronicle-web:upgrade-drill-20260305-111249`

## Upgrade Validation

### Attempt A: Upgrade with no API token (expected fail)
- Action: recreated `listener` and `web` with candidate images and `API_TOKEN` unset.
- Result: listener entered restart loop.
- Log evidence:
  - `[api] API_TOKEN is required when NODE_ENV=production`
- Conclusion: startup guard works and would block production upgrade if token is not configured.

### Attempt B: Upgrade with temporary API token (expected pass)
- Action: recreated `listener` and `web` with candidate images and a temporary `API_TOKEN` env value.
- Result:
  - listener stayed `Up`
  - health probe returned `{"status":"ok",...}`
  - event row count remained `1367`
- Conclusion: upgrade is successful when `API_TOKEN` is configured.

## Rollback Validation

### Attempt A: rollback to baseline sha image references
- Action: attempted recreate using previously captured `sha256:...` image references.
- Result: compose treated them as pullable repository names; rollback failed with pull access error.

### Attempt B: rollback to previous local images
- Action: recreated with:
  - `LISTENER_IMAGE=homechronicle-listener:local`
  - `WEB_IMAGE=homechronicle-web:local`
- Result:
  - listener stayed `Up`
  - health probe returned `{"status":"ok",...}`
  - listener startup logs were clean
  - event row count remained `1367`
- Conclusion: rollback path works with versioned/tagged image references.

## Drill Outcome
- Upgrade safety finding confirmed: **`API_TOKEN` must be set before production upgrade**.
- No observed event table data loss during upgrade/rollback (`1367` before and after).
- Operational note: use explicit rollback tags (not bare sha strings from compose status output).

## Current State After Drill
- Running listener image: `homechronicle-listener:local`
- Running web image: `homechronicle-web:local`
- Running postgres image: `postgres:16-alpine`
