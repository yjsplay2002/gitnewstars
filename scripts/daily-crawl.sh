#!/usr/bin/env bash
# Local daily curation crawler for GitNewStars.
# Runs headless Claude Code to refresh data/curated-posts.json via the
# agent-reach skill, then commits & pushes as the yjsplay2002 account.
#
# Registered as a Windows Scheduled Task (see scripts/register-crawl-task.ps1).
# Runs on the local PC so agent-reach's CLIs / web tools are available —
# the cloud routine could not reach them.
set -uo pipefail

REPO="/c/Users/amaze luke/Documents/GitNewStars"
PROMPT="$REPO/scripts/crawl-prompt.md"
LOG="$REPO/scripts/crawl.log"
DATA="data/curated-posts.json"
PUSH_USER="yjsplay2002"
ORIG_USER="lukeamaze"

cd "$REPO" || { echo "repo not found: $REPO"; exit 1; }

# Keep only the last ~2000 lines of the log.
if [ -f "$LOG" ]; then tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi
exec >> "$LOG" 2>&1

echo ""
echo "==================== $(date '+%Y-%m-%d %H:%M:%S') start ===================="

# Always restore the original gh account, even on early exit.
restore_account() { gh auth switch --user "$ORIG_USER" >/dev/null 2>&1 || true; }
trap restore_account EXIT

# Sync main first (fast-forward only; public repo, no auth needed for read).
git checkout main >/dev/null 2>&1 || true
git pull --ff-only origin main || echo "warn: git pull failed, continuing with local state"

# Research + rewrite the JSON. Claude does NOT touch git (handled below).
claude -p "$(cat "$PROMPT")" \
  --model sonnet \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions
CLAUDE_RC=$?
echo "claude exit code: $CLAUDE_RC"

# Nothing changed → nothing to push.
if git diff --quiet -- "$DATA"; then
  echo "no changes to $DATA — done"
  exit 0
fi

# Guard against a corrupted write before publishing.
if ! node -e "const j=JSON.parse(require('fs').readFileSync('$DATA','utf8')); if(!Array.isArray(j.posts)||j.posts.length===0) throw new Error('no posts')"; then
  echo "invalid $DATA — reverting, not pushing"
  git checkout -- "$DATA"
  exit 1
fi

echo "changes detected — committing"
gh auth switch --user "$PUSH_USER" || { echo "gh switch failed"; exit 1; }
git add "$DATA"
git commit -m "chore(posts): daily curated tips refresh"
if git push origin main; then
  echo "pushed successfully"
else
  echo "push failed"
  exit 1
fi

echo "==================== $(date '+%Y-%m-%d %H:%M:%S') done ===================="
