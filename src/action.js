import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
    const staleTimeout = parseInt(core.getInput('stale-timeout'));
    const context = core.getInput('context');
    const context_json = JSON.parse(context);
    const repo = context_json.repository;
    const repo_owner = repo.split("/")[0];
    const repo_name = repo.split("/")[1];
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);
    const results_per_page = 100; // the max possible value

    let current_page_openPRs = 0;
    let openPRs = [];
    let page = 1;
    do {
        const openPRs_raw = await octokit.rest.pulls.list({
            owner: repo_owner,
            repo: repo_name,
            state: 'open',
            page: page++,
            per_page: results_per_page
        });
        const openPRs_data = openPRs_raw.data;
        openPRs = openPRs.concat(openPRs_data);
        current_page_openPRs = openPRs_data.length;
    } while (current_page_openPRs === results_per_page)

    core.debug(`Found ${openPRs.length} open PRs`);

    let to_close = [];
    let stale = [];

    const today = new Date();

    for (const pr of openPRs) {
        const isToClose = pr.labels.filter(function (label) {
            return label.name === "to close"
        }).length > 0;
        const isStale = pr.labels.filter(function (label) {
            return label.name === "stale"
        }).length > 0;
        if (!isToClose) {
            let latest_comment_date = null;
            let comments = (await octokit.rest.issues.listComments({
                issue_number: pr.number,
                owner: repo_owner,
                repo: repo_name,
                per_page: results_per_page
            })).data;
            if (comments.length) {
                comments = comments.filter(comment => !(comment.user.login == "Polkadot-Forum" && comment.user.type == "Bot"));
                let created_ats = comments.map(comment => comment.created_at);
                latest_comment_date = created_ats.reduce((a, b) => a > b ? a : b);
                console.log(latest_comment_date, "||", pr.updated_at, "||", latest_comment_date == pr.updated_at, "||", pr.number)
            }
            let deadline = new Date(latest_comment_date || pr.updated_at)
            deadline.setDate(deadline.getDate() + staleTimeout);
            if (today > deadline) {
                if (isStale) {
                    core.debug(`Adding "to close" label to PR #${pr.number}`);
                    await octokit.rest.issues.removeLabel({
                        issue_number: pr.number,
                        owner: repo_owner,
                        repo: repo_name,
                        name: "stale"
                    })
                    await octokit.rest.issues.addLabels({
                        issue_number: pr.number,
                        owner: repo_owner,
                        repo: repo_name,
                        labels: ["to close"]
                    })
                    to_close.push(pr.number)
                } else {
                    core.debug(`Adding "stale" label to PR #${pr.number}`);
                    await octokit.rest.issues.addLabels({
                        issue_number: pr.number,
                        owner: repo_owner,
                        repo: repo_name,
                        labels: ["stale"]
                    })
                    stale.push(pr.number)
                }
            }
        }
    }

    if (to_close.length || stale.length) {
        let to_close_message = ""
        if (to_close.length) {
            to_close_message = "To close: "
            for (const to_close_pr of to_close) {
                to_close_message += `[#${to_close_pr}](https://github.com/${repo_owner}/${repo_name}/pull/${to_close_pr}), `
            }
            to_close_message = to_close_message.slice(0, -2) + '\n'
        }
        let stale_message = ""
        if (stale.length) {
            stale_message = "Put in stale: "
            for (const stale_pr of stale) {
                stale_message += `[#${stale_pr}](https://github.com/${repo_owner}/${repo_name}/pull/${stale_pr}), `
            }
            stale_message = stale_message.slice(0, -2)
        }
        const message =
            `STALE REPORT (${repo_name}):` + '\n' +
            `--------------------` + '\n' +
            `${to_close_message}` +
            `${stale_message}`
        core.debug(`Output message: ${message}`);
        core.setOutput("message", message);
    }
}

run();
