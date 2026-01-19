#!/bin/bash
# Install git hooks for this repository

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Installing git hooks..."

# Copy pre-commit hook
cp "$REPO_ROOT/scripts/hooks/pre-commit" "$REPO_ROOT/.git/hooks/pre-commit"
chmod +x "$REPO_ROOT/.git/hooks/pre-commit"

echo "✓ Installed pre-commit hook (runs prettier)"
echo ""
echo "Hooks installed successfully!"
