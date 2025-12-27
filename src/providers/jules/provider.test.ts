import { describe, it, expect, vi, beforeEach } from "vitest";
import { JulesProvider } from "./provider";
import { JulesClient } from "./client";

// Mock JulesClient
vi.mock("./client", () => {
    return {
        JulesClient: vi.fn().mockImplementation(() => ({
            createSession: vi.fn(),
            getSession: vi.fn(),
            getActivities: vi.fn(),
            sendMessage: vi.fn(),
        })),
    };
});

describe("JulesProvider", () => {
    let provider: JulesProvider;
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new JulesProvider({ apiKey: "test-key" });
        // Access the mocked client instance
        mockClient = (provider as any).client;
    });

    describe("createSession", () => {
        it("should format source name correctly for simplified repo input", async () => {
            mockClient.createSession.mockResolvedValue({
                id: "sess-123",
                state: "QUEUED",
                url: "http://console",
            });

            const result = await provider.createSession({
                prompt: "do work",
                repo: "owner/repo",
                branch: "main",
            });

            expect(mockClient.createSession).toHaveBeenCalledWith(expect.objectContaining({
                sourceName: "sources/github/owner/repo",
            }));
            expect(result.sessionId).toBe("sess-123");
        });

        it("should format source name correctly for full https url", async () => {
            mockClient.createSession.mockResolvedValue({
                id: "sess-123",
                state: "QUEUED",
                url: "http://console",
            });

            await provider.createSession({
                prompt: "do work",
                repo: "https://github.com/owner/repo.git",
                branch: "dev",
            });

            expect(mockClient.createSession).toHaveBeenCalledWith(expect.objectContaining({
                sourceName: "sources/github/owner/repo",
                startingBranch: "dev",
            }));
        });
    });

    describe("getArtifacts", () => {
        it("should return patch from activities if present", async () => {
            const mockActivities = {
                activities: [
                    {
                        createTime: "2023-01-01T10:00:00Z",
                        changeSet: {
                            gitPatch: {
                                unidiffPatch: "diff --git a/file.ts b/file.ts...",
                            },
                        },
                    },
                ],
            };
            mockClient.getActivities.mockResolvedValue(mockActivities);
            mockClient.getSession.mockResolvedValue({ outputs: [] }); // No PR

            const artifacts = await provider.getArtifacts("sess-123");

            expect(artifacts.patch).toBeDefined();
            expect(artifacts.patch?.content).toContain("diff --git");
        });

        it("should return PR info if present in session outputs", async () => {
            mockClient.getActivities.mockResolvedValue({ activities: [] });
            mockClient.getSession.mockResolvedValue({
                outputs: [
                    {
                        pullRequest: {
                            url: "http://github.com/pr/1",
                            title: "Fix bug",
                        },
                    },
                ],
            });

            const artifacts = await provider.getArtifacts("sess-123");

            expect(artifacts.prUrl).toBe("http://github.com/pr/1");
            expect(artifacts.changesSummary).toBe("Fix bug");
        });

        it("should handle missing artifacts gracefully", async () => {
            mockClient.getActivities.mockResolvedValue({ activities: [] });
            mockClient.getSession.mockResolvedValue({ outputs: [] });

            const artifacts = await provider.getArtifacts("sess-123");

            expect(artifacts.patch).toBeUndefined();
            expect(artifacts.prUrl).toBeUndefined();
        });
    });
});
