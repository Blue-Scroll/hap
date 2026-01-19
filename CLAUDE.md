# CLAUDE.md

This file provides guidance to Claude and other AI assistants when working with this repository.

---

## THE MISSION - Read This First

**HAP exists because trust has collapsed in hiring.**

Job seekers submit into black holes. They're reduced to keywords. They wonder if anyone even saw their name. Meanwhile, employers drown in AI-generated spam and can't tell who's real.

**This is not a spec for a spec's sake. This is infrastructure for restoring trust.**

### The Enemy

- "Easy Apply" buttons that make applications meaningless
- AI tools that flood inboxes with low-effort spam
- ATS black holes that swallow applications without a trace
- The "numbers game" advice that treats job seeking as a lottery

### The People We Serve

- The person applying at 11pm, wondering if anyone will see their work
- The career changer who doesn't fit keyword filters
- The employer who wants to hire humans, not process volume
- Anyone who believes genuine effort should be visible

---

## Core Beliefs

1. **Process proves intent.** We can't detect AI, but we can verify that someone took deliberate, costly action.

2. **Observable actions over content analysis.** We don't verify *what* was written. We verify *that someone went through a process*.

3. **Both sides need trust.** Applicants need to know they'll be seen. Employers need to know who's real.

4. **Open standards beat proprietary moats.** HAP is open because trust infrastructure shouldn't be owned by any single company.

5. **Verification does not equal identity.** We verify effort, not who you are or whether your credentials are real.

---

## What HAP Is and Isn't

### HAP Verifies:
- That a real human took a deliberate, costly action to apply
- That the verification was issued by a trusted authority
- That the claim hasn't been tampered with (cryptographic signature)

### HAP Does NOT Verify:
- Applicant identity (name, address, background)
- Content authenticity ("did a human write this?")
- Credential legitimacy (degrees, experience)
- Job fit or qualifications

This narrow scope is intentional. We verify process, not content.

---

## Project Structure

```
hap/
├── README.md          # Overview and quick start
├── SPEC.md            # Technical specification v0.1
├── LICENSE            # Apache 2.0
├── examples/
│   ├── claims.json    # Example claim payloads
│   └── verify.ts      # TypeScript verification example
└── docs/
    ├── vision.md      # The "why" behind HAP
    ├── for-employers.md    # Employer integration guide
    └── for-vas.md     # Verification Authority requirements
```

---

## Technical Context

### Key Concepts

- **Verification Authority (VA):** An entity that cryptographically signs claims about applicant effort. VAs must maintain trust through consistent standards.

- **Claim:** A structured statement about an applicant's verified action. Contains type, method, tier, timestamp, and issuer.

- **HAP ID:** Unique identifier for each verification claim. Format: `hap_` + 12 alphanumeric characters.

- **JWS:** JSON Web Signature. The cryptographic envelope that makes claims tamper-evident.

### Required VA Endpoints

1. `/.well-known/hap.json` - Public key distribution
2. `/api/v1/verify/{hapId}` - Claim retrieval API
3. `/v/{hapId}` - Human-readable verification page

### Cryptography

- **Algorithm:** Ed25519 (EdDSA)
- **Why:** Fast verification, compact signatures, no configuration complexity

---

## Writing Guidelines

When contributing to HAP documentation or code:

### Voice

- **Direct and confident.** No hedging or corporate speak.
- **Human-first.** Write for the job seeker wondering if anyone cares.
- **Technical but accessible.** Employers aren't all developers.

### Avoid

- Marketing fluff ("revolutionize," "game-changer," "synergy")
- Vague promises ("makes hiring better")
- Jargon without explanation

### Prefer

- Concrete examples over abstract descriptions
- Clear statements of what IS and ISN'T included
- Honest acknowledgment of limitations

---

## The Bigger Picture

HAP is phase one of restoring trust in hiring:

**Now:** Physical mail creates verifiable effort. It's costly, deliberate, and hard to spam.

**Next:** HAP becomes a standard. Multiple Verification Authorities emerge. Employers recognize the signal.

**Eventually:** Verified applications become meaningful. The "spray and pray" model loses to demonstrated intent.

We're not trying to fix everything at once. We're building the infrastructure that makes trust possible.

---

## Contributing

HAP is open because trust infrastructure should be shared. Contributions welcome:

- New Verification Authorities
- Spec clarifications and improvements
- Employer integration guides
- Language-specific verification libraries

The spec is intentionally minimal. Additions should maintain this simplicity.

---

## Remember

Every design decision should answer: **Does this help real humans demonstrate genuine effort?**

If the answer is no, or "maybe for enterprise features," reconsider.

**We exist for the person who refuses to be ignored.**
