#!/usr/bin/env sh
# One-time setup: point git at the committed hooks directory so the pre-commit
# gate (.githooks/pre-commit) runs on every commit in this clone.
#
# Run from the repo root:
#   sh .githooks/install.sh

set -e

git config core.hooksPath .githooks
echo "Git hooks enabled: core.hooksPath -> .githooks"
echo "The pre-commit gate (tsc, eslint, vitest) will now run on each commit."
