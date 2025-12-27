import fs from "fs/promises";
import path from "path";
import { homedir } from "os";
import { GlobalConfigSchema, ProjectConfigSchema } from "./schema";
import type { CloudWorkersConfig, GlobalConfig, ProjectConfig } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG PATHS
// ═══════════════════════════════════════════════════════════════════════════

const OPENCODE_CONFIG_DIR = path.join(homedir(), ".config", "opencode");
const GLOBAL_CONFIG_PATH = path.join(OPENCODE_CONFIG_DIR, "cloud-workers.json");

// ═══════════════════════════════════════════════════════════════════════════
// ENV VAR INTERPOLATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interpolate ${ENV_VAR} patterns in a string with actual env values.
 * Returns empty string if env var is not set.
 */
function interpolateEnvVars(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return process.env[varName] || "";
    });
}

/**
 * Deep interpolate env vars in an object.
 */
function deepInterpolate<T>(obj: T): T {
    if (typeof obj === "string") {
        return interpolateEnvVars(obj) as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(deepInterpolate) as T;
    }
    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = deepInterpolate(value);
        }
        return result as T;
    }
    return obj;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG LOADING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load global config from ~/.config/opencode/cloud-workers.json
 * Returns null if file doesn't exist or is invalid.
 */
async function loadGlobalConfig(): Promise<GlobalConfig | null> {
    try {
        const content = await fs.readFile(GLOBAL_CONFIG_PATH, "utf-8");
        const json = JSON.parse(content);
        const validated = GlobalConfigSchema.parse(json);
        return deepInterpolate(validated);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            // File doesn't exist - this is fine, use defaults
            return null;
        }
        console.warn("[CloudWorkers] Failed to parse global config:", error);
        return null;
    }
}

/**
 * Load project config from opencode.json -> cloud_workers section.
 * Returns null if not found.
 */
async function loadProjectConfig(workspaceDir: string): Promise<ProjectConfig | null> {
    try {
        const configPath = path.join(workspaceDir, "opencode.json");
        const content = await fs.readFile(configPath, "utf-8");
        const json = JSON.parse(content);

        if (json.cloud_workers) {
            const validated = ProjectConfigSchema.parse(json.cloud_workers);
            return deepInterpolate(validated);
        }
        return null;
    } catch (error) {
        // Project config is optional, don't warn
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULTS: CloudWorkersConfig = {
    default_provider: "jules",
    providers: {
        jules: {
            api_key: "",
            base_url: "https://jules.googleapis.com",
            api_version: "v1alpha",
        },
        github: {
            token: "",
        },
    },
    auto_review: true,
    max_review_rounds: 3,
    polling_interval_ms: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════
// MERGE LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deep merge two objects. Source values override target values.
 */
function deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
): T {
    const result = { ...target };

    for (const key of Object.keys(source) as Array<keyof T>) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
            sourceValue !== null &&
            sourceValue !== undefined &&
            typeof sourceValue === "object" &&
            !Array.isArray(sourceValue) &&
            targetValue !== null &&
            typeof targetValue === "object" &&
            !Array.isArray(targetValue)
        ) {
            result[key] = deepMerge(
                targetValue as Record<string, unknown>,
                sourceValue as Record<string, unknown>
            ) as T[keyof T];
        } else if (sourceValue !== undefined) {
            result[key] = sourceValue as T[keyof T];
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOADER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load and merge configuration from all sources:
 * 1. Built-in defaults
 * 2. Global config (~/.config/opencode/cloud-workers.json)
 * 3. Project config (opencode.json -> cloud_workers) [OPTIONAL]
 * 
 * Works perfectly fine with ONLY global config - no project config needed!
 */
export async function loadConfig(workspaceDir: string): Promise<CloudWorkersConfig> {
    // 1. Start with defaults
    let config = { ...DEFAULTS };

    // 2. Load and merge global config (if exists)
    const globalConfig = await loadGlobalConfig();
    if (globalConfig) {
        // Merge defaults from global
        if (globalConfig.defaults) {
            const defaults = globalConfig.defaults;
            if (defaults.default_provider) config.default_provider = defaults.default_provider;
            if (defaults.auto_review !== undefined) config.auto_review = defaults.auto_review;
            if (defaults.max_review_rounds !== undefined) config.max_review_rounds = defaults.max_review_rounds;
            if (defaults.polling_interval_ms !== undefined) config.polling_interval_ms = defaults.polling_interval_ms;
        }
        // Merge provider configs
        if (globalConfig.providers) {
            config.providers = deepMerge(config.providers, globalConfig.providers as typeof config.providers);
        }
    }

    // 3. Load and merge project config (OPTIONAL - if exists)
    const projectConfig = await loadProjectConfig(workspaceDir);
    if (projectConfig) {
        // Project settings override global
        if (projectConfig.default_provider) config.default_provider = projectConfig.default_provider;
        if (projectConfig.auto_review !== undefined) config.auto_review = projectConfig.auto_review;
        if (projectConfig.max_review_rounds !== undefined) config.max_review_rounds = projectConfig.max_review_rounds;
        if (projectConfig.polling_interval_ms !== undefined) config.polling_interval_ms = projectConfig.polling_interval_ms;
        if (projectConfig.providers) {
            config.providers = deepMerge(config.providers, projectConfig.providers as typeof config.providers);
        }
    }

    // 4. Fallback: Check env vars directly if still no API keys
    if (!config.providers.jules.api_key) {
        config.providers.jules.api_key = process.env.JULES_API_KEY || "";
    }
    if (!config.providers.github.token) {
        config.providers.github.token = process.env.GITHUB_TOKEN || "";
    }

    return config;
}

/**
 * Get the global config file path (for user to know where to create it).
 */
export function getGlobalConfigPath(): string {
    return GLOBAL_CONFIG_PATH;
}

// Re-export types
export type { CloudWorkersConfig } from "./types";
