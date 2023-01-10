# Label Stale Pull Requests

This GitHub action puts the "stale" label to PRs that has been inactive for at least n days. If the PR already has that label, it gets replaced with the "to close" label.

## Inputs
- `context`: the workflow context, just put `${{ toJSON(github) }}` (required);
- `token`: the GitHub token, just put `${{ secrets.GITHUB_TOKEN }}` (required);
- `stale-timeout`: the number of days that a PR can be inactive before it gets the "stale" label (default: 14);

## Outputs
- `message`: the message that will be displayed in the action log.
