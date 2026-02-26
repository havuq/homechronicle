---
name: GA Exit Checklist
about: Track production-readiness criteria to exit beta
title: "GA Exit Checklist"
labels: "release,ga"
assignees: ""
---

## Scope

- Target release: <!-- e.g. v1.0.0 -->
- Owner:
- Target date:

## Exit Criteria

### 1) Security
- [ ] Role/scoped auth implemented (`admin`, `read`)
- [ ] All write routes enforce scope checks
- [ ] Secret/token handling documented and verified

Pass condition:
- All write endpoints reject missing/incorrect scope.

### 2) Data Safety
- [ ] Backup/export implemented
- [ ] Restore/import implemented
- [ ] Restore drill completed on clean environment
- [ ] Retention behavior verified (default + overrides)

Pass condition:
- Restore drill is successful with no data loss for expected fields.

### 3) Reliability (14-day stability window)
- [ ] Ingest availability >= 99.5%
- [ ] Alert dispatch success >= 99% (excluding remote receiver failures)
- [ ] Reconnect recovery <= 60s p95
- [ ] No crash loops / unbounded retries in listener logs

Pass condition:
- SLOs are measured and met for 14 consecutive days.

### 4) Release and Migration Safety
- [ ] Upgrade path tested across last 2 releases
- [ ] Migrations are idempotent
- [ ] Roll-forward/rollback procedures documented

Pass condition:
- Upgrades complete without manual DB fixups.

### 5) Test and CI Gates
- [ ] CI blocks merge on failing tests
- [ ] Listener integration tests cover alerts/retention/setup core flows
- [ ] Web smoke test includes critical tabs/flows
- [ ] Full-stack smoke check documented/run

Pass condition:
- Required suites are green on default branch.

### 6) Product Completeness
- [ ] Sprint 1 complete
- [ ] Sprint 2 complete
- [ ] Sprint 4 backup/restore complete
- [ ] Open P1 bugs = 0
- [ ] P2 bugs triaged with workarounds or planned fixes

Pass condition:
- No known blockers for production use.

### 7) Operations and Supportability
- [ ] Health diagnostics documented
- [ ] Incident runbook exists (discovery, pairing, DB growth, alerts failure)
- [ ] Upgrade and secure deployment docs are current

Pass condition:
- On-call/support can recover common incidents from docs alone.

### 8) Launch Controls
- [ ] GA decision owner(s) identified
- [ ] Changelog and release notes process defined
- [ ] Post-GA hotfix SLA defined

Pass condition:
- Launch decision and support policy are explicit.

## Evidence

- Dashboards/metrics:
- Restore drill artifact:
- CI run links:
- Upgrade test notes:
- Security verification notes:

## Decision

- [ ] Approved for GA
- Decision date:
- Approver(s):
- Notes:

