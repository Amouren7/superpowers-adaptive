#!/bin/bash
# Build: src/index.js (plain ESM, no runtime deps) -> lib/index.js + a type stub.
# No DSH checkout or tsc needed: the plugin imports only node builtins.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Checking syntax ==="
node --check src/index.js

echo "=== Emitting lib/ ==="
mkdir -p lib/types
cp src/index.js lib/index.js
cat > lib/types/index.d.ts <<'EOF'
import type { Context } from 'cordis'
export declare const name: string
export declare const inject: string[]
export declare function apply(ctx: Context): void
EOF

echo "=== Build complete ==="
ls -l lib
