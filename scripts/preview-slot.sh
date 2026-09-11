#!/usr/bin/env bash
# Claim a preview slot: point pN.ryankelly.dev at the current branch's work.
#
#   scripts/preview-slot.sh 2          # slot/2 = convex-preview + HEAD
#   scripts/preview-slot.sh 2 my-ref   # slot/2 = convex-preview + my-ref
#   scripts/preview-slot.sh 2 --release  # slot/2 = convex-preview (idle)
#
# A slot is always `convex-preview` plus the work under review — never the raw
# head — so the deployed frontend stays compatible with the shared preview
# Convex schema. Releasing a slot resets it to `convex-preview`, not main, for
# the same reason. Slot branches are disposable and never merged back, so the
# merge commit and the force-push are both fine.
set -euo pipefail

n="${1:?usage: preview-slot.sh <1|2|3> [ref|--release]}"
ref="${2:-HEAD}"

git fetch origin --quiet

if [ "$ref" = "--release" ]; then
  git push -f origin origin/convex-preview:refs/heads/"slot/$n"
  echo "released: https://p$n.ryankelly.dev now tracks convex-preview"
  exit 0
fi

sha=$(git rev-parse "$ref")
tmp=$(mktemp -d)
trap 'git worktree remove --force "$tmp" 2>/dev/null || true' EXIT

git worktree add --quiet --detach "$tmp" origin/convex-preview
if ! git -C "$tmp" merge --no-edit --quiet "$sha"; then
  echo "error: $ref does not merge cleanly onto convex-preview — resolve there first" >&2
  exit 1
fi

git push -f origin "$(git -C "$tmp" rev-parse HEAD)":refs/heads/"slot/$n"
echo "claimed: https://p$n.ryankelly.dev"
