#!/bin/bash
#
# Download Playwright visual regression snapshots from GitHub Actions
#
# Usage:
#   ./scripts/download-snapshots.sh [run_id]
#
# If no run_id is provided, downloads from the latest successful run.
#
# Prerequisites:
#   - gh CLI installed (brew install gh)
#   - gh CLI authenticated (gh auth login)
#

set -e

REPO="rtkelly13/blog"
ARTIFACT_NAME="playwright-snapshots"
SNAPSHOT_DIR="tests/__snapshots__"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo_error "GitHub CLI (gh) is not installed."
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if gh CLI is authenticated
if ! gh auth status &> /dev/null; then
    echo_error "GitHub CLI is not authenticated."
    echo "Run: gh auth login"
    exit 1
fi

# Get run ID from argument or find latest successful run
if [ -n "$1" ]; then
    RUN_ID="$1"
    echo_info "Using provided run ID: $RUN_ID"
else
    echo_info "Finding latest successful Playwright Tests run..."
    RUN_ID=$(gh run list --repo "$REPO" --workflow "Playwright Tests" --status success --limit 1 --json databaseId --jq '.[0].databaseId')
    
    if [ -z "$RUN_ID" ]; then
        echo_error "No successful Playwright Tests runs found."
        exit 1
    fi
    echo_info "Found run ID: $RUN_ID"
fi

# Create temp directory for download
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo_info "Downloading $ARTIFACT_NAME artifact..."
gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME" --dir "$TEMP_DIR"

if [ ! -d "$TEMP_DIR" ] || [ -z "$(ls -A "$TEMP_DIR" 2>/dev/null)" ]; then
    echo_error "Failed to download artifact or artifact is empty."
    exit 1
fi

# Count downloaded files
FILE_COUNT=$(find "$TEMP_DIR" -type f -name "*.png" | wc -l | tr -d ' ')
echo_info "Downloaded $FILE_COUNT snapshot files."

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Copy snapshots to the project
echo_info "Copying snapshots to $SNAPSHOT_DIR..."
cp -R "$TEMP_DIR"/* "$SNAPSHOT_DIR/"

# List the snapshots
echo_info "Snapshots downloaded:"
find "$SNAPSHOT_DIR" -type f -name "*.png" | sort | while read -r file; do
    echo "  - $(basename "$file")"
done

echo ""
echo_info "Done! Snapshots are in $SNAPSHOT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the snapshots"
echo "  2. Commit them to the repository:"
echo ""
echo "     git add $SNAPSHOT_DIR"
echo "     git commit -m 'test: Add baseline visual regression snapshots'"
echo "     git push"
echo ""
