import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { RemoteWorkerProvider } from "../core/interfaces/provider";
import { SessionManager } from "../core/session-manager";
import { GitHubClient } from "../providers/github/client";

export const createMergeTool = (
    provider: RemoteWorkerProvider,
    sessionManager: SessionManager
) => {
    return tool({
        description: "Merge the Pull Request associated with a completed cloud worker session.",
        args: {
            session_id: z.string().describe("The local session ID"),
        },
        execute: async (args) => {
            const session = sessionManager.getSession(args.session_id);
            if (!session) {
                throw new Error(`Session ${args.session_id} not found.`);
            }

            if (session.status !== "completed") {
                throw new Error(`Session is not completed (current status: ${session.status}). Cannot merge yet.`);
            }

            // Check for GITHUB_TOKEN
            const token = process.env.GITHUB_TOKEN;
            if (!token) {
                throw new Error("GITHUB_TOKEN not found in environment. Cannot perform merge.");
            }

            const github = new GitHubClient(token);

            // 1. Get PR Details
            // We need to extract owner/repo/number from the PR URL stored in session artifacts or details
            // Since JulesProvider stores PR URL in session.details usually, or we can fetch artifacts.

            let prUrl = session.consoleUrl;
            // HACK: Jules usually returns the PR URL as the 'url' field in alpha, or we use artifacts.
            // Let's rely on provider.getArtifacts() to be sure.

            const artifacts = await provider.getArtifacts(session.remoteSessionId);
            if (!artifacts.prUrl) {
                throw new Error("No Pull Request URL found for this session.");
            }

            // Parse URL: https://github.com/owner/repo/pull/123
            const match = artifacts.prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
            if (!match) {
                throw new Error(`Invalid PR URL format: ${artifacts.prUrl}`);
            }

            const [, owner, repo, numberStr] = match;
            const number = parseInt(numberStr, 10);

            // 2. Perform Merge
            await github.mergePullRequest(owner, repo, number);

            // 3. Update State
            sessionManager.updateSession(session.id, {
                merged: true,
                statusMessage: "Merged successfully",
                watching: false
            });

            return `Successfully merged PR #${number} in ${owner}/${repo}!`;
        },
    });
};
