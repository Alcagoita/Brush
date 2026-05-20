# Agenda — Project Guidelines

## Git Guidelines

### Branching Strategy

- `main`: Production-ready code.
- `develop`: Integration branch for features.
- `feature/*`: Branch off `develop`, merge back to `develop`.
- `release/*`: Branch off `develop`, merge to `main` and `develop` with a tag.
- `hotfix/*`: Branch off `main`, merge to `main` and `develop`.

### Pull Request Rules

- Every task **must** be submitted via a Pull Request — direct pushes to `main` or `develop` are not allowed.
- A PR requires **at least 1 approved review** before it can be merged.
- Stale reviews are automatically dismissed when new commits are pushed.
- Branch protection is enforced on both `main` and `develop`.
- **GitHub Copilot** is automatically requested as a reviewer on every PR via a repository Ruleset.
  - Copilot performs a first-pass code review and leaves inline comments and suggestions.
  - Copilot always posts a **"Comment"** review — it does not count as an approval.
  - A human approval is still required before merging.

### Commit Messages

Use Conventional Commits format:

```
<type>(<scope>): <short description>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc. (no logic change)
- `refactor`: Code restructuring without feature/fix
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

**Examples:**
```
feat(auth): add login screen
fix(calendar): resolve event overlap rendering
chore(deps): upgrade react-native to 0.86
```
