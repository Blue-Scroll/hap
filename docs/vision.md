# The Vision: Human-First Hiring

**HAP exists because trust has collapsed in hiring.**

Job seekers submit into black holes. They're reduced to keywords. They wonder if anyone even saw their name. Meanwhile, employers drown in AI-generated spam and can't tell who's real.

**This is not a spec for a spec's sake. This is infrastructure for restoring trust.**

---

## The Enemy

- "Easy Apply" buttons that make applications meaningless
- AI tools that flood inboxes with low-effort spam
- ATS black holes that swallow applications without a trace
- The "numbers game" advice that treats job seeking as a lottery

## The People We Serve

- The person applying at 11pm, wondering if anyone will see their work
- The career changer who doesn't fit keyword filters
- The employer who wants to hire humans, not process volume
- Anyone who believes genuine effort should be visible

## Core Beliefs

1. **Process proves intent.** We can't detect AI, but we can verify that someone took deliberate, costly action.

2. **Observable actions over content analysis.** We don't verify _what_ was written. We verify _that someone went through a process_.

3. **Both sides need trust.** Applicants need to know they'll be seen. Employers need to know who's real.

4. **Open standards beat proprietary moats.** HAP is open because trust infrastructure shouldn't be owned by any single company.

5. **Verification does not equal identity.** We verify effort, not who you are or whether your credentials are real.

---

## The Problem

Job searching is broken. On both sides.

## The Applicant's Reality

You spend an hour crafting a cover letter. You research the company, tailor your resume, and hit "Apply." Then nothing. No confirmation that a human saw it. No signal that your effort mattered. Just a void.

Meanwhile, the advice is: "Apply to 200 jobs. It's a numbers game."

That advice made sense when applications required effort. But Easy Apply buttons and AI tools have changed the math. Now one person can spam 1,000 applications in an hour. Your thoughtful application drowns in a sea of automated noise.

## The Employer's Reality

Hiring managers are buried. Every role gets hundreds of applications, most obviously templated or AI-generated. The genuine candidates exist, but finding them requires sifting through mountains of garbage.

The response? More filters. More keyword matching. More automation. Which means more qualified people get filtered out for missing the right buzzwords.

Both sides lose.

## The Root Problem

Trust has collapsed.

Applicants don't trust that employers will read their applications.
Employers don't trust that applicants put in real effort.

The cheap, frictionless application model that "democratized" job seeking actually commoditized it. When applying costs nothing, applications mean nothing.

## A Different Approach

What if there was a way to prove genuine effort?

Not prove identity. Not prove credentials. Just prove that a real human took deliberate, costly action to apply.

Physical mail is one such action. Sending a printed packet costs money, requires real addresses, and can't be automated at scale. It's not the only signal of effort, but it's a strong one.

HAP (Human Attestation Protocol) is an open standard that lets any service attest to this kind of effort. When a sender communicates through a Verification Authority like Ballista, the message includes a cryptographic signature that recipients can verify. That signature doesn't vouch for qualifications. It says: "This person did something real."

## What We're Building Toward

Short term: Ballista packets include verifiable effort claims.

Medium term: Employers can scan a QR code to confirm authenticity. Some may choose to prioritize verified applications.

Long term: A ecosystem where "Verified Application" becomes a meaningful signal. Where employers who opt into the protocol commit to reviewing verified applications with human eyes. Where the spray-and-pray model becomes less effective because genuine effort is distinguishable.

## What We're NOT Building

- Identity verification (we don't check IDs)
- Content verification (AI can help write; effort is what matters)
- A walled garden (the protocol is open; anyone can implement)
- A replacement for qualifications (effort != competence)

## Why a Protocol, Not Just an API?

Every verification service today is a walled garden. If you verify through Service A, only employers integrated with Service A can check your proof. Your verification history doesn't follow you between services. Employers must build separate integrations for each service they want to support.

This creates problems:

- **Vendor lock-in**: Employers can't easily switch or add verification services
- **No portability**: Applicants can't take their verification history with them
- **Fragmented ecosystem**: Each service is an island, limiting network effects
- **API dependency**: Verification requires live API calls, creating downtime risk

**A protocol changes everything.**

When verification claims follow a standard format with cryptographic signatures, they become self-verifying. An employer with a VA's public keys can verify a claim offline, without calling any API. The claim is the proof.

This is the same shift that happened with email. Early email required both parties to use the same service. SMTP changed that—now any email server can talk to any other. The protocol created an ecosystem.

HAP aims to do the same for human verification:

- **Portability**: Verified applications work everywhere, not just where one vendor has integrations
- **Interoperability**: Employers verify claims from any VA using the same code
- **Choice**: Applicants pick the VA that fits their needs; employers don't need to care which one
- **Offline verification**: Claims can be verified without network calls once you have the public keys
- **Non-repudiation**: A signed claim is proof—it can't be disputed or revoked silently

## Why Open?

We could keep the verification proprietary. But an open standard is more defensible long-term.

Think SSL/TLS: the protocol is open, but Certificate Authorities (Verisign, Let's Encrypt) are trusted entities. Anyone can verify a signature, but only certain parties can issue one.

HAP works the same way. The spec is open. Verification is decentralized. But Verification Authorities (starting with Ballista) earn trust by maintaining standards.

## Trust Without a Trust Authority

A critical design decision: **HAP does not dictate who to trust.**

The VA directory in this repository is for discovery, not endorsement. Being listed means a VA has published a valid `/.well-known/hap.json` endpoint and follows the protocol. It doesn't mean we vouch for their verification quality.

Trust decisions belong to the verifier (the employer). They evaluate:

- What verification methods does this VA use?
- What's their reputation?
- Do I trust their attestations for my use case?

This mirrors how the web works. HTTPS proves you're talking to `example.com`, but doesn't tell you whether to trust what `example.com` says. HAP proves a claim came from `ballista.io`, but whether you trust Ballista's verification methods is your call.

The protocol provides the infrastructure. You provide the judgment.

## The Bet

We're betting that in a world of infinite AI-generated noise, proof of human effort becomes valuable.

Not valuable because effort equals talent. But valuable because effort equals intent. The person who spent $15 and 30 minutes to send a physical packet probably wants this specific job more than someone who clicked "Easy Apply" on 50 listings.

That signal has value.

---

_Built for people who refuse to be ignored._
