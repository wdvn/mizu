DEPLOY_KEY    ?= $(HOME)/.ssh/id_ed25519_deploy
SERVER1_USER  ?= tam
SERVER1_HOST  ?= server
SERVER2_USER  ?= root
SERVER2_HOST  ?= server2
SERVER        ?= 1
REMOTE_USER   ?= $(if $(filter 2,$(SERVER)),$(SERVER2_USER),$(SERVER1_USER))
REMOTE_HOST   ?= $(if $(filter 2,$(SERVER)),$(SERVER2_HOST),$(SERVER1_HOST))
REMOTE_SSH     = $(REMOTE_USER)@$(REMOTE_HOST)
SSH           ?= ssh -i $(DEPLOY_KEY) -o BatchMode=yes
SCP           ?= scp -i $(DEPLOY_KEY)

BINARY        := crawler-linux
IMAGE_NAME    := crawler-rust-builder

.PHONY: build build-linux deploy deploy-server1 deploy-server2 test remote-test remote-hn-recrawl remote-benchmark clean

## Local dev build (macOS)
build:
	cargo build --release

## Cross-compile for Linux via Docker (Ubuntu 24.04, x86-64-v3/AVX2)
build-linux:
	@echo "Building Linux binary via Docker (may take 15-20min first time)..."
	docker build -t $(IMAGE_NAME) -f Dockerfile .
	@docker rm -f crawler-linux-tmp 2>/dev/null || true
	docker create --name crawler-linux-tmp $(IMAGE_NAME)
	docker cp crawler-linux-tmp:/build/target/release/crawler ./$(BINARY)
	docker rm crawler-linux-tmp
	@echo "Linux binary: ./$(BINARY)"

## Deploy to a server (SERVER=1 or SERVER=2)
deploy: $(BINARY)
	@test -f "$(DEPLOY_KEY)" || { echo "Deploy key not found: $(DEPLOY_KEY)"; exit 1; }
	$(SSH) $(REMOTE_SSH) "mkdir -p \$$HOME/bin"
	$(SCP) ./$(BINARY) $(REMOTE_SSH):.crawler-upload.tmp
	$(SSH) $(REMOTE_SSH) "mv .crawler-upload.tmp ~/bin/crawler && chmod +x ~/bin/crawler"
	@echo "Deployed to $(REMOTE_SSH):~/bin/crawler"
	$(SSH) $(REMOTE_SSH) "~/bin/crawler --help | head -5"

deploy-server1:
	$(MAKE) deploy SERVER=1

deploy-server2:
	$(MAKE) deploy SERVER=2

## Run tests
test:
	cargo test

## Check remote binary works
remote-test:
	$(SSH) $(REMOTE_SSH) "~/bin/crawler --help"

## HN recrawl on remote server (auto-config)
remote-hn-recrawl:
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb"

## Quick benchmark: 10K seeds, devnull writer (measures raw fetch speed)
remote-benchmark:
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb --limit 10000 --writer devnull"

## Benchmark all writer/engine combos on remote
remote-benchmark-all:
	@echo "=== reqwest + devnull (baseline) ==="
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb --limit 10000 --engine reqwest --writer devnull --no-retry"
	@echo "=== hyper + devnull ==="
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb --limit 10000 --engine hyper --writer devnull --no-retry"
	@echo "=== reqwest + duckdb ==="
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb --limit 10000 --engine reqwest --writer duckdb --no-retry"
	@echo "=== reqwest + binary ==="
	$(SSH) $(REMOTE_SSH) "~/bin/crawler hn recrawl --seed ~/data/hn/hn_domains.duckdb --limit 10000 --engine reqwest --writer binary --no-retry"

clean:
	cargo clean
	rm -f $(BINARY)
