# QA/QC Pipeline Result - 2026-05-26

## Summary

Status: **PASS**

The QA/QC pipeline was executed on the `my-ec2` host because the local workstation does not have Maven, npm, or Docker available. The EC2 environment also does not install Maven or npm directly; the repository pipeline used its Docker fallbacks for both backend and frontend execution.

Command:

```bash
cd ~/online-event-management-ticketing-system
bash tests/ci/local-qa.sh
```

Execution host: `my-ec2`

Pipeline script: `tests/ci/local-qa.sh`

Observed completion time: `2026-05-26T08:53:05Z` for backend Maven verify; frontend test and build completed immediately after.

## Test Totals

| Layer | Command | Result | Cases |
|---|---|---:|---:|
| Backend QA | `mvn verify` inside `maven:3.9.6-eclipse-temurin-21` | Passed | 691 |
| Frontend unit QA | `npm run test` inside `node:20-alpine` | Passed | 524 |
| Frontend production build | `npm run build` inside `node:20-alpine` | Passed | N/A |
| Total executable test cases | Backend + frontend tests | Passed | 1,215 |

The requested 500 diverse-case target was exceeded by 715 executable cases.

## Backend Result

Maven reported:

```text
Tests run: 691, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Executed backend suites:

| Suite | Cases | Result |
|---|---:|---|
| `FeedbackServiceTest` | 14 | Passed |
| `OrderServiceReliabilityTest` | 27 | Passed |
| `ReliabilityMatrixTest` | 604 | Passed |
| `CheckInServiceReliabilityTest` | 13 | Passed |
| `PaymentRetryServiceReliabilityTest` | 6 | Passed |
| `NotificationServiceReliabilityTest` | 16 | Passed |
| `SeatLockSweeperJobTest` | 4 | Passed |
| `FeedbackControllerSmokeTest` | 7 | Passed |

Coverage focus from the executed backend matrix includes order reliability, feedback handling, check-in behavior, payment retry sequencing, notification reliability, seat-lock sweeping, and controller smoke coverage.

## Frontend Result

Vitest reported:

```text
Test Files  2 passed (2)
Tests       524 passed (524)
```

Executed frontend suites:

| Suite | Cases | Result |
|---|---:|---|
| `src/utils/format.test.js` | 48 | Passed |
| `src/utils/reliabilityMatrix.test.js` | 476 | Passed |

Frontend production build reported:

```text
vite v5.4.21 building for production...
111 modules transformed.
built in 3.44s
```

## QA Notes

- Docker fallback behavior worked as designed for both Maven and npm execution.
- Backend Maven emitted a warning that `maven-compiler-plugin` has no explicit plugin version in `backend/pom.xml`.
- Frontend `npm ci` reported 4 moderate-severity dependency vulnerabilities. This did not fail the current pipeline, but it should be tracked separately with `npm audit` review before release.
- Smoke tests requiring a deployed `BASE_URL` and manual k6 load tests were not part of `tests/ci/local-qa.sh`; this report covers the implemented local QA/QC pipeline.

