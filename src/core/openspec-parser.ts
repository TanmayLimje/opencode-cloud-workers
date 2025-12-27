import { Octokit } from "octokit";

/**
 * Parsed OpenSpec change document.
 */
export interface OpenSpecChange {
    /** Title of the change */
    title: string;

    /** Current status */
    status: "proposed" | "in_progress" | "completed" | "unknown";

    /** Files affected */
    files: string[];

    /** Description/summary */
    description: string;

    /** Raw content */
    rawContent: string;
}

/**
 * Parse OpenSpec markdown content.
 */
export function parseOpenSpecContent(content: string): Partial<OpenSpecChange> {
    const result: Partial<OpenSpecChange> = {
        rawContent: content,
        files: [],
        status: "unknown"
    };

    // Extract title (first H1)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        result.title = titleMatch[1].trim();
    }

    // Extract status
    const statusMatch = content.match(/status:\s*(proposed|in_progress|completed)/i);
    if (statusMatch) {
        result.status = statusMatch[1].toLowerCase() as OpenSpecChange["status"];
    }

    // Extract files (look for file paths or lists under "Files" section)
    const filesSection = content.match(/##\s*Files?\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (filesSection) {
        const fileLines = filesSection[1].match(/[-*]\s*`?([^`\n]+)`?/g);
        if (fileLines) {
            result.files = fileLines.map(line =>
                line.replace(/^[-*]\s*`?/, "").replace(/`?$/, "").trim()
            );
        }
    }

    // Extract description (content after title, before first section)
    const descMatch = content.match(/^#\s+.+\n\n([\s\S]*?)(?=\n##|$)/);
    if (descMatch) {
        result.description = descMatch[1].trim().slice(0, 500);
    }

    return result;
}

/**
 * Fetch OpenSpec from a PR branch.
 */
export async function fetchOpenSpecFromPR(
    token: string,
    owner: string,
    repo: string,
    prNumber: number
): Promise<OpenSpecChange | null> {
    try {
        const octokit = new Octokit({ auth: token });

        // Get PR to find the head branch
        const { data: pr } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: prNumber
        });

        const branch = pr.head.ref;

        // Try to find openspec/changes/*.md files
        let openspecPath = "openspec/changes";

        try {
            const { data: contents } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: openspecPath,
                ref: branch
            });

            if (Array.isArray(contents)) {
                // Find first .md file
                const mdFile = contents.find(f => f.name.endsWith(".md"));
                if (mdFile && mdFile.type === "file") {
                    const { data: fileData } = await octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: mdFile.path,
                        ref: branch
                    });

                    if ("content" in fileData && fileData.content) {
                        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
                        const parsed = parseOpenSpecContent(content);
                        return {
                            title: parsed.title || mdFile.name.replace(".md", ""),
                            status: parsed.status || "unknown",
                            files: parsed.files || [],
                            description: parsed.description || "",
                            rawContent: content
                        };
                    }
                }
            }
        } catch (e) {
            // OpenSpec folder doesn't exist - that's OK
            console.log(`[OpenSpec] No openspec/changes found in branch ${branch}`);
        }

        return null;

    } catch (e) {
        console.error("[OpenSpec] Failed to fetch:", e);
        return null;
    }
}

/**
 * Parse PR URL to extract owner, repo, and PR number.
 */
export function parsePrUrl(prUrl: string): { owner: string; repo: string; number: number } | null {
    // Handle: https://github.com/owner/repo/pull/123
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (match) {
        return {
            owner: match[1],
            repo: match[2],
            number: parseInt(match[3], 10)
        };
    }
    return null;
}
