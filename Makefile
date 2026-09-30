.PHONY: agy-start agy-traces dev dev-full test-all

# Start the Python AGY multi-agent sidecar server on :8765
agy-start:
	bash services/agy/start.sh

# Query live trace logs from the AGY observability pipeline
agy-traces:
	curl -s http://localhost:8765/traces | python3 -m json.tool

# Run standard web dev server
dev:
	pnpm --filter web dev

# Run both AGY Python sidecar and Next.js frontend in parallel
dev-full:
	@echo "Starting AtelierOS AGY sidecar and Next.js frontend..."
	(bash services/agy/start.sh) &
	(pnpm --filter web dev)

# Run full project unit & verification suites
test-all:
	cd apps/web && npm test
	node apps/web/scripts/adversarial-compliance-test.mjs
	node apps/web/scripts/test-5pillars-e2e.mjs
