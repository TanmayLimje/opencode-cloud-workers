import { describe, it, expect } from "vitest";
import { parseOpenSpecContent, parsePrUrl } from "./openspec-parser";

describe("parseOpenSpecContent", () => {
    it("should extract title from markdown", () => {
        const content = `# Add User Authentication

This change adds user authentication to the app.

## Files
- src/auth/login.ts
- src/auth/logout.ts
`;
        const result = parseOpenSpecContent(content);

        expect(result.title).toBe("Add User Authentication");
    });

    it("should extract files from list", () => {
        const content = `# Test Change

## Files
- src/file1.ts
- src/file2.ts
- src/file3.ts
`;
        const result = parseOpenSpecContent(content);

        expect(result.files).toHaveLength(3);
        expect(result.files).toContain("src/file1.ts");
    });

    it("should extract status if present", () => {
        const content = `# Test
status: completed

Some description.
`;
        const result = parseOpenSpecContent(content);

        expect(result.status).toBe("completed");
    });

    it("should default to unknown status", () => {
        const content = `# Test

No status here.
`;
        const result = parseOpenSpecContent(content);

        expect(result.status).toBe("unknown");
    });

    it("should preserve raw content", () => {
        const content = "# Test\n\nContent here.";
        const result = parseOpenSpecContent(content);

        expect(result.rawContent).toBe(content);
    });
});

describe("parsePrUrl", () => {
    it("should parse standard GitHub PR URL", () => {
        const result = parsePrUrl("https://github.com/owner/repo/pull/123");

        expect(result).toEqual({
            owner: "owner",
            repo: "repo",
            number: 123
        });
    });

    it("should return null for invalid URL", () => {
        const result = parsePrUrl("https://example.com/something");

        expect(result).toBeNull();
    });

    it("should handle URLs with trailing slashes", () => {
        const result = parsePrUrl("https://github.com/foo/bar/pull/456");

        expect(result?.number).toBe(456);
    });
});
