# Manual development scripts

Ad-hoc scripts for trying individual services (embeddings, retrieval,
validator, fixer, runner, file sync). They are not automated tests.

Run them from the `backend/` folder, because they resolve
`generated-projects/` relative to the current directory:

```bash
cd backend
node scripts/dev/test-validator.js
```

Several scripts contain hard-coded project IDs from earlier
experiments; change the ID to an existing project before running.
Some call the AI providers, MongoDB or Docker.
