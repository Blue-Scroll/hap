# The Vision: Verified Human Effort

**HAP exists because the cost of faking human intent is approaching zero.**

AI can generate unlimited text, images, and video. The marginal cost of content is effectively free. Every system that depends on processing human input — job applications, public comments, support tickets, first messages — is drowning in noise.

**This is not a spec for a spec's sake. This is infrastructure for making costly signals possible again.**

---

## The Core Problem

When sending a message costs nothing, messages mean nothing.

This is the spam problem, generalized. Email solved it (partially) with filters and reputation. But every new communication channel faces the same collapse:

| Channel | What happened |
|---------|---------------|
| Email | Spam made cold outreach nearly useless |
| Job applications | "Easy Apply" made applications meaningless |
| Dating apps | Copy-paste openers ruined first messages |
| Public comments | Bots flooded every policy discussion |
| Support tickets | Noise overwhelmed real customer issues |

The pattern is always the same:
1. Channel opens with friction
2. Friction gets removed ("democratized")
3. Volume explodes, signal drowns
4. Recipients stop paying attention
5. Channel becomes useless for genuine communication

**HAP breaks this pattern by making costly signals cryptographically verifiable.**

---

## Core Beliefs

1. **Process proves intent.** We can't detect AI, but we can verify that someone took deliberate, costly action.

2. **Observable actions over content analysis.** We don't verify _what_ was written. We verify _that someone went through a process_.

3. **Both sides need trust.** Senders need to know they'll be seen. Recipients need to know who's real.

4. **Open standards beat proprietary moats.** HAP is open because trust infrastructure shouldn't be owned by any single company.

5. **Verification does not equal identity.** We verify effort, not who you are or whether your content is true.

---

## Use Cases

### Job Applications (Flagship)

**The problem:** Job seekers submit into black holes. Employers drown in AI-generated spam. Both sides lose.

**HAP solution:** Applicant pays real cost (physical mail, fee, etc.) → VA issues claim → Employer sees verified signal → Actually reads the application.

**Why it matters:** The person who spent $15 and 30 minutes to send a physical packet probably wants this specific job more than someone who clicked "Easy Apply" on 50 listings. That signal has value.

### Dating App Messages

**The problem:** Inboxes are unusable. Copy-paste openers flood every profile. Real interest is indistinguishable from spray-and-pray.

**HAP solution:** Pay $1-2 to send a verified first message → Recipient sees "This person paid to message you specifically" → Your message is in a pool of 10, not 500.

**Why it matters:** Dating apps already sell premium features. Verified messages are a natural extension that improves the experience for everyone.

### Freelancer Proposals

**The problem:** Clients post a job, get 50 copy-paste proposals. Good freelancers can't stand out. Race to the bottom.

**HAP solution:** Freelancer pays $5 to verify their proposal → Client sees "3 verified proposals, 47 unverified" → Verified proposals get read first.

**Why it matters:** Freelancers already invest in profiles and certifications. Verified proposals are the same signal: "I'm serious about this specific opportunity."

### Journalism Tips

**The problem:** Newsrooms get hundreds of "tips" daily. Most are noise. Real whistleblowers get lost.

**HAP solution:** Source pays $10-20 to verify their tip → Journalist sees "12 verified tips this week" → Verified tips get investigated.

**Why it matters:** Sources with real information are motivated. The cost filters out noise while preserving anonymity (VA verifies payment, not identity).

### Public Comments on Regulations

**The problem:** Government agencies open comment periods. Lobbying groups flood them with AI-generated "constituent" letters. Real voices drown.

**HAP solution:** Citizen pays small fee to verify their comment → Agency sees "3,000 verified comments, 47,000 unverified" → Verified comments get human review.

**Why it matters:** Democracy requires costly signals. When astroturfing is cheap, democratic feedback breaks. HAP makes real voices distinguishable.

---

## Why a Protocol?

### The Alternative: Walled Gardens

Every verification service today is an island:
- If you verify through Service A, only integrations with Service A can check your proof
- Your verification history doesn't follow you between services
- Recipients must integrate with every service they want to support
- Verification requires live API calls, creating downtime risk

### What a Protocol Enables

**A protocol makes HAP infrastructure, not a product.**

| Without Protocol | With Protocol |
|-----------------|---------------|
| Ballista is a product | Ballista is one VA in an ecosystem |
| Recipients integrate with Ballista specifically | Recipients integrate with HAP once, accept any VA |
| Competitors are threats | Competitors grow the ecosystem |
| Network effects are zero-sum | Network effects are positive-sum |
| If Ballista dies, claims are worthless | Claims are self-verifying, survive VA death |

When verification claims follow a standard format with cryptographic signatures, they become **self-verifying**. A recipient with a VA's public keys can verify a claim offline, without calling any API. The claim is the proof.

This is the same shift that happened with:
- **Email**: Early email required both parties on the same service. SMTP created an ecosystem.
- **Web**: HTTP let any server talk to any client. The protocol enabled the web.
- **TLS**: Open standard, but Certificate Authorities earn trust. Anyone can verify, only trusted parties can issue.

HAP aims for the same: open protocol, competitive ecosystem, trust earned by VAs.

### What This Means in Practice

- **Portability**: Verified messages work everywhere, not just where one vendor has integrations
- **Interoperability**: Recipients verify claims from any VA using the same code
- **Choice**: Senders pick the VA that fits their needs; recipients don't need to care which one
- **Offline verification**: Claims verify without network calls once you have the public keys
- **Resilience**: Claims remain valid even if a VA goes offline

---

## Trust Without a Trust Authority

A critical design decision: **HAP does not dictate who to trust.**

The VA directory in this repository is for discovery, not endorsement. Being listed means a VA has published a valid `/.well-known/hap.json` endpoint and follows the protocol. It doesn't mean we vouch for their verification quality.

Trust decisions belong to the recipient. They evaluate:
- What verification methods does this VA use?
- What's their reputation?
- Do I trust their attestations for my use case?

This mirrors how the web works. HTTPS proves you're talking to `example.com`, but doesn't tell you whether to trust what `example.com` says. HAP proves a claim came from `ballista.io`, but whether you trust Ballista's verification methods is your call.

**The protocol provides the infrastructure. You provide the judgment.**

---

## What We're NOT Building

- **Identity verification** — We don't check IDs
- **Content verification** — AI can help write; effort is what matters
- **A walled garden** — The protocol is open; anyone can implement
- **A trust authority** — We don't decide who's trustworthy
- **A replacement for quality** — Verified effort ≠ good content

---

## The Bet

We're betting that in a world of infinite AI-generated noise, **proof of human effort becomes valuable**.

Not because effort equals talent. But because effort equals intent.

The person who paid real money to reach you probably wants to reach _you specifically_, not just anyone. That signal cuts through the noise.

**HAP is the spam filter for the AI age.**

---

_Built for people who refuse to be ignored._
