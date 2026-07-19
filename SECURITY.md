# Security policy

get-secret is a one-time secret sharing service. We take reports of security
vulnerabilities seriously, especially those that could expose secret content,
bypass expiry or view limits, or weaken encryption.

## Supported versions

Security fixes are applied to the latest code on the `main` branch. Older
releases may not receive backports unless explicitly noted in a release
announcement.

| Version | Supported |
| ------- | --------- |
| latest `main` | Yes |
| older tags / forks | Best effort |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report them privately using one of these channels:

1. **Preferred:** [GitHub private vulnerability reporting](https://github.com/Sid-1819/secureShare/security/advisories/new)
2. **Email:** siddhesh.shirdhankar18@gmail.com (subject: `[get-secret security]`)

Include as much detail as you can:

- Description of the issue and potential impact
- Steps to reproduce (minimal proof of concept is fine)
- Affected endpoints, versions, or deployment modes (local, Docker, production)
- Any suggested fix or mitigation, if you have one

We will acknowledge receipt within **72 hours** and aim to provide an initial
assessment within **7 days**. We may ask for additional information or coordinate
embargo timing if a fix is in progress.

## Out of scope

The following are generally **not** treated as product vulnerabilities:

- Missing rate limits or hardening on **your own** misconfigured self-hosted
  deployment (e.g. exposed Redis/Postgres without authentication)
- Social engineering of secret recipients
- Compromise of a user's browser, device, or network outside this service
- Denial-of-service at volumes that require infrastructure-level mitigation
- Issues in third-party dependencies already tracked by Dependabot / upstream
  advisories (unless there is a demonstrable exploit path in get-secret)

## Responsible disclosure

When testing:

- Use a **local** or **self-hosted** instance you control.
- Do **not** access, modify, or exfiltrate real user secrets on production
  demos without prior written permission.
- Do **not** perform destructive testing against shared infrastructure.

We appreciate researchers who report issues responsibly and will credit you in
release notes or advisories if you wish (unless you prefer to remain anonymous).

## Security model (summary)

This is a high-level overview, not a formal threat model (see [ROADMAP.md](./ROADMAP.md)).

- **At rest:** Secret payloads are encrypted with AES-256-GCM using a server-side
  `ENCRYPTION_KEY`.
- **In transit:** HTTPS is required in production deployments.
- **Lifecycle:** Secrets can expire by time and/or view count; consumed secrets are
  deleted per application logic.
- **Access control:** Optional passphrases (bcrypt-hashed) and rate limiting
  reduce brute-force and abuse.
- **Logging:** Secret body content and passphrases must not appear in logs.

If you find a gap between this summary and actual behavior, please report it.

## Security-related contributions

Pull requests that change encryption, authentication, rate limiting, validation,
or secret lifecycle require:

- A clear description of threat addressed
- Tests covering the change
- Confirmation that secrets are not logged

See the security checklist in [`.github/pull_request_template.md`](./.github/pull_request_template.md).
