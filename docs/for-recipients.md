# HAP for Recipients

## What Is This QR Code?

If you received a message with a QR code or verification URL, the sender used a HAP-compatible service to reach you. Scanning the code confirms that a real human took deliberate action to send you this message.

## What Does Verification Mean?

A valid HAP verification confirms:

- **A human made effort.** Someone completed a costly action (like sending physical mail or paying a fee) to reach you.
- **It was targeted to you.** The claim includes your organization's name.
- **It's cryptographically signed.** The claim can't be forged or reused.

A HAP verification does NOT confirm:

- Sender identity (no ID verification)
- Qualifications or credentials
- Whether AI helped write the content
- Anything about the sender's suitability for your needs

## How to Verify

### Option 1: Scan the QR Code

Scan with your phone's camera. You'll see a verification page showing:

- Recipient name (should match your organization)
- Verification date
- The issuing authority

### Option 2: Call the API

```bash
curl https://www.ballista.jobs/api/v1/verify/hap_abc123xyz456
```

Response (valid claim):

```json
{
  "valid": true,
  "id": "hap_abc123xyz456",
  "claim": {
    "v": "0.1",
    "id": "hap_abc123xyz456",
    "method": "ba_priority_mail",
    "description": "Priority mail packet with handwritten cover letter",
    "tier": "standard",
    "to": {
      "name": "Your Organization",
      "domain": "yourorg.com"
    },
    "at": "2026-01-19T06:00:00Z",
    "iss": "ballista.jobs",
    "cost": { "amount": 1500, "currency": "USD" },
    "time": 1800,
    "physical": true
  },
  "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImJhX2tleV8wMDEifQ...",
  "issuer": "ballista.jobs",
  "verifyUrl": "https://www.ballista.jobs/v/hap_abc123xyz456"
}
```

Response (revoked claim):

```json
{
  "valid": false,
  "id": "hap_abc123xyz456",
  "revoked": true,
  "revocationReason": "user_request",
  "revokedAt": "2026-02-01T12:00:00Z"
}
```

**Note:** A revoked claim means the sender or VA withdrew the verification. Treat it as if there's no verification.

### Option 3: Verify the Signature

For programmatic verification, you can cryptographically verify the signature yourself:

1. Fetch the issuer's public key from `/.well-known/hap.json`
2. Verify the JWS signature
3. Check the claim details

See [SPEC.md](../SPEC.md) for technical details.

## Why Should You Care?

In a sea of automated messages, HAP-verified communications stand out because:

1. **Higher intent signal.** Someone who spends money and time to reach you specifically probably has a genuine reason, not just a spray-and-pray approach.

2. **Lower spam volume.** The cost of verification makes mass-sending impractical.

3. **No extra work for you.** Verification is optional. You can ignore the QR code entirely and evaluate the message normally.

## FAQ

**Q: Does this mean the sender is legitimate?**
No. HAP verifies effort, not legitimacy. A verified sender still needs to be evaluated on their merits.

**Q: Can senders fake these?**
No. The cryptographic signature is tied to a specific message. Forging one would require the VA's private key.

**Q: Do I have to do anything different?**
No. You can completely ignore HAP verification and evaluate messages as you normally would. It's supplementary information, not a requirement.

**Q: What's the catch?**
None. Verification is free to check. We don't collect your data or require registration.

**Q: Who is Ballista?**
Ballista is a service that helps people send physical mail. They're one of the first Verification Authorities implementing HAP.

## Questions?

The HAP specification is open source: [github.com/Blue-Scroll/hap](https://github.com/Blue-Scroll/hap)

For Ballista-specific questions: [ballista.jobs](https://www.ballista.jobs)
