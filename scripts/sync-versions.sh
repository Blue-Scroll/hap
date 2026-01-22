#!/bin/bash
#
# Sync version across all HAP SDK packages
# Usage: ./scripts/sync-versions.sh <version>
# Example: ./scripts/sync-versions.sh 0.2.0
#

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.2.0"
    exit 1
fi

# Validate version format (semver)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in semver format (e.g., 0.2.0)"
    exit 1
fi

echo "Syncing version to $VERSION across all packages..."

# Get the repo root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Update VERSION file
echo "$VERSION" > VERSION
echo "✓ Updated VERSION file"

# TypeScript (packages/js/package.json)
if [ -f "packages/js/package.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/js/package.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/js/package.json
    fi
    echo "✓ Updated packages/js/package.json"
fi

# Python (packages/python/pyproject.toml)
if [ -f "packages/python/pyproject.toml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" packages/python/pyproject.toml
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" packages/python/pyproject.toml
    fi
    echo "✓ Updated packages/python/pyproject.toml"
fi

# Python __init__.py version
if [ -f "packages/python/human_attestation/__init__.py" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/__version__ = \"[^\"]*\"/__version__ = \"$VERSION\"/" packages/python/human_attestation/__init__.py
    else
        sed -i "s/__version__ = \"[^\"]*\"/__version__ = \"$VERSION\"/" packages/python/human_attestation/__init__.py
    fi
    echo "✓ Updated packages/python/human_attestation/__init__.py"
fi

# Java (packages/java/pom.xml) - only the project version, not dependencies
if [ -f "packages/java/pom.xml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "0,/<version>[^<]*<\/version>/s/<version>[^<]*<\/version>/<version>$VERSION<\/version>/" packages/java/pom.xml
    else
        sed -i "0,/<version>[^<]*<\/version>/s/<version>[^<]*<\/version>/<version>$VERSION<\/version>/" packages/java/pom.xml
    fi
    echo "✓ Updated packages/java/pom.xml"
fi

# Ruby gemspec (packages/ruby/human_attestation.gemspec)
if [ -f "packages/ruby/human_attestation.gemspec" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/spec.version = \"[^\"]*\"/spec.version = \"$VERSION\"/" packages/ruby/human_attestation.gemspec
    else
        sed -i "s/spec.version = \"[^\"]*\"/spec.version = \"$VERSION\"/" packages/ruby/human_attestation.gemspec
    fi
    echo "✓ Updated packages/ruby/human_attestation.gemspec"
fi

# Ruby version.rb (packages/ruby/lib/human_attestation/version.rb)
if [ -f "packages/ruby/lib/human_attestation/version.rb" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/VERSION = \"[^\"]*\"/VERSION = \"$VERSION\"/" packages/ruby/lib/human_attestation/version.rb
    else
        sed -i "s/VERSION = \"[^\"]*\"/VERSION = \"$VERSION\"/" packages/ruby/lib/human_attestation/version.rb
    fi
    echo "✓ Updated packages/ruby/lib/human_attestation/version.rb"
fi

# PHP (packages/php/composer.json)
if [ -f "packages/php/composer.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/php/composer.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/php/composer.json
    fi
    echo "✓ Updated packages/php/composer.json"
fi

# C# (packages/csharp/HumanAttestation.csproj)
if [ -f "packages/csharp/HumanAttestation.csproj" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/<Version>[^<]*<\/Version>/<Version>$VERSION<\/Version>/" packages/csharp/HumanAttestation.csproj
    else
        sed -i "s/<Version>[^<]*<\/Version>/<Version>$VERSION<\/Version>/" packages/csharp/HumanAttestation.csproj
    fi
    echo "✓ Updated packages/csharp/HumanAttestation.csproj"
fi

echo ""
echo "✅ Version synced to $VERSION across all packages"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "  3. Tag: git tag v$VERSION"
echo "  4. Push: git push && git push origin v$VERSION"
