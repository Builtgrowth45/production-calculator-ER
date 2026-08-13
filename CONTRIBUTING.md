# Contributing

Thanks for helping improve Empire Rising Production Calculator.

## Before opening a pull request

1. Read the README, disclaimer, and relevant documentation.
2. Keep changes focused and explain the user-visible effect.
3. For data changes, include the source, retrieval/verification date, and any uncertainty.
4. Never commit private inventories, Discord exports, credentials, tokens, or personal information.
5. Edit canonical source data or source documents; do not hand-edit generated runtime files.
6. Run the relevant tests and include the commands/results in the pull request.

## Local setup

```bash
npm ci
npm test
npm run build:3d
npm run test:3d
npm run test:budgets
```

## Pull requests

Use a focused branch and a descriptive commit message. UI changes should include screenshots or a short browser verification note. Data changes should include a before/after explanation and provenance. Changes affecting storage, sharing, or network behavior must describe their privacy impact.

## Data corrections

Open a data-correction issue with the item/recipe, the observed value, the source or in-game evidence, and the date checked. Do not paste private account data or credentials.
