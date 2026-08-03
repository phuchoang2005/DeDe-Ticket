# Dề Dê Ticketing — Docker workflow
# Run `make` or `make help` for the list of targets.
#
# Dev stack  : MySQL + hot-reload backend + Vite/Next frontend (no Redis).
# Prod stack : adds Redis; nginx-served frontend; prod Spring profiles.
# On macOS the Docker runtime is colima — use `make colima-start` first if
# `docker` reports it cannot connect.

COMPOSE   ?= docker compose
DEV_FILE  := docker-compose.dev.yml
PROD_FILE := docker-compose.prod.yml
DEV       := $(COMPOSE) -f $(DEV_FILE)
PROD      := $(COMPOSE) -f $(PROD_FILE)

.DEFAULT_GOAL := help
.PHONY: help env \
        colima-start colima-stop \
        dev-up dev-up-d dev-build dev-down dev-logs dev-ps dev-restart db-up \
        prod-up prod-up-d prod-build prod-down prod-logs prod-ps \
        clean

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

env: ## Create .env from .env.example if it does not exist
	@test -f .env || { cp .env.example .env && echo "Created .env from .env.example — review it before starting."; }

# --- Colima (Docker runtime on macOS) ---

colima-start: ## Start the colima VM (Docker runtime)
	colima start

colima-stop: ## Stop the colima VM
	colima stop

# --- Dev stack ---

dev-up: env ## Start the dev stack in the foreground (build + up)
	$(DEV) up --build

dev-up-d: env ## Start the dev stack detached (build + up -d)
	$(DEV) up --build -d

dev-build: ## Build the dev images
	$(DEV) build

dev-down: ## Stop and remove the dev stack
	$(DEV) down

dev-logs: ## Follow the dev stack logs
	$(DEV) logs -f

dev-ps: ## List dev stack containers
	$(DEV) ps

dev-restart: ## Restart just the dev backend
	$(DEV) restart backend

db-up: env ## Start only the dev MySQL (detached)
	$(DEV) up -d mysql

# --- Prod stack ---

prod-up: env ## Start the prod stack in the foreground (build + up)
	$(PROD) up --build

prod-up-d: env ## Start the prod stack detached (build + up -d)
	$(PROD) up --build -d

prod-build: ## Build the prod images
	$(PROD) build

prod-down: ## Stop and remove the prod stack
	$(PROD) down

prod-logs: ## Follow the prod stack logs
	$(PROD) logs -f

prod-ps: ## List prod stack containers
	$(PROD) ps

# --- Housekeeping ---

clean: ## Stop both stacks and remove their volumes (DESTROYS DB data)
	-$(DEV) down -v
	-$(PROD) down -v
