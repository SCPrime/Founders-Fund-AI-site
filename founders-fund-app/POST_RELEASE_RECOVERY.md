# 🔄 Post-Release Recovery Guide

## Phase 7 — Bringing Back Parked Changes

After successful production deployment, you can safely restore and organize the parked development work.

### Step 1: Create Triage Branch
```bash
git checkout -B chore/post-release-triage
```

### Step 2: Examine Stashed Changes
```bash
# List all stashes
git stash list

# Preview the stashed changes
git stash show -p stash@{0} | more

# See summary of stashed files
git stash show --stat stash@{0}
```

### Step 3: Restore Parked Changes
```bash
# Restore all stashed changes to working directory
git stash pop stash@{0}
```

### Step 4: Organize Into Logical Commits

Use interactive staging to separate concerns:

```bash
# Review and stage changes selectively
git add -p

# Create focused commits
git commit -m "chore: normalize line endings"
git commit -m "docs: update internal development playbook"
git commit -m "test: add comprehensive allocation engine tests"
git commit -m "feat: enhance OCR test suite with better coverage"
git commit -m "refactor: improve logger utility functions"
```

### Step 5: Handle Line Ending Issues (Optional)

If many changes are CRLF/LF formatting, create `.gitattributes` in a separate commit:

```bash
# Create .gitattributes file
cat > .gitattributes << 'EOF'
* text=auto
*.sh   text eol=lf
*.ps1  text eol=crlf
*.ts   text eol=lf
*.tsx  text eol=lf
*.js   text eol=lf
*.jsx  text eol=lf
*.json text eol=lf
*.md   text eol=lf
EOF

# Commit line ending rules
git add .gitattributes
git commit -m "chore: enforce consistent line endings"
```

### Step 6: Push and Create PR
```bash
git push -u origin chore/post-release-triage
```

## Recovery Checklist

- [ ] **Production deployment successful** before starting recovery
- [ ] **Smoke tests passed** on production
- [ ] **Create triage branch** from release branch
- [ ] **Preview stashed changes** before applying
- [ ] **Apply stash** to working directory
- [ ] **Separate formatting from functional changes**
- [ ] **Create logical, focused commits**
- [ ] **Handle line endings separately** if needed
- [ ] **Push triage branch** and create PR for review

## Best Practices

### Commit Organization
- **`chore:`** - Formatting, line endings, cleanup
- **`docs:`** - Documentation updates
- **`test:`** - Test additions and improvements
- **`feat:`** - New features or enhancements
- **`fix:`** - Bug fixes
- **`refactor:`** - Code improvements without behavior changes

### Line Ending Strategy
- **Keep formatting commits isolated** to avoid contaminating functional diffs
- **Use `.gitattributes`** to prevent future line ending issues
- **Don't mix line ending fixes** with feature commits

## Stash Recovery Commands

```bash
# If you need to see what's in the stash without applying
git stash show -p stash@{0}

# Apply stash without removing from stash list
git stash apply stash@{0}

# Remove specific stash after applying
git stash drop stash@{0}

# Create new stash from current changes
git stash push -u -m "Additional development work"
```

## Emergency Recovery

If something goes wrong during recovery:

```bash
# Abort current changes and return to clean state
git reset --hard HEAD
git clean -fd

# Re-apply stash if needed
git stash apply stash@{0}

# Or start over with a fresh branch
git checkout release/v1.0.0-pg
git checkout -B chore/post-release-triage-v2
```

## Current Stash Status

**Stash created**: `WIP: park non-release changes before prod deploy`

**Contains**: ~20 untracked files including:
- Test files (`__tests__/`)
- Additional docs (`DEPLOYMENT.md`, `GITHUB_ISSUES.md`)
- Development utilities (`src/lib/formatters.ts`, `src/lib/logger.ts`)
- Configuration files (`jest.config.js`, `jest.setup.js`)
- Schema variants (`prisma/schema.production.prisma`)

**Recovery timeline**: After successful production deployment and smoke testing