# Agenda — Project Guidelines

## Git Guidelines

### Branching Strategy

- `main`: Production-ready code.
- `develop`: Integration branch for features.
- `feature/*`: Branch off `develop`, merge back to `develop`.
- `release/*`: Branch off `develop`, merge to `main` and `develop` with a tag.
- `hotfix/*`: Branch off `main`, merge to `main` and `develop`.

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
