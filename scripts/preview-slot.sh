#!/usr/bin/env bash
# Claim a preview slot: point pN.ryankelly.dev at the current branch's work.
#
#   scripts/preview-slot.sh 2            # slot/2 = HEAD (or convex-preview + HEAD)
#   scripts/preview-slot.sh 2 my-ref     # same, for an explicit ref
#   scripts/preview-slot.sh 2 my-ref --train  # force the convex-preview merge
#   scripts/preview-slot.sh 2 --release  # slot/2 = convex-preview (idle)
#
# Two paths, picked automatically (see
# docs/adr/0010-preview-slots-skip-the-schema-train-by-default.md):
#
#   direct  push the raw ref. Chosen when the ref changes nothing under convex/
#           AND convex-preview is an ancestor of main (the train is idle). The
#           deployed backend is then already what the branch expects, so the
#           merge would only make the slot differ from the commit CI tested.
#   train   push convex-preview + the ref, merged. Chosen when the branch owns
#           schema work, or when convex-preview is ahead of main and so carries
#           someone else's unmerged schema that the frontend must match.
#
# Note this script never pushes convex-preview and so never deploys Convex —
# moving the train is a separate, deliberate act.
#
# `--train` forces the train path if the detection is ever wrong. Releasing a
# slot resets it to `convex-preview`, not main, so an idle subdomain still shows
# something compatible with the deployed schema. Slot branches are disposable
# and never merged back, so the merge commit and the force-push are both fine.
set -euo pipefail

n="${1:?usage: preview-slot.sh <1|2|3> [ref|--release] [--train]}"
ref="${2:-HEAD}"
force_train=false
for arg in "${@:2}"; do
  [ "$arg" = "--train" ] && force_train=true
done
[ "$ref" = "--train" ] && ref=HEAD

git fetch origin --quiet

if [ "$ref" = "--release" ]; then
  git push -f origin origin/convex-preview:refs/heads/"slot/$n"
  echo "released: https://p$n.ryankelly.dev now tracks convex-preview"
  exit 0
fi

sha=$(git rev-parse "$ref")

# Does this branch actually change Convex?
convex_changes=$(git diff --name-only origin/main..."$sha" -- convex/)
# Is the schema train idle (nothing unmerged riding on the shared backend)?
train_idle=false
if git merge-base --is-ancestor origin/convex-preview origin/main; then
  train_idle=true
fi

if [ "$force_train" = false ] && [ -z "$convex_changes" ] && [ "$train_idle" = true ]; then
  git push -f origin "$sha":refs/heads/"slot/$n"
  echo "claimed (direct): https://p$n.ryankelly.dev"
  echo "  no convex/ changes and convex-preview is idle — skipped the schema train."
  exit 0
fi

if [ -n "$convex_changes" ]; then
  echo "convex/ changes detected — merging onto the schema train:"
  echo "$convex_changes" | sed 's/^/  /'
  echo "  remember to push convex-preview so the backend matches, or the slot"
  echo "  frontend will call functions that are not deployed."
else
  echo "convex-preview is ahead of main (holding unmerged schema) — merging onto it"
  echo "  so this frontend matches the functions actually deployed."
fi

tmp=$(mktemp -d)
trap 'git worktree remove --force "$tmp" 2>/dev/null || true' EXIT

git worktree add --quiet --detach "$tmp" origin/convex-preview
if ! git -C "$tmp" merge --no-edit --quiet "$sha"; then
  echo "error: $ref does not merge cleanly onto convex-preview — resolve there first" >&2
  exit 1
fi

git push -f origin "$(git -C "$tmp" rev-parse HEAD)":refs/heads/"slot/$n"
echo "claimed (train): https://p$n.ryankelly.dev"
