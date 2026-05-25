# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Spring Boot backend and Vite/React frontend.

- `backend/`: Java 21 Spring Boot app under `src/main/java/com/odoomaster/ticketing/`, organized by `controller`, `service`, `repository`, `domain`, `dto`, `security`, and `config`. Flyway migrations live in `src/main/resources/db/migration/`.
- `frontend/`: React 18 app. Route screens are in `src/pages/`, shared UI in `src/components/`, API access in `src/services/`, auth state in `src/store/`, and helpers in `src/utils/`.
- `docs/`: architecture, API, ADR, security, testing, and process documentation.
- `tests/smoke/`: shell smoke tests for deployed or locally running services.
- `lb/`: load balancer configuration.

## Build, Test, and Development Commands

- `docker-compose -f docker-compose.dev.yml up --build`: run MySQL, backend, and frontend for local development.
- `cd backend && mvn clean package`: compile, test, and package the backend.
- `cd backend && mvn test`: run backend unit and integration tests.
- `cd frontend && npm install`: install frontend dependencies.
- `cd frontend && npm run dev`: start the Vite dev server.
- `cd frontend && npm run build`: create a production frontend build.
- `bash tests/smoke/main.sh`: run smoke checks when the stack is available.

## Coding Style & Naming Conventions

Follow `docs/engineering/coding-standards.md`. Java uses 4-space indentation, constructor injection, service-level `@Transactional`, and layered dependencies: controllers call services, services call repositories. Java classes use `PascalCase`, members use `camelCase`, constants use `SCREAMING_SNAKE_CASE`, packages are lowercase, and DB columns are `snake_case`.

Frontend code uses functional React components. Name components and pages `PascalCase.jsx`; name services, hooks, and utilities `camelCase.js`. Route HTTP through `frontend/src/services/` and configure API URLs with `VITE_API_BASE_URL`.

## Testing Guidelines

Backend tests use JUnit 5 with Spring Boot Test; place them in `backend/src/test/java`. Name unit tests `<Subject>Test` and integration tests `<Feature>IntegrationTest`; prefer names like `methodName_givenCondition_expectedOutcome`. Business-critical flows such as seat locking, idempotency, QR uniqueness, and auth need real tests, not only mocks. Frontend test tooling is planned in `docs/quality/test-strategy.md`.

## Commit & Pull Request Guidelines

Use Conventional Commits, matching the existing history: `feat(tickets): paginate My Tickets`, `fix(auth): localise login branch`, `docs: update setup instructions`. Keep subjects lowercase, imperative, under 72 characters, and without a trailing period.

Pull requests should describe the change, link related issues or docs, list tests run, and include screenshots for UI changes. Keep each PR focused on one concern.

## Security & Configuration Tips

Never commit real `.env` files, JWT secrets, database passwords, tokens, or production data. Start from `.env.example` files and keep environment-specific overrides local.
