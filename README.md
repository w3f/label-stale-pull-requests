# Label Stale Pull Requests

This GitHub action puts the "stale" label to PRs that has been inactive for at least n days. If the PR already has that label, it gets replaced with the "to close" label.

## Inputs
- `context`: the workflow context, just put `${{ toJSON(github) }}` (required);
- `token`: the GitHub token, just put `${{ secrets.GITHUB_TOKEN }}` (required);
- `stale-timeout`: the number of days that a PR can be inactive before it gets the "stale" label (default: 14);

## Outputs
- `message`: the message that will be displayed in the action log.

## Local development
To test the action locally, create a `.env` file with
```
cp .env.example .env
```
and fill the `GITHUB_TOKEN` variable with a valid GitHub token (create one [here](https://github.com/settings/tokens)).

Then run
```
node src/action.test.js
```
and you'll see the logs in the console. To see if the action is right, you should double check the PRs in the repo.