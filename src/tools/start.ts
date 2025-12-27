import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { RemoteWorkerProvider } from "../core/interfaces/provider";
import { SessionManager } from "../core/session-manager";
import { PluginInput } from "@opencode-ai/plugin";
import { TrackedSession } from "../core/interfaces/types";
import { v4 as uuidv4 } from "uuid";
import type { CloudWorkersConfig } from "../config/types";
import { extractOutcomes } from "../core/outcome-extractor";

/**
 * Build an enhanced prompt with OpenSpec instructions.
 */
function buildEnhancedPrompt(
    originalPrompt: string,
    outcomes: string[],
    title?: string
): string {
    const taskSlug = (title || "task")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30);

    const outcomesSection = outcomes.length > 0
        ? `\n\nEXPECTED OUTCOMES:\n${outcomes.map(o => `- ${o}`).join("\n")}`
        : "";

    return `${originalPrompt}
${outcomesSection}

CHANGE TRACKING:
Please create \`openspec/changes/${taskSlug}.md\` with:
1. Your implementation plan (checklist format)
2. Progress updates as you complete items
3. Final summary before creating PR

This helps us review your work efficiently.`;
}

export const createStartTool = (
    provider: RemoteWorkerProvider,
    sessionManager: SessionManager,
    ctx: PluginInput,
    config: CloudWorkersConfig
) => {
    return tool({
        description: "Start a new cloud worker session (e.g. Jules) to perform a task asynchronously.",
        args: {
            prompt: z.string().describe("Detailed description of the task to perform"),
            title: z.string().optional().describe("Short title for the session/PR"),
            branch: z.string().optional().describe("Winning branch to start from (defaults to current)"),
            repo: z.string().optional().describe("Repository URL (defaults to current)"),
            auto_review: z.boolean().optional().describe("Whether to enable automatic AI review loop (defaults from config)"),
            require_plan: z.boolean().default(false).describe("Whether to require manual plan approval"),
        },
        execute: async (args) => {
            // 1. Resolve Context
            let repo = args.repo;
            if (!repo) {
                try {
                    const remote = await ctx.$`git config --get remote.origin.url`.text();
                    repo = remote.trim();
                } catch (e) {
                    throw new Error("Could not determine repository URL. Please provide 'repo' argument.");
                }
            }

            let branch = args.branch;
            if (!branch) {
                try {
                    const current = await ctx.$`git rev-parse --abbrev-ref HEAD`.text();
                    branch = current.trim();
                } catch (e) {
                    branch = "main";
                }
            }

            // 2. Extract expected outcomes from prompt
            console.log("[CloudWorkers] Extracting expected outcomes...");
            const expectedOutcomes = await extractOutcomes(ctx, args.prompt);
            console.log(`[CloudWorkers] Extracted ${expectedOutcomes.length} outcomes`);

            // 3. Build enhanced prompt with OpenSpec instructions
            const enhancedPrompt = buildEnhancedPrompt(args.prompt, expectedOutcomes, args.title);

            // 4. Create Session on Provider
            const result = await provider.createSession({
                prompt: enhancedPrompt,
                repo: repo!,
                branch: branch,
                title: args.title,
                requirePlanApproval: args.require_plan,
                autoCreatePR: true,
            });

            // 5. Track Session (use config defaults where args not specified)
            const session: TrackedSession = {
                id: uuidv4(),
                provider: provider.name,
                remoteSessionId: result.sessionId,
                consoleUrl: result.consoleUrl,
                repo: repo!,
                branch: branch!,
                prompt: args.prompt, // Store original prompt
                title: args.title,
                status: result.status,
                autoReview: args.auto_review ?? config.auto_review,
                reviewRound: 0,
                maxReviewRounds: config.max_review_rounds,
                expectedOutcomes, // NEW: store extracted outcomes
                reviewHistory: [], // NEW: empty history
                autoMerge: false,
                merged: false,
                watching: true,
                inFlight: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            sessionManager.addSession(session);

            return `Started cloud worker session!
ID: ${session.id}
Remote ID: ${session.remoteSessionId}
Status: ${session.status}
Console: ${session.consoleUrl || "N/A"}

Expected Outcomes:
${expectedOutcomes.map(o => `  • ${o}`).join("\n")}

I will poll for updates and auto-review when complete.`;
        },
    });
};
