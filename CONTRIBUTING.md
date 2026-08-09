# Contributing to Pingala

Pingala keeps curriculum text in GitHub so every lesson has a visible history, source trail, and review record. The dashboard only publishes content merged into the protected default branch.

## Contribution paths

- **Typos and small corrections:** open an issue or a focused pull request.
- **Mathematical or technical corrections:** include the corrected derivation, source links, and a short explanation of why the current text is wrong.
- **New lessons:** start with a proposal issue, then open a pull request using the subject repository's content layout.
- **Contributor profile:** complete the contributor-profile issue before submitting a new lesson.

You do not need a degree, government ID, or age verification. New lesson authors do need to demonstrate that they understand the material they submit.

## New lesson requirements

Every new lesson must include:

1. a clear audience, prerequisite, and learning objective;
2. authoritative sources for factual or mathematical claims;
3. original wording or an explicit license for reused material;
4. a working checkpoint with an explanation for every answer;
5. an honest `aiAssisted` declaration;
6. an author attestation that the lesson was read, checked, and can be explained;
7. no secrets, tracking scripts, raw HTML, or executable JSX.

AI may help with brainstorming, editing, or formatting. Unreviewed copy-paste from an AI system is not acceptable, and an AI detector is not treated as proof of authorship. Reviewers will check sources, correctness, originality, and whether the author can defend the material.

## Review process

All contributions come through pull requests. Contributors do not receive write access to the organization repositories.

- Small corrections need one curriculum maintainer approval.
- New lessons, derivations, and safety-sensitive topics may need two approvals.
- Automated checks must pass before review is complete.
- A changed lesson is reviewed again; previous approvals are dismissed after substantive changes.
- A maintainer may request a mentored revision instead of rejecting a promising first contribution.

Please keep pull requests narrow and explain the reason for each substantive change.

## Local checks

```sh
npm ci
npm run content:validate
npm run build
npm run lint
```

The `content/` directory in this dashboard repository is the bootstrap copy of the future `pingala-project/ai-ml` repository. Once the subject repository is created, the dashboard's `content-lock.json` must point to an immutable subject commit.
