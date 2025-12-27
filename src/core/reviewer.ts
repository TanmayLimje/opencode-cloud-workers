import { PluginInput } from "@opencode-ai/plugin";
import { TrackedSession } from "./interfaces/types";
import type { OpenSpecChange } from "./openspec-parser";

export interface ReviewResult {
    approved: boolean;
    issues: number;
    feedback: string;
}

export class Reviewer {
    constructor(private ctx: PluginInput) { }

    async review(
        session: TrackedSession,
        patch: string,
        openspec?: OpenSpecChange | null
    ): Promise<ReviewResult> {
        // Build outcomes section if available
        const outcomesSection = session.expectedOutcomes && session.expectedOutcomes.length > 0
            ? `
EXPECTED OUTCOMES (verify each):
${session.expectedOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n")}

For each outcome, check if the patch satisfies it.
`
            : "";

        // Include previous review context if this is a re-review
        const previousContext = session.reviewRound > 0 && session.lastReviewResult
            ? `
PREVIOUS REVIEW (Round ${session.reviewRound}):
Issues: ${session.lastReviewResult.issues}
Feedback: "${session.lastReviewResult.feedback}"

Check if these issues have been addressed.
`
            : "";

        // Include OpenSpec if available
        const openspecSection = openspec
            ? `
WORKER'S CHANGE DOCUMENT (OpenSpec):
Title: ${openspec.title}
Status: ${openspec.status}
Files: ${openspec.files.length > 0 ? openspec.files.join(", ") : "Not listed"}
Description: ${openspec.description || "Not provided"}

Compare the patch against this change document.
`
            : "";

        const prompt = `
You are a senior code reviewer. A remote worker has submitted a patch for the following task:

TASK:
"${session.prompt}"
${outcomesSection}${openspecSection}${previousContext}
PATCH:
\`\`\`diff
${patch.slice(0, 10000)} ${(patch.length > 10000) ? "\n... (truncated)" : ""}
\`\`\`

Review this patch for:
1. Logical errors and bugs
2. Security issues
3. Adherence to the task requirements
${session.expectedOutcomes ? "4. Whether each expected outcome is satisfied" : ""}
${openspec ? "5. Consistency with the worker's change document" : ""}

IGNORE formatting nitpicks. Focus on correctness.

Return your review as a valid JSON object with this shape:
{
  "approved": boolean,
  "issues": number,
  "feedback": "string (concise actionable feedback or 'Looks good' if approved)"
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY the JSON string.
`;

        try {
            const result = await this.ctx.client.session.create({
                body: { title: `Review: ${session.id}` }
            });

            if (result.error) throw new Error("Failed to create review session");
            const reviewSessionId = result.data.id;

            const response = await this.ctx.client.session.prompt({
                path: { id: reviewSessionId },
                body: {
                    parts: [{ type: "text", text: prompt }]
                }
            });

            // Cleanup
            this.ctx.client.session.delete({ path: { id: reviewSessionId } }).catch(() => { });

            if (response.error || !response.data) throw new Error("Review agent failed to respond");

            const text = response.data.parts?.find(p => p.type === "text")?.text || "";

            try {
                const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(jsonStr);
                return {
                    approved: !!parsed.approved,
                    issues: parsed.issues || 0,
                    feedback: parsed.feedback || "No feedback provided."
                };
            } catch (e) {
                console.error("Failed to parse review JSON:", text);
                return {
                    approved: false,
                    issues: 1,
                    feedback: "Reviewer failed to produce valid JSON. Please check manually."
                };
            }

        } catch (e) {
            console.error("Review failed:", e);
            return {
                approved: false,
                issues: 1,
                feedback: "Internal error during review process."
            };
        }
    }
}
