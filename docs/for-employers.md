# HAP for Employers

## What Is This QR Code?

If you received a job application with a QR code or verification URL, the applicant used a HAP-compatible service to apply. Scanning the code confirms that a real human took deliberate action to apply to your company.

## What Does Verification Mean?

A valid HAP verification confirms:

- **A human made effort.** Someone completed a costly action (like sending physical mail) to apply.
- **It was targeted to you.** The claim includes your company name.
- **It's cryptographically signed.** The claim can't be forged or reused.

A HAP verification does NOT confirm:

- Applicant identity (no ID verification)
- Qualifications or experience
- Whether AI helped write the content
- Anything about the applicant's fit for the role

## How to Verify

### Option 1: Scan the QR Code

Scan with your phone's camera. You'll see a verification page showing:
- Company name (should match yours)
- Verification date
- The issuing authority

### Option 2: Call the API

```bash
curl https://ballista.app/api/v1/verify/hap_abc123xyz456
```

Response:
```json
{
  "valid": true,
  "claims": {
    "type": "human_effort",
    "method": "physical_mail",
    "to": { "company": "Your Company" },
    "at": "2026-01-19T06:00:00Z"
  }
}
```

### Option 3: Verify the Signature

For programmatic verification, you can cryptographically verify the signature yourself:

1. Fetch the issuer's public key from `/.well-known/hap.json`
2. Verify the JWS signature
3. Check the claim details

See [SPEC.md](../SPEC.md) for technical details.

## Why Should You Care?

In a sea of automated applications, HAP-verified applications stand out because:

1. **Higher intent signal.** Someone who spends money and time on a physical application probably wants *this* job, not just *a* job.

2. **Lower spam volume.** The cost of verification makes mass-applying impractical.

3. **No extra work for you.** Verification is optional. You can ignore the QR code entirely and evaluate the application normally.

## FAQ

**Q: Does this mean the applicant is qualified?**
No. HAP verifies effort, not competence. A verified applicant still needs to be evaluated on their merits.

**Q: Can applicants fake these?**
No. The cryptographic signature is tied to a specific application. Forging one would require the VA's private key.

**Q: Do I have to do anything different?**
No. You can completely ignore HAP verification and evaluate applications as you normally would. It's supplementary information, not a requirement.

**Q: What's the catch?**
None. Verification is free to check. We don't collect your data or require registration.

**Q: Who is Ballista?**
Ballista is a service that helps job seekers send physical mail applications. They're the first Verification Authority implementing HAP.

## Questions?

The HAP specification is open source: [github.com/BlueScroll/hap](https://github.com/BlueScroll/hap)

For Ballista-specific questions: [ballista.app](https://ballista.app)
