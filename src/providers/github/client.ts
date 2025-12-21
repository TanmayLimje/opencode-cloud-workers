import { Octokit } from "octokit";

export class GitHubClient {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    async mergePullRequest(owner: string, repo: string, number: number): Promise<void> {
        try {
            await this.octokit.rest.pulls.merge({
                owner,
                repo,
                pull_number: number,
                merge_method: "squash",
            });
        } catch (error: any) {
            // Identify if it's a conflict
            if (error.status === 405) {
                throw new Error("Merge conflict: The Pull Request is not mergeable.");
            }
            throw new Error(`Failed to merge PR #${number}: ${error.message}`);
        }
    }

    async getPullRequest(owner: string, repo: string, number: number) {
        const { data } = await this.octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: number
        });
        return data;
    }
}
