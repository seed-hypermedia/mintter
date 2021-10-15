PKG := github.com/lightninglabs/lndclient

LINT_PKG := github.com/golangci/golangci-lint/cmd/golangci-lint

GO_BIN := ${GOPATH}/bin
LINT_BIN := $(GO_BIN)/golangci-lint

LINT_COMMIT := v1.18.0

DEPGET := cd /tmp && go get -v
GOBUILD := go build -v
GOINSTALL := go install -v
GOTEST := go test -v

GOFILES_NOVENDOR = $(shell find . -type f -name '*.go' -not -path "./vendor/*")
GOLIST := go list -deps $(PKG)/... | grep '$(PKG)'| grep -v '/vendor/'

COMMIT := $(shell git describe --abbrev=40 --dirty)
LDFLAGS := -X $(PKG).Commit=$(COMMIT)

RM := rm -f
CP := cp
MAKE := make
XARGS := xargs -L 1

# Linting uses a lot of memory, so keep it under control by limiting the number
# of workers if requested.
ifneq ($(workers),)
LINT_WORKERS = --concurrency=$(workers)
endif

LINT = $(LINT_BIN) run -v $(LINT_WORKERS)

GREEN := "\\033[0;32m"
NC := "\\033[0m"
define print
	echo $(GREEN)$1$(NC)
endef

default: build

all: build check install

# ============
# DEPENDENCIES
# ============
$(LINT_BIN):
	@$(call print, "Fetching linter")
	$(DEPGET) $(LINT_PKG)@$(LINT_COMMIT)

# ============
# INSTALLATION
# ============

build:
	@$(call print, "Building lndclient.")
	$(GOBUILD) -ldflags="$(LDFLAGS)" $(PKG)

# =======
# TESTING
# =======

check: unit

unit:
	@$(call print, "Running unit tests.")
	$(GOTEST) ./...

unit-race:
	@$(call print, "Running unit race tests.")
	env CGO_ENABLED=1 GORACE="history_size=7 halt_on_errors=1" $(GOTEST) -race ./...

# =========
# UTILITIES
# =========
fmt:
	@$(call print, "Formatting source.")
	gofmt -l -w -s $(GOFILES_NOVENDOR)

lint: $(LINT_BIN)
	@$(call print, "Linting source.")
	$(LINT)

.PHONY: default \
	build \
	unit \
	unit-race \
	fmt \
	lint
