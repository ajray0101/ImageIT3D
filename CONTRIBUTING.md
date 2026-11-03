# Contributing

## The workflow

1. **Start from an issue.** Every piece of work gets a GitHub issue that names its SRS requirement (`REQ-…`). Use the "Feature or task" template. If it isn't in the MVP brief, say why it's needed now before starting.
2. **Branch from `main`.** Name it after the issue: `feature/REQ-12-save-projects`, `fix/45-letters-overlap`.
3. **Keep pull requests small.** One feature or fix per PR is easier to review and less likely to conflict with someone else's work.
4. **Before opening the PR:** run `npm test`, run `npm start`, and try your change in the browser.
5. **Open the PR** with the template filled in. At least one teammate reviews it before it's merged. The CI check must pass.
6. **Pull `main` often** (`git pull origin main`) so you find conflicts early.

## If your work conflicts with someone else's

Don't quietly pick one version. Note the conflict in the PR's "Notes for reviewers" section, or open an issue, and decide it as a team. The same rule applies when the code and the SRS disagree.

## Ground rules

- **Never commit `.env` or an API key.** If one gets pushed, tell the team and revoke the key immediately. Deleting the commit isn't enough.
- **No build step.** The front end is plain ES modules loaded by the browser. If you want a framework or bundler, propose it in an issue first, since it changes everyone's setup.
- **New libraries need a reason.** Add server packages with `npm install <name>` so `package-lock.json` updates, and mention why in the PR. Browser libraries load from a pinned CDN URL in `index.html`.
- **Keep secrets on the server.** The browser only talks to our own `/api/...` routes. Anything that needs a key (Meshy, Claude, a database) goes through `server/`.
- **Write for non-technical sellers.** UI text should be plain and specific: say what happened and what to do next.
- **Add a test** when you change geometry, checks, pricing or an API route.

## Code style

- 2-space indents, double quotes, semicolons. `.editorconfig` sets this up in most editors.
- One responsibility per file. If a module passes about 300 lines, consider splitting it.
- A short comment at the top of each file saying what it's for.
- Validate anything that comes from outside the module (the chat, the server, saved projects). `sanitizeSpec` is the pattern to follow.

## Where things go

See the area table in the [README](README.md#working-on-it-as-a-team) and the recipes in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
