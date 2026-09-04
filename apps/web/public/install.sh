#!/usr/bin/env bash
set -euo pipefail

# Backward-compatible installer URL. Platform selection lives in the
# create-project installer used by the website.
curl -fsSL https://taskwish.ai/create-project.sh | bash -s -- "$@"
