import fs from "fs/promises";
import path from "path";
import { TrackedSession, CloudWorkersState } from "./interfaces/types";

export class SessionManager {
    private stateFilePath: string;
    private state: CloudWorkersState = {
        schemaVersion: 1,
        sessions: [],
    };

    constructor(workspaceDir: string) {
        this.stateFilePath = path.join(
            workspaceDir,
            ".opencode",
            "cloud-workers",
            "state.json"
        );
    }

    async load(): Promise<void> {
        try {
            const content = await fs.readFile(this.stateFilePath, "utf-8");
            const loaded = JSON.parse(content);
            // Basic validation or migration could happen here
            this.state = loaded;
        } catch (error) {
            if ((error as any).code === "ENOENT") {
                // File doesn't exist, initialize empty
                await this.save();
            } else {
                console.error("Failed to load cloud worker state:", error);
            }
        }
    }

    async save(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
            await fs.writeFile(
                this.stateFilePath,
                JSON.stringify(this.state, null, 2),
                "utf-8"
            );
        } catch (error) {
            console.error("Failed to save cloud worker state:", error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    addSession(session: TrackedSession): void {
        this.state.sessions.push(session);
        this.save();
    }

    getSession(id: string): TrackedSession | undefined {
        return this.state.sessions.find((s) => s.id === id);
    }

    updateSession(id: string, updates: Partial<TrackedSession>): void {
        const index = this.state.sessions.findIndex((s) => s.id === id);
        if (index !== -1) {
            this.state.sessions[index] = {
                ...this.state.sessions[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            this.save();
        }
    }

    listSessions(): TrackedSession[] {
        return this.state.sessions;
    }

    getPendingSessions(): TrackedSession[] {
        return this.state.sessions.filter(
            (s) =>
                s.watching &&
                !["failed", "cancelled"].includes(s.status) // WE KEEP COMPLETED for Review phase
        );
    }
}
