# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in:

- **The HAP specification** - design flaws that could compromise claim integrity
- **Reference implementations** - bugs in the official SDKs
- **Protocol infrastructure** - issues with the directory or endpoints

Please report responsibly:

1. **Email:** security@bluescroll.io
2. **Do not** open public issues for security vulnerabilities
3. **Include:** Description, reproduction steps, potential impact

We will acknowledge within 48 hours and provide a detailed response within 7 days.

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| Signature forgery attacks | Individual VA operational security |
| Replay attacks not prevented by spec | Social engineering |
| Key compromise scenarios | Denial of service |
| Privacy leaks in protocol design | Third-party dependencies |

## Security Considerations for VAs

If you're implementing HAP as a VA, see [SPEC.md Section 8](SPEC.md#8-security-considerations) for:

- Key management requirements
- Replay protection
- Privacy requirements
- Claim retention policies

## Acknowledgments

We thank security researchers who help keep HAP secure. Responsible disclosures will be acknowledged here (with permission).
