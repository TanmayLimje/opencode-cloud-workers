import {
    RemoteWorkerProvider,
    CreateSessionParams,
    CreateSessionResult,
    SessionState,
    SessionArtifacts,
} from "../../core/interfaces/provider";
import { JulesClient } from "./client";
import { mapJulesStatus } from "./state-machine";

export interface JulesProviderConfig {
    apiKey: string;
    /** Base URL for Jules API (default: https://jules.googleapis.com) */
    baseUrl?: string;
    /** API version (default: v1alpha) */
    apiVersion?: string;
}

export class JulesProvider implements RemoteWorkerProvider {
    readonly name = "jules";
    readonly version = "0.1.0";
    private client: JulesClient;

    constructor(config: JulesProviderConfig) {
        this.client = new JulesClient({
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || "https://jules.googleapis.com",
            apiVersion: config.apiVersion || "v1alpha",
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
        // 1. Resolve source name
        // Input: "owner/repo" or "https://github.com/owner/repo"
        // Output: "sources/github/owner/repo"
        const repoPath = params.repo
            .replace("https://github.com/", "")
            .replace(".git", "");
        const sourceName = `sources/github/${repoPath}`;

        // 2. Resolve starting branch
        const startingBranch = params.branch || "main";

        // 3. Call API
        const session = await this.client.createSession({
            prompt: params.prompt,
            sourceName,
            startingBranch,
            title: params.title,
            requirePlanApproval: params.requirePlanApproval,
            // If we want auto-PR, we use AUTO_CREATE_PR.
            // If we opt-out, we might default to UNSPECIFIED or manual.
            // For this MVP, we map boolean to the enum if provided.
            automationMode: params.autoCreatePR ? "AUTO_CREATE_PR" : "AUTOMATION_MODE_UNSPECIFIED",
        });

        return {
            sessionId: session.id, // Or name? Use id for simpler tracking
            status: mapJulesStatus(session.state),
            consoleUrl: session.url,
        };
    }

    async getSession(sessionId: string): Promise<SessionState> {
        const session = await this.client.getSession(sessionId);

        return {
            sessionId: session.id,
            status: mapJulesStatus(session.state),
            statusMessage: session.state, // Raw state as message for now
            createdAt: new Date(session.createTime),
            updatedAt: new Date(session.updateTime),
            details: {
                rawState: session.state,
                url: session.url,
            },
        };
    }

    async cancelSession(sessionId: string): Promise<void> {
        await this.client.cancelSession(sessionId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTERACTION
    // ─────────────────────────────────────────────────────────────────────────

    async sendFeedback(sessionId: string, message: string): Promise<void> {
        await this.client.sendMessage(sessionId, message);
    }

    async approvePlan(sessionId: string): Promise<void> {
        await this.client.approvePlan(sessionId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OUTPUTS
    // ─────────────────────────────────────────────────────────────────────────

    async getArtifacts(sessionId: string): Promise<SessionArtifacts> {
        const response = await this.client.getActivities(sessionId);
        const session = await this.client.getSession(sessionId);

        // 1. Find Patch
        // We look for the most recent activity with a changeSet and a gitPatch
        const patchActivity = response.activities
            .filter((a) => a.changeSet?.gitPatch?.unidiffPatch)
            .sort(
                (a, b) =>
                    new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
            )[0];

        const patch = patchActivity?.changeSet?.gitPatch?.unidiffPatch
            ? {
                content: patchActivity.changeSet.gitPatch.unidiffPatch,
                filesChanged: patchActivity.changeSet.filesChanged ?? [],
                additions: 0, // Not provided by activity explicitly usually
                deletions: 0,
            }
            : undefined;

        // 2. Find PR
        // PR details are in session.outputs
        const pr = session.outputs?.find((o) => o.pullRequest)?.pullRequest;

        return {
            patch,
            prUrl: pr?.url,
            changesSummary: pr?.description || pr?.title,
        };
    }
}
