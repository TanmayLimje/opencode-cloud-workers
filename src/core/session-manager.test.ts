import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { SessionManager } from "./session-manager"
import { TrackedSession } from "./interfaces/types"
import fs from "fs/promises"
import path from "path"
import os from "os"

describe("SessionManager", () => {
    let tempDir: string
    let manager: SessionManager

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cloud-workers-test-"))
        manager = new SessionManager(tempDir)
        await manager.load()
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    const createMockSession = (overrides: Partial<TrackedSession> = {}): TrackedSession => ({
        id: "test-session-1",
        provider: "jules",
        remoteSessionId: "remote-123",
        repo: "owner/repo",
        branch: "main",
        prompt: "Test task",
        status: "queued",
        autoReview: true,
        reviewRound: 0,
        maxReviewRounds: 3,
        reviewHistory: [],
        autoMerge: false,
        merged: false,
        watching: true,
        inFlight: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    })

    describe("addSession", () => {
        it("should add a session and persist it", async () => {
            const session = createMockSession()
            manager.addSession(session)

            const retrieved = manager.getSession(session.id)
            expect(retrieved).toBeDefined()
            expect(retrieved?.id).toBe(session.id)
            expect(retrieved?.provider).toBe("jules")
        })

        it("should allow multiple sessions", () => {
            const session1 = createMockSession({ id: "session-1" })
            const session2 = createMockSession({ id: "session-2" })

            manager.addSession(session1)
            manager.addSession(session2)

            expect(manager.listSessions()).toHaveLength(2)
        })
    })

    describe("getSession", () => {
        it("should return undefined for non-existent session", () => {
            const result = manager.getSession("non-existent")
            expect(result).toBeUndefined()
        })

        it("should return the correct session by id", () => {
            const session = createMockSession({ id: "unique-id" })
            manager.addSession(session)

            const result = manager.getSession("unique-id")
            expect(result?.id).toBe("unique-id")
        })
    })

    describe("updateSession", () => {
        it("should update session fields", () => {
            const session = createMockSession()
            manager.addSession(session)

            manager.updateSession(session.id, { status: "in_progress" })

            const updated = manager.getSession(session.id)
            expect(updated?.status).toBe("in_progress")
        })

        it("should update updatedAt timestamp", () => {
            const pastTimestamp = "2020-01-01T00:00:00.000Z"
            const session = createMockSession({ updatedAt: pastTimestamp })
            manager.addSession(session)

            manager.updateSession(session.id, { status: "completed" })

            const updated = manager.getSession(session.id)
            expect(updated?.updatedAt).not.toBe(pastTimestamp)
        })

        it("should not modify non-existent sessions", () => {
            manager.updateSession("non-existent", { status: "completed" })
            expect(manager.listSessions()).toHaveLength(0)
        })
    })

    describe("listSessions", () => {
        it("should return empty array when no sessions", () => {
            expect(manager.listSessions()).toEqual([])
        })

        it("should return all sessions", () => {
            manager.addSession(createMockSession({ id: "1" }))
            manager.addSession(createMockSession({ id: "2" }))
            manager.addSession(createMockSession({ id: "3" }))

            expect(manager.listSessions()).toHaveLength(3)
        })
    })

    describe("getPendingSessions", () => {
        it("should return only watching sessions not in terminal state", () => {
            manager.addSession(createMockSession({ id: "1", watching: true, status: "queued" }))
            manager.addSession(createMockSession({ id: "2", watching: true, status: "in_progress" }))
            manager.addSession(createMockSession({ id: "3", watching: false, status: "queued" }))
            manager.addSession(createMockSession({ id: "4", watching: true, status: "failed" }))
            manager.addSession(createMockSession({ id: "5", watching: true, status: "cancelled" }))

            const pending = manager.getPendingSessions()

            expect(pending).toHaveLength(2)
            expect(pending.map(s => s.id)).toContain("1")
            expect(pending.map(s => s.id)).toContain("2")
        })

        it("should include completed sessions (for review phase)", () => {
            manager.addSession(createMockSession({ id: "1", watching: true, status: "completed" }))

            const pending = manager.getPendingSessions()
            expect(pending).toHaveLength(1)
        })
    })

    describe("persistence", () => {
        it("should persist sessions across manager instances", async () => {
            const session = createMockSession()
            manager.addSession(session)
            await new Promise((resolve) => setTimeout(resolve, 50))

            const newManager = new SessionManager(tempDir)
            await newManager.load()

            const retrieved = newManager.getSession(session.id)
            expect(retrieved).toBeDefined()
            expect(retrieved?.id).toBe(session.id)
        })

        it("should create state file in correct location", async () => {
            const session = createMockSession()
            manager.addSession(session)

            const statePath = path.join(tempDir, ".opencode", "cloud-workers", "state.json")
            const exists = await fs.access(statePath).then(() => true).catch(() => false)
            expect(exists).toBe(true)
        })
    })
})
