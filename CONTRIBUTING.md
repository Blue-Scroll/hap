# Contributing to HAP

HAP is open because trust infrastructure should be shared. We welcome contributions from anyone who wants to help restore trust in hiring.

## What We Welcome

- **New Verification Authorities** - Implement HAP and join the ecosystem
- **Spec clarifications** - Help make the specification clearer
- **SDK improvements** - Bug fixes, performance, new languages
- **Documentation** - Guides, examples, translations
- **Employer integration guides** - Help employers adopt HAP

## Writing Guidelines

When contributing to HAP documentation or code, follow these principles:

### Voice

- **Direct and confident.** No hedging or corporate speak.
- **Human-first.** Write for the job seeker wondering if anyone cares.
- **Technical but accessible.** Employers aren't all developers.

### Avoid

- Marketing fluff ("revolutionize," "game-changer," "synergy")
- Vague promises ("makes hiring better")
- Jargon without explanation
- Over-engineering simple concepts

### Prefer

- Concrete examples over abstract descriptions
- Clear statements of what IS and ISN'T included
- Honest acknowledgment of limitations
- Simple solutions that work

## The Design Principle

Every design decision should answer: **Does this help real humans demonstrate genuine effort?**

If the answer is no, or "maybe for enterprise features," reconsider.

## How to Contribute

### For Documentation/Spec Changes

1. Fork the repository
2. Create a branch (`git checkout -b improve-docs`)
3. Make your changes
4. Submit a pull request

### For SDK Contributions

1. Check the existing SDK in `packages/` for patterns
2. Follow the language's conventions
3. Include tests
4. Update the README if adding new functionality

## Releasing (Maintainers)

### Version Bump

**Option A: Automated (Recommended)**

1. Go to **Actions** → **Version Bump** workflow
2. Click "Run workflow"
3. Select bump type: `patch`, `minor`, or `major`
4. This creates a PR with version changes across all SDKs
5. Review and merge the PR

**Option B: Manual**

```bash
./scripts/sync-versions.sh 0.2.0
git add .
git commit -m "chore: bump version to 0.2.0"
git push
```

### Publishing a Release

1. Go to **Actions** → **Release** workflow
2. Click "Run workflow"
3. Enter the version number (e.g., `0.2.0`)
4. The workflow will:
   - Sync versions across all SDK packages
   - Commit and create a git tag (`v0.2.0`)
   - Publish to all package registries (npm, PyPI, Maven Central, RubyGems, Packagist, NuGet)
   - Create a GitHub Release

**Required Secrets** (configured in repo settings):

- `NPM_ACCESS_TOKEN` - npm publishing
- `PYPI_API_KEY` - PyPI publishing
- `MAVEN_CENTRAL_USERNAME` / `MAVEN_CENTRAL_PASSWORD` - Maven Central
- `GPG_PRIVATE_KEY` / `GPG_PASSPHRASE` - Maven artifact signing
- `RUBYGEMS_API_KEY` - RubyGems publishing
- `PACKAGIST_API_TOKEN` - Packagist webhook
- `NUGET_API_KEY` - NuGet publishing

### For New Verification Authorities

See [docs/for-vas.md](./docs/for-vas.md) for requirements. To be listed in the official directory:

1. Implement all technical requirements
2. Document your verification method publicly
3. Open a PR adding your VA to the README
4. Include evidence of your verification process

## Code of Conduct

Be kind. We're all here to make hiring less broken.

- Assume good intent
- Focus on the work, not the person
- Help newcomers
- Disagree constructively

## Questions?

Open an issue at [github.com/BlueScroll/hap](https://github.com/BlueScroll/hap)

---

**We exist for the person who refuses to be ignored.**
