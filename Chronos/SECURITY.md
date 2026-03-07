# Security Policy

## Supported Versions

We actively maintain security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| `0.1.x` | ✅ Active support  |
| `< 0.1` | ❌ End of life     |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

We take security issues seriously. If you discover a vulnerability in Chronos-Kit, please report it responsibly:

### Preferred: GitHub Private Security Advisory

1. Navigate to the repository's **Security** tab.
2. Click **"Report a vulnerability"**.
3. Fill in the advisory form with as much detail as possible.
4. We will acknowledge your report within **48 hours** and keep you updated on the fix timeline.

### Alternative: Email

If GitHub advisories are unavailable, email: **security@chronos-kit.dev**

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected versions
- Any suggested remediation

### What to expect

| Timeline | Action |
|----------|--------|
| **48h** | Initial acknowledgement |
| **7 days** | Severity assessment and fix plan communicated |
| **30 days** | Target resolution for critical vulnerabilities |
| **90 days** | Target resolution for high/medium vulnerabilities |

We follow **coordinated disclosure**: we ask that you give us a reasonable window to fix the issue before public disclosure.

## Scope

Chronos-Kit is a **client-side TypeScript SDK** — it does not operate any servers, databases, or infrastructure. The security surface includes:

- Cryptographic key handling (PrivateKey passed to `BatchCompiler`, `ScheduleManager`)
- Serialization of Hiero network transactions
- Mirror Node API client (axios-based HTTP client)
- React Context Provider state leakage

## Out of Scope

- Vulnerabilities in `@hashgraph/sdk` itself — please report those to [Hedera/hedera-sdk-js](https://github.com/hashgraph/hedera-sdk-js/security)
- Hiero consensus network protocol issues — report to the [Hiero](https://hiero.org) project
- Third-party dependency vulnerabilities — open a Dependabot alert or contact the upstream maintainer

## Security Best Practices for Users

1. **Never expose private keys** in client-side code bundled for the browser
2. Use the `batchKey` only in server-side or Node.js contexts
3. Validate all Mirror Node responses before using them to authorize transactions
4. Keep `@chronos-kit/core` and `@hashgraph/sdk` up to date
