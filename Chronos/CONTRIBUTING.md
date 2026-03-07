# Contributing to Chronos-Kit

Thank you for your interest in contributing to Chronos-Kit! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git** with GPG signing configured
- **GPG key** registered on GitHub

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/chronos-kit.git
cd chronos-kit
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_ORG/chronos-kit.git
```

4. Install dependencies:

```bash
pnpm install
```

---

## 💻 Development Workflow

### 1. Create a Branch

Create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### 2. Make Changes

Make your changes following these guidelines:

- Follow the existing code style
- Write clear, self-documenting code
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Build and Test

Before committing, ensure everything works:

```bash
# Build all packages
pnpm run build

# Run linter
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Run type checking
pnpm run type-check

# Run tests
pnpm run test

# Format code
pnpm run format
```

---

## 📝 Commit Guidelines

### Developer Certificate of Origin (DCO)

All commits **must** include a sign-off certifying that you have the right to submit the code under the project's license. This is done automatically by using the `-s` flag:

```bash
git commit -s -m "Your commit message"
```

This adds a `Signed-off-by` line to your commit:

```
Signed-off-by: Your Name <your.email@example.com>
```

### GPG Signing

All commits **must** be GPG signed to verify authenticity.

#### Setting Up GPG Signing

1. **Generate a GPG key** (if you don't have one):

```bash
gpg --full-generate-key
```

Choose:
- RSA and RSA
- 4096 bits
- No expiration (or set your preference)
- Your name and email (must match your Git config)

2. **List your GPG keys**:

```bash
gpg --list-secret-keys --keyid-format=long
```

Output:
```
sec   rsa4096/YOUR_KEY_ID 2024-01-01 [SC]
uid           Your Name <your.email@example.com>
```

3. **Configure Git to use your GPG key**:

```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

4. **Export your public key**:

```bash
gpg --armor --export YOUR_KEY_ID
```

5. **Add the GPG key to GitHub**:
   - Go to https://github.com/settings/keys
   - Click "New GPG key"
   - Paste your public key

### Commit Messages

Follow the Conventional Commits specification:

```
type(scope): brief description

Detailed explanation of what changed and why.

Signed-off-by: Your Name <your.email@example.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

```bash
# Feature with DCO and GPG
git commit -s -S -m "feat(core): add pre-flight validation engine

Implements liquidity constraint simulation to prevent failure fees.
Integrates with Mirror Node client for balance verification.

Signed-off-by: John Doe <john@example.com>"

# Bug fix
git commit -s -S -m "fix(react): resolve hook dependency warning in useHieroAccount"

# Documentation
git commit -s -S -m "docs: update installation instructions in README"
```

### Amending Commits

If you forgot to sign off or GPG sign a commit:

```bash
# Sign off last commit
git commit --amend --signoff --no-edit

# GPG sign last commit
git commit --amend --no-edit -S

# Both
git commit --amend --signoff --no-edit -S
```

For multiple commits:

```bash
# Rebase and sign all commits
git rebase --exec 'git commit --amend --no-edit -S -s' -i origin/main
```

---

## 🔄 Pull Request Process

### 1. Keep Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### 2. Rebase Your Branch

```bash
git checkout your-branch
git rebase main
```

### 3. Push Your Changes

```bash
git push origin your-branch
# or force push after rebase
git push --force-with-lease origin your-branch
```

### 4. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers
   - Screenshots (if applicable)
   - Testing methodology

### 5. PR Review Process

- Address reviewer feedback promptly
- Keep discussions constructive
- Make requested changes in new commits
- Once approved, maintainers will merge

### 6. After Merge

```bash
git checkout main
git pull upstream main
git push origin main
git branch -d your-branch
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:ci

# Run tests for specific package
cd packages/chronos-core
pnpm run test
```

### Writing Tests

- Place tests next to source files: `file.test.ts`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeAccountId } from './utils';

describe('normalizeAccountId', () => {
  it('should convert string to AccountId', () => {
    const result = normalizeAccountId('0.0.12345');
    expect(result.toString()).toBe('0.0.12345');
  });

  it('should return AccountId unchanged', () => {
    const accountId = AccountId.fromString('0.0.12345');
    const result = normalizeAccountId(accountId);
    expect(result).toBe(accountId);
  });
});
```

---

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include examples in documentation
- Document parameters and return types
- Explain complex logic

Example:

```typescript
/**
 * Compiles multiple transactions into an atomic batch
 * 
 * @param transactions - Array of transactions to batch (max 50)
 * @param payerAccountId - Account ID of the transaction payer
 * @returns Compiled batch transaction ready for submission
 * 
 * @throws {TransactionCountExceededError} If transaction count exceeds 50
 * @throws {BatchSizeExceededError} If serialized size exceeds 6KB
 * 
 * @example
 * ```typescript
 * const compiler = new BatchCompiler({ ... });
 * const result = await compiler.compile([tx1, tx2], '0.0.12345');
 * console.log(`Batch size: ${result.totalSize} bytes`);
 * ```
 */
async compile(
  transactions: Transaction[],
  payerAccountId: AccountId | string
): Promise<BatchCompilationResult>
```

### README Updates

When adding new features:
- Update relevant README files
- Add usage examples
- Update API documentation
- Add to changelog

---

## 🐛 Reporting Issues

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Code samples or screenshots
- Error messages and stack traces

### Feature Requests

Include:
- Clear description of the feature
- Use cases and benefits
- Proposed API or implementation
- Any alternatives considered

---

## 💡 Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/chronos-kit)
- **GitHub Discussions**: Use for questions and discussions
- **Issues**: For bugs and feature requests only

---

## 📊 Project Structure

```
chronos-kit/
├── packages/
│   ├── chronos-core/       # Core library
│   └── chronos-react/      # React integration
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docs/                   # Additional documentation
└── examples/               # Example projects
```

---

## 🔒 Security

If you discover a security vulnerability, please email security@chronos-kit.dev instead of using the issue tracker.

---

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to Chronos-Kit! 🎉
