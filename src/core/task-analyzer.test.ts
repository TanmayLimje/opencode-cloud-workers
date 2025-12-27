import { describe, it, expect } from "vitest";
import { analyzeTask, getSuggestionMessage } from "./task-analyzer";

describe("analyzeTask", () => {
    it("should detect high complexity for multi-file refactoring", () => {
        const result = analyzeTask("Refactor all services across the codebase to use dependency injection and migrate all modules");

        expect(result.complexity).toBe("high");
        expect(result.shouldOffload).toBe(true);
        expect(result.signals.length).toBeGreaterThan(0);
    });

    it("should detect medium complexity for comprehensive tests", () => {
        const result = analyzeTask("Add comprehensive tests to the auth module");

        expect(result.complexity).toBe("medium");
    });

    it("should detect low complexity for simple tasks", () => {
        const result = analyzeTask("Fix typo in readme");

        expect(result.complexity).toBe("low");
        expect(result.shouldOffload).toBe(false);
    });

    it("should detect file count mentions", () => {
        const result = analyzeTask("Update 15 files with new API endpoints");

        expect(result.signals).toContain("file-count: 15");
    });

    it("should recognize scope keywords", () => {
        const result = analyzeTask("Apply changes across the codebase");

        expect(result.signals.some(s => s.includes("scope"))).toBe(true);
    });

    it("should estimate higher time for high complexity", () => {
        const lowResult = analyzeTask("Fix typo");
        const highResult = analyzeTask("Migrate all services to use new database schema");

        expect(highResult.estimatedMinutes).toBeGreaterThan(lowResult.estimatedMinutes);
    });
});

describe("getSuggestionMessage", () => {
    it("should return null for simple tasks", () => {
        const message = getSuggestionMessage("Fix typo in readme");

        expect(message).toBeNull();
    });

    it("should return suggestion for complex tasks", () => {
        const message = getSuggestionMessage("Refactor all modules to use TypeScript strict mode");

        expect(message).not.toBeNull();
        expect(message).toContain("cloud offloading");
    });
});
