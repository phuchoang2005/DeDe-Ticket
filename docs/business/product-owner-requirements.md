* **Project Code:** ITPJ2602
* **Description:** ONLINE EVENT MANAGEMENT & TICKETING SYSTEM
* **Type:** Web Application and 01 Simple Mobile App Module (Ticket Checking)

### 2.1. Introduction

Event organizers are currently facing difficulties in controlling counterfeit tickets, system overloads during flash sales, and a lack of data for analyzing customer behavior. A fast-growing startup named "Dề Dê" organizes an average of 15–20 events per year, including concerts, seminars, and workshops. Ticket sales are currently conducted via Facebook and manual bank transfers.

**Consequences:**

* Appearance of counterfeit tickets
* Inability to manage seat inventory
* System crashes during peak sales hours
* Lack of customer behavior data

### 2.2. Business Problems

* Revenue loss due to counterfeit tickets
* System overload during opening sales hours
* Slow ticket-checking process at the gates
* Lack of analytical reports

### 2.3. Project Objectives

* The system must support 10,000 concurrent users (simulated)
* Response time < 2 seconds
* Ticket-checking time < 5 seconds/person
* Increase ticket sales revenue by 20%

### 2.4. Constraints & Special Requirements

* Timeline: 5 months
* Budget: 1.5 billion VND
* Team size: 5 members
* Must include basic anti-fraud solutions
* The ticket-checking app must be capable of short-term offline operation
* The system must feature a retry mechanism for failed payments
* Deployment & Delivery Approach (Suggested): Incremental / Iterative. Project Management Methodology: Scrum

### 2.5. Business Scope

* The ticketing system is expected to serve multiple concurrent events.
* Event creation & management
* Dynamic seating chart
* Online payment (simulated)
* QR Code generation
* Mobile app for ticket scanning
* Ticket sales and revenue reports

### 2.6. Success Criteria

The project is considered successful when:

* The system does not crash during a simulated access of 10,000 concurrent users
* Ticket-checking time is < 5 seconds/person
* No duplicate QR codes are generated
* Successful payment transaction rate > 98%
* The system can manage a minimum of 50,000 tickets for a single event

### 2.6.1. QA/QC Acceptance Mapping

Each success criterion must be backed by an automated or repeatable QA/QC check before release:

| Success criterion | QA/QC evidence |
|---|---|
| 10,000 concurrent users without crash | Staging k6 golden-hour run from `docs/quality/nfr-load-test-plan.md` Scenario C |
| Ticket-checking time < 5 seconds/person | Offline check-in surge test from Scenario F plus integration tests for duplicate scans |
| No duplicate QR codes | Backend invariant tests and post-load SQL checks for duplicate `TICKETS.qr_code` |
| Payment transaction success rate > 98% | Payment retry integration tests plus payment-burst load test Scenario D |
| 50,000 tickets for a single event | Staging seed and load test event containing 50,000 `EVENT_SEATS` |

Pull requests are guarded by the QA/QC pipeline in `docs/quality/test-strategy.md` §7.1. Release candidates require the staging smoke, E2E, and load checks described in `docs/quality/nfr-load-test-plan.md`.

The PR-level automated suite is expanded toward about 500 fast cases with priority on concurrency reliability: seat contention, duplicate QR/check-in handling, payment retry sequencing, load-balancer script guardrails, and browse/checkout frontend state formatting. This gives early feedback before the heavier 10,000-user and 50,000-ticket staging tests run.

### 2.7. Management Challenges

* Security risks
* Overload risks
* Payment Gateway integration
* Managing scope creep when the marketing team requests additional features

### 2.8. Initial Risk Scenarios

* Bot attacks during ticket launch
* Duplicate QR code errors
* System overload
* Users are charged but do not receive their tickets
* Ticket fraud at the checking gates

### 2.9. Assumptions

* The payment gateway provides a sandbox/mock API
* Customers use smartphones
* Stable internet connection at the event venue
* 50,000 tickets/event
* 10,000 concurrent users
* 5,000 transactions/day
