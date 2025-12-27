import { SessionStatus } from "./provider";

export interface TrackedSession {
    // ─────────────────────────────────────────────────────────────────────────
    // IDENTITY
    // ─────────────────────────────────────────────────────────────────────────

    /** Unique ID for this tracked session */
    id: string;

    /** Provider name (e.g., "jules") */
    provider: string;

    /** Remote session ID from provider */
    remoteSessionId: string;

    /** URL to view in provider's console */
    consoleUrl?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // CONTEXT
    // ─────────────────────────────────────────────────────────────────────────

    /** Repository in "owner/repo" format */
    repo: string;

    /** Starting branch */
    branch: string;

    /** Original task prompt */
    prompt: string;

    /** Session title */
    title?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // PARENT CONTEXT (OpenCode session that spawned this)
    // ─────────────────────────────────────────────────────────────────────────

    /** Parent OpenCode session ID */
    parentSessionId?: string;

    /** Parent message ID (for targeted notifications) */
    parentMessageId?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────

    /** Current status */
    status: SessionStatus;

    /** Last known status (for detecting changes) */
    lastKnownStatus?: SessionStatus;

    /** Status message */
    statusMessage?: string;

    /** Structured error information */
    error?: {
        code: string;
        message: string;
        timestamp: string;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // REVIEW STATE
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether auto-review is enabled */
    autoReview: boolean;

    /** Current review round (0 = not reviewed yet) */
    reviewRound: number;

    /** Max review rounds before stopping */
    maxReviewRounds: number;

    /** Expected outcomes for structured review verification */
    expectedOutcomes?: string[];

    /** Full review history (latest is most detailed) */
    reviewHistory: ReviewHistoryEntry[];

    /** Last review result (quick access to latest) */
    lastReviewResult?: {
        approved: boolean;
        issues: number;
        feedback: string;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // OUTPUTS
    // ─────────────────────────────────────────────────────────────────────────

    /** PR URL if created */
    prUrl?: string;

    /** Last fetched patch (for diffing) */
    lastPatchHash?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // MERGE STATE
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether auto-merge is enabled */
    autoMerge: boolean;

    /** Merge method */
    mergeMethod?: "merge" | "squash" | "rebase";

    /** Whether PR has been merged */
    merged: boolean;

    /** Merge commit SHA */
    mergeCommitSha?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // CONTROL FLAGS
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether actively watching (polling) this session */
    watching: boolean;

    /** Whether an operation is in flight (prevents duplicate ops) */
    inFlight: boolean;

    // ─────────────────────────────────────────────────────────────────────────
    // TIMESTAMPS
    // ─────────────────────────────────────────────────────────────────────────

    createdAt: string; // ISO 8601
    updatedAt: string;
    completedAt?: string;
}

export interface CloudWorkersState {
    /** Schema version for migrations */
    schemaVersion: number;

    /** All tracked sessions */
    sessions: TrackedSession[];

    /** Last poll timestamp */
    lastPollAt?: string;
}

/**
 * Record of a single review round.
 * Latest entry has full feedback, older entries have brief summary.
 */
export interface ReviewHistoryEntry {
    /** Review round number (1-indexed) */
    round: number;

    /** When this review occurred */
    timestamp: string;

    /** Whether the review passed */
    approved: boolean;

    /** Number of issues found */
    issues: number;

    /** Full feedback (for latest review) */
    feedback: string;

    /** Brief summary (for older reviews, to keep payload small) */
    summary?: string;

    /** Which outcomes were satisfied (if tracked) */
    outcomeResults?: {
        outcome: string;
        satisfied: boolean;
    }[];
}
