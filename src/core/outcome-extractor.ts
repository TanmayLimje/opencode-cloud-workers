import { PluginInput } from "@opencode-ai/plugin";

/**
 * Extract expected outcomes from a task prompt using AI.
 * Returns structured list of verifiable outcomes for review.
 */
export async function extractOutcomes(
    ctx: PluginInput,
    prompt: string
): Promise<string[]> {
    const extractionPrompt = `
Analyze this task and extract 3-5 specific, verifiable outcomes that can be checked in a code review.

TASK:
"${prompt}"

Return ONLY a JSON array of strings. Each outcome should be:
- Specific and measurable
- Checkable by reviewing code/diff
- Written in past tense (e.g., "Tests added for X")

Example output:
["Tests added for all service methods", "Error handling implemented", "Coverage above 80%"]

Return ONLY the JSON array, no markdown, no explanation.
`;

    try {
        // Create temporary session for extraction
        const result = await ctx.client.session.create({
            body: { title: `Outcome extraction` }
        });

        if (result.error) {
            console.warn("[OutcomeExtractor] Failed to create session, using fallback");
            return fallbackExtract(prompt);
        }

        const sessionId = result.data.id;

        const response = await ctx.client.session.prompt({
            path: { id: sessionId },
            body: {
                parts: [{ type: "text", text: extractionPrompt }]
            }
        });

        // Cleanup
        ctx.client.session.delete({ path: { id: sessionId } }).catch(() => { });

        if (response.error || !response.data) {
            console.warn("[OutcomeExtractor] AI failed, using fallback");
            return fallbackExtract(prompt);
        }

        const text = response.data.parts?.find(p => p.type === "text")?.text || "";

        // Parse JSON array
        try {
            const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const outcomes = JSON.parse(cleaned);
            if (Array.isArray(outcomes) && outcomes.length > 0) {
                return outcomes.map(o => String(o));
            }
        } catch (e) {
            console.warn("[OutcomeExtractor] JSON parse failed:", text);
        }

        return fallbackExtract(prompt);

    } catch (e) {
        console.error("[OutcomeExtractor] Error:", e);
        return fallbackExtract(prompt);
    }
}

/**
 * Simple keyword-based fallback when AI extraction fails.
 */
function fallbackExtract(prompt: string): string[] {
    const outcomes: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Common patterns
    if (lowerPrompt.includes("test")) {
        outcomes.push("Tests implemented and passing");
    }
    if (lowerPrompt.includes("refactor")) {
        outcomes.push("Code refactored without breaking changes");
    }
    if (lowerPrompt.includes("fix") || lowerPrompt.includes("bug")) {
        outcomes.push("Bug fixed and verified");
    }
    if (lowerPrompt.includes("add") || lowerPrompt.includes("implement")) {
        outcomes.push("Feature implemented as requested");
    }
    if (lowerPrompt.includes("update") || lowerPrompt.includes("change")) {
        outcomes.push("Changes applied correctly");
    }

    // Always add a generic outcome
    if (outcomes.length === 0) {
        outcomes.push("Task completed as described");
    }

    outcomes.push("No breaking changes introduced");

    return outcomes;
}
