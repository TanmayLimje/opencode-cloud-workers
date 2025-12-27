/**
 * Configuration types for opencode-cloud-workers
 * 
 * Two-tier config system:
 * 1. Global: ~/.config/opencode/cloud-workers.json (credentials, defaults)
 * 2. Project: opencode.json -> cloud_workers section (overrides)
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface JulesProviderConfig {
    /** API key (supports ${ENV_VAR} interpolation) */
    api_key?: string;
    /** Base URL override */
    base_url?: string;
    /** API version override */
    api_version?: string;
}

export interface GitHubProviderConfig {
    /** GitHub token (supports ${ENV_VAR} interpolation) */
    token?: string;
}

export interface ProvidersConfig {
    jules?: JulesProviderConfig;
    github?: GitHubProviderConfig;
    [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL CONFIG (~/.config/opencode/cloud-workers.json)
// ═══════════════════════════════════════════════════════════════════════════

export interface GlobalConfig {
    /** Provider credentials and settings */
    providers?: ProvidersConfig;

    /** Default settings */
    defaults?: {
        /** Enable automatic AI review of completed work */
        auto_review?: boolean;
        /** Maximum review rounds before human intervention */
        max_review_rounds?: number;
        /** Polling interval in milliseconds */
        polling_interval_ms?: number;
        /** Default provider to use */
        default_provider?: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONFIG (opencode.json -> cloud_workers)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectConfig {
    /** Override default provider for this project */
    default_provider?: string;
    /** Override auto-review setting */
    auto_review?: boolean;
    /** Override max review rounds */
    max_review_rounds?: number;
    /** Override polling interval */
    polling_interval_ms?: number;
    /** Project-specific provider overrides */
    providers?: ProvidersConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGED CONFIG (final result after merging global + project)
// ═══════════════════════════════════════════════════════════════════════════

export interface CloudWorkersConfig {
    /** Which provider to use */
    default_provider: string;

    /** Provider configurations (with resolved env vars) */
    providers: {
        jules: {
            api_key: string;
            base_url: string;
            api_version: string;
        };
        github: {
            token: string;
        };
    };

    /** Behavior settings */
    auto_review: boolean;
    max_review_rounds: number;
    polling_interval_ms: number;
}
