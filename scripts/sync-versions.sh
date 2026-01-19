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

# TypeScript (packages/hap-js/package.json)
if [ -f "packages/hap-js/package.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/hap-js/package.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/hap-js/package.json
    fi
    echo "✓ Updated packages/hap-js/package.json"
fi

# Python (packages/hap-python/pyproject.toml)
if [ -f "packages/hap-python/pyproject.toml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" packages/hap-python/pyproject.toml
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" packages/hap-python/pyproject.toml
    fi
    echo "✓ Updated packages/hap-python/pyproject.toml"
fi

# Python __init__.py version
if [ -f "packages/hap-python/hap/__init__.py" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/__version__ = \"[^\"]*\"/__version__ = \"$VERSION\"/" packages/hap-python/hap/__init__.py
    else
        sed -i "s/__version__ = \"[^\"]*\"/__version__ = \"$VERSION\"/" packages/hap-python/hap/__init__.py
    fi
    echo "✓ Updated packages/hap-python/hap/__init__.py"
fi

# Java (packages/hap-java/pom.xml) - only the project version, not dependencies
if [ -f "packages/hap-java/pom.xml" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "0,/<version>[^<]*<\/version>/s/<version>[^<]*<\/version>/<version>$VERSION<\/version>/" packages/hap-java/pom.xml
    else
        sed -i "0,/<version>[^<]*<\/version>/s/<version>[^<]*<\/version>/<version>$VERSION<\/version>/" packages/hap-java/pom.xml
    fi
    echo "✓ Updated packages/hap-java/pom.xml"
fi

# Ruby gemspec (packages/hap-ruby/hap.gemspec)
if [ -f "packages/hap-ruby/hap.gemspec" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/spec.version = \"[^\"]*\"/spec.version = \"$VERSION\"/" packages/hap-ruby/hap.gemspec
    else
        sed -i "s/spec.version = \"[^\"]*\"/spec.version = \"$VERSION\"/" packages/hap-ruby/hap.gemspec
    fi
    echo "✓ Updated packages/hap-ruby/hap.gemspec"
fi

# Ruby version.rb (packages/hap-ruby/lib/hap/version.rb)
if [ -f "packages/hap-ruby/lib/hap/version.rb" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/VERSION = \"[^\"]*\"/VERSION = \"$VERSION\"/" packages/hap-ruby/lib/hap/version.rb
    else
        sed -i "s/VERSION = \"[^\"]*\"/VERSION = \"$VERSION\"/" packages/hap-ruby/lib/hap/version.rb
    fi
    echo "✓ Updated packages/hap-ruby/lib/hap/version.rb"
fi

# PHP (packages/hap-php/composer.json)
if [ -f "packages/hap-php/composer.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/hap-php/composer.json
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" packages/hap-php/composer.json
    fi
    echo "✓ Updated packages/hap-php/composer.json"
fi

# C# (packages/hap-csharp/BlueScroll.Hap.csproj)
if [ -f "packages/hap-csharp/BlueScroll.Hap.csproj" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/<Version>[^<]*<\/Version>/<Version>$VERSION<\/Version>/" packages/hap-csharp/BlueScroll.Hap.csproj
    else
        sed -i "s/<Version>[^<]*<\/Version>/<Version>$VERSION<\/Version>/" packages/hap-csharp/BlueScroll.Hap.csproj
    fi
    echo "✓ Updated packages/hap-csharp/BlueScroll.Hap.csproj"
fi

echo ""
echo "✅ Version synced to $VERSION across all packages"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "  3. Tag: git tag v$VERSION"
echo "  4. Push: git push && git push origin v$VERSION"
