/**
 * Task Analyzer - Detects tasks suitable for cloud worker offloading.
 */

export interface AnalysisResult {
    /** Whether the task should be suggested for offloading */
    shouldOffload: boolean;

    /** Human-readable reason */
    reason: string;

    /** Estimated time in minutes */
    estimatedMinutes: number;

    /** Complexity level */
    complexity: "low" | "medium" | "high";

    /** Signals that triggered the detection */
    signals: string[];
}

// Keywords that suggest multi-file or large scope work
const SCOPE_KEYWORDS = [
    "all files",
    "entire module",
    "every file",
    "across the codebase",
    "comprehensive",
    "full coverage",
    "project-wide",
    "all services",
    "all components",
    "refactor all",
    "update all",
    "migrate all"
];

// Keywords that suggest complex, time-consuming work
const COMPLEXITY_KEYWORDS = [
    "refactor",
    "migrate",
    "rewrite",
    "restructure",
    "overhaul",
    "comprehensive tests",
    "integration tests",
    "end-to-end",
    "set up infrastructure",
    "configure ci/cd",
    "database migration"
];

// Keywords that suggest the task is independent (no conversation context needed)
const INDEPENDENCE_KEYWORDS = [
    "add tests",
    "write tests",
    "fix linting",
    "format code",
    "update dependencies",
    "add documentation",
    "create api endpoints",
    "implement feature"
];

/**
 * Analyze a task prompt to determine if it's suitable for cloud offloading.
 */
export function analyzeTask(prompt: string): AnalysisResult {
    const lowerPrompt = prompt.toLowerCase();
    const signals: string[] = [];
    let complexityScore = 0;

    // Check for scope keywords
    for (const keyword of SCOPE_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            signals.push(`scope: "${keyword}"`);
            complexityScore += 3;
        }
    }

    // Check for complexity keywords
    for (const keyword of COMPLEXITY_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            signals.push(`complexity: "${keyword}"`);
            complexityScore += 2;
        }
    }

    // Check for independence keywords
    let isIndependent = false;
    for (const keyword of INDEPENDENCE_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            isIndependent = true;
            signals.push(`independent: "${keyword}"`);
            break;
        }
    }

    // Count mentioned file counts (e.g., "12 files", "20 components")
    const fileCountMatch = lowerPrompt.match(/(\d+)\s*(files?|components?|services?|modules?)/);
    if (fileCountMatch) {
        const count = parseInt(fileCountMatch[1], 10);
        if (count >= 5) {
            signals.push(`file-count: ${count}`);
            complexityScore += Math.min(count / 2, 5);
        }
    }

    // Estimate time based on complexity
    let estimatedMinutes: number;
    let complexity: "low" | "medium" | "high";

    if (complexityScore >= 8) {
        complexity = "high";
        estimatedMinutes = 60;
    } else if (complexityScore >= 4) {
        complexity = "medium";
        estimatedMinutes = 30;
    } else {
        complexity = "low";
        estimatedMinutes = 10;
    }

    // Decision: suggest offload if high complexity OR (medium + independent)
    const shouldOffload =
        complexity === "high" ||
        (complexity === "medium" && isIndependent) ||
        (complexity === "medium" && signals.length >= 2);

    // Build reason
    let reason: string;
    if (shouldOffload) {
        reason = `This appears to be a ${complexity}-complexity task` +
            (signals.length > 0 ? ` (${signals.slice(0, 2).join(", ")})` : "") +
            `. Estimated ${estimatedMinutes}+ minutes.`;
    } else {
        reason = "Task appears manageable locally.";
    }

    return {
        shouldOffload,
        reason,
        estimatedMinutes,
        complexity,
        signals
    };
}

/**
 * Check if a task should be suggested for cloud offloading.
 * Returns a suggestion message if yes, null if no.
 */
export function getSuggestionMessage(prompt: string): string | null {
    const analysis = analyzeTask(prompt);

    if (!analysis.shouldOffload) {
        return null;
    }

    return `💡 This looks like a good candidate for cloud offloading:

• Complexity: ${analysis.complexity.toUpperCase()}
• Estimated time: ${analysis.estimatedMinutes}+ minutes
• Signals: ${analysis.signals.slice(0, 3).join(", ")}

Would you like to offload this to Jules?`;
}
