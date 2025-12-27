import { SessionManager } from "./session-manager";
import { RemoteWorkerProvider } from "./interfaces/provider";
import { PluginInput } from "@opencode-ai/plugin";
import { Reviewer } from "./reviewer";
import type { ReviewHistoryEntry } from "./interfaces/types";
import { fetchOpenSpecFromPR, parsePrUrl } from "./openspec-parser";

export class CloudWorkerLoop {
    private intervalId?: NodeJS.Timeout;
    private isPolling = false;
    private reviewer: Reviewer;

    constructor(
        private sessionManager: SessionManager,
        private provider: RemoteWorkerProvider,
        private ctx: PluginInput
    ) {
        this.reviewer = new Reviewer(ctx);
    }

    start(intervalMs = 30000) {
        if (this.intervalId) return;

        // Initial poll
        this.poll();

        // Start loop
        this.intervalId = setInterval(() => {
            this.poll();
        }, intervalMs);

        console.log("[CloudWorkerLoop] Started background polling.");
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.log("[CloudWorkerLoop] Stopped background polling.");
        }
    }

    private async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const pendingSessions = this.sessionManager.getPendingSessions();
            if (pendingSessions.length === 0) return;

            for (const session of pendingSessions) {
                try {
                    // Avoid re-reviewing if already approved or merged
                    if (session.status === "completed" && (session.merged || session.statusMessage === "Approved")) {
                        // Stop watching if it's really done
                        if (session.watching) {
                            this.sessionManager.updateSession(session.id, { watching: false });
                        }
                        continue;
                    }

                    // 1. Fetch Remote State
                    const remoteState = await this.provider.getSession(session.remoteSessionId);

                    // 2. Check for Changes or Completion
                    if (remoteState.status !== session.status) {
                        console.log(`[CloudWorkerLoop] Session ${session.id} changed: ${session.status} -> ${remoteState.status}`);

                        // Update Local State
                        this.sessionManager.updateSession(session.id, {
                            status: remoteState.status,
                            statusMessage: remoteState.statusMessage,
                            consoleUrl: remoteState.details?.url as string | undefined,
                            updatedAt: new Date().toISOString()
                        });

                        // Notify User
                        await this.notifyUser(
                            `Cloud Worker Update: ${remoteState.status}`,
                            `Session for "${session.prompt.slice(0, 30)}..." is now ${remoteState.status}.`,
                            remoteState.status === "completed" ? (session.autoReview ? "info" : "success") : "info"
                        );
                    }

                    // 3. Handle Completion & Auto-Review
                    if (remoteState.status === "completed" && session.autoReview) {
                        // Check if we already reviewed this round (optimization needed later, for now prompt logic handles it)
                        // Actually, we need to know if we are waiting for a review or if it's just fresh.
                        // We will add a 'reviewing' state or simple check.

                        if (session.inFlight) continue; // Already doing something

                        console.log(`[CloudWorkerLoop] Session ${session.id} completed. Starting Auto-Review...`);
                        this.sessionManager.updateSession(session.id, { inFlight: true });

                        try {
                            // Fetch Patch
                            const artifacts = await this.provider.getArtifacts(session.remoteSessionId);

                            if (!artifacts.patch?.content) {
                                throw new Error("No patch content found to review");
                            }

                            // Try to fetch OpenSpec from PR (if prUrl exists)
                            let openspec = null;
                            if (session.prUrl) {
                                const prInfo = parsePrUrl(session.prUrl);
                                const githubToken = process.env.GITHUB_TOKEN;
                                if (prInfo && githubToken) {
                                    console.log(`[CloudWorkerLoop] Fetching OpenSpec from PR #${prInfo.number}...`);
                                    openspec = await fetchOpenSpecFromPR(
                                        githubToken,
                                        prInfo.owner,
                                        prInfo.repo,
                                        prInfo.number
                                    );
                                    if (openspec) {
                                        console.log(`[CloudWorkerLoop] Found OpenSpec: ${openspec.title}`);
                                    }
                                }
                            }

                            // Perform Review (with optional OpenSpec)
                            const review = await this.reviewer.review(session, artifacts.patch.content, openspec);

                            console.log(`[CloudWorkerLoop] Review result for ${session.id}: Approved=${review.approved}`);

                            // Build review history entry
                            const newRound = (session.reviewRound || 0) + 1;
                            const historyEntry: ReviewHistoryEntry = {
                                round: newRound,
                                timestamp: new Date().toISOString(),
                                approved: review.approved,
                                issues: review.issues,
                                feedback: review.feedback,
                            };

                            // Summarize older entries (keep only last 2 with full feedback)
                            const existingHistory = session.reviewHistory || [];
                            const updatedHistory = existingHistory.map((entry, idx) => {
                                if (idx < existingHistory.length - 1) {
                                    // Summarize older entries
                                    return {
                                        ...entry,
                                        feedback: "", // Clear full feedback
                                        summary: entry.summary || `Round ${entry.round}: ${entry.issues} issues`
                                    };
                                }
                                return entry;
                            });
                            updatedHistory.push(historyEntry);

                            if (review.approved) {
                                this.sessionManager.updateSession(session.id, {
                                    statusMessage: "Approved",
                                    inFlight: false,
                                    watching: false,
                                    reviewRound: newRound,
                                    reviewHistory: updatedHistory,
                                    lastReviewResult: {
                                        approved: true,
                                        issues: review.issues,
                                        feedback: review.feedback
                                    }
                                });
                                await this.notifyUser("Worker Approved! ✅", "AI Review passed. Ready to merge.", "success");
                            } else {
                                // Feedback Loop
                                if (newRound < (session.maxReviewRounds || 3)) {
                                    await this.provider.sendFeedback(session.remoteSessionId, review.feedback);

                                    this.sessionManager.updateSession(session.id, {
                                        status: "in_progress",
                                        reviewRound: newRound,
                                        reviewHistory: updatedHistory,
                                        lastReviewResult: {
                                            approved: false,
                                            issues: review.issues,
                                            feedback: review.feedback
                                        },
                                        inFlight: false,
                                        statusMessage: `Feedback sent (round ${newRound})`
                                    });

                                    await this.notifyUser("Worker Feedback Sent ↺", `Review failed (${review.issues} issues). Jules is fixing it...`, "warning");
                                } else {
                                    this.sessionManager.updateSession(session.id, {
                                        status: "failed",
                                        statusMessage: "Max review rounds reached",
                                        reviewRound: newRound,
                                        reviewHistory: updatedHistory,
                                        lastReviewResult: {
                                            approved: false,
                                            issues: review.issues,
                                            feedback: review.feedback
                                        },
                                        inFlight: false,
                                        watching: false
                                    });
                                    await this.notifyUser("Worker Failed Review ❌", "Max review rounds reached. Please check manually.", "error");
                                }
                            }

                        } catch (e: any) {
                            console.error("Review loop failed", e);
                            this.sessionManager.updateSession(session.id, {
                                inFlight: false,
                                error: {
                                    code: "REVIEW_ERROR",
                                    message: e?.message || "Review process failed",
                                    timestamp: new Date().toISOString()
                                }
                            });
                        }
                    }

                } catch (error: any) {
                    console.error(`[CloudWorkerLoop] Failed to poll session ${session.id}:`, error);
                    this.sessionManager.updateSession(session.id, {
                        error: {
                            code: "POLL_ERROR",
                            message: error?.message || "Polling failed",
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            }
        } catch (error) {
            console.error("[CloudWorkerLoop] Global poll error:", error);
        } finally {
            this.isPolling = false;
        }
    }

    private async notifyUser(title: string, message: string, variant: "info" | "success" | "warning" | "error" = "info") {
        try {
            // Use TUI toast if available (undocumented API used by oh-my-opencode)
            const clientAny = this.ctx.client as any;
            if (clientAny.tui?.showToast) {
                await clientAny.tui.showToast({
                    body: {
                        title,
                        message,
                        variant,
                        duration: 5000
                    }
                });
            } else {
                // Fallback to console
                console.log(`[NOTIFICATION] ${title}: ${message}`);
            }
        } catch (e) {
            console.error("Failed to show notification:", e);
        }
    }
}
