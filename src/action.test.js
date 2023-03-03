import * as core from '@actions/core';
import * as github from '@actions/github';
// choose between deliveries or applications
import * as context from './context.applications.test.json' assert { type: "json" };
import * as dotenv from 'dotenv';
dotenv.config();

async function getAllResultsFromPagination(octokitMethod, params) {
    let current_page = 0;
    let results = [];
    let page = 1;
    const results_per_page = 100; // the max possible value
    do {
        const data = (await octokitMethod({
            ...params,
            page: page++,
            per_page: results_per_page
        })).data;
        results = results.concat(data);
        current_page = data.length;
    } while (current_page === results_per_page)
    return results;
}

async function run() {
    const staleTimeout = 14;
    const context_json = context.default;
    const repo = context_json.repository;
    const repo_owner = repo.split("/")[0];
    const repo_name = repo.split("/")[1];
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);

    let openPRs = await getAllResultsFromPagination(
        octokit.rest.pulls.list, 
        {
            owner: repo_owner,
            repo: repo_name,
            state: 'open'
        }
    );

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
        if (true) {
            let events = await getAllResultsFromPagination(
                octokit.rest.issues.listEventsForTimeline, 
                {
                    issue_number: pr.number,
                    owner: repo_owner,
                    repo: repo_name
                }
            );
            // take last event, and if it's a comment made from the Polkadot-Forum bot, take the one before
            let last_event = events[events.length - 1];
            if (last_event.event == "commented" && last_event.actor.login == "Polkadot-Forum") {
                last_event = events[events.length - 2];
            }
            let deadline = new Date(last_event.created_at || last_event.submitted_at)
            deadline.setDate(deadline.getDate() + staleTimeout);
            console.log(`PR #${pr.number} last event: ${last_event.event} on ${last_event.created_at || last_event.submitted_at} (deadline: ${deadline})`)
            if (false) {
                if (isStale) {
                    core.debug(`Adding "to close" label to PR #${pr.number}`);
                    // await octokit.rest.issues.removeLabel({
                    //     issue_number: pr.number,
                    //     owner: repo_owner,
                    //     repo: repo_name,
                    //     name: "stale"
                    // })
                    // await octokit.rest.issues.addLabels({
                    //     issue_number: pr.number,
                    //     owner: repo_owner,
                    //     repo: repo_name,
                    //     labels: ["to close"]
                    // })
                    to_close.push(pr.number)
                } else {
                    core.debug(`Adding "stale" label to PR #${pr.number}`);
                    // await octokit.rest.issues.addLabels({
                    //     issue_number: pr.number,
                    //     owner: repo_owner,
                    //     repo: repo_name,
                    //     labels: ["stale"]
                    // })
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
