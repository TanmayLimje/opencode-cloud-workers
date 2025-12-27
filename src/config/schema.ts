import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const JulesProviderSchema = z.object({
    api_key: z.string().optional(),
    base_url: z.string().optional(),
    api_version: z.string().optional(),
});

export const GitHubProviderSchema = z.object({
    token: z.string().optional(),
});

export const ProvidersSchema = z.object({
    jules: JulesProviderSchema.optional(),
    github: GitHubProviderSchema.optional(),
}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL CONFIG SCHEMA (~/.config/opencode/cloud-workers.json)
// ═══════════════════════════════════════════════════════════════════════════

export const GlobalConfigSchema = z.object({
    providers: ProvidersSchema.optional(),
    defaults: z.object({
        auto_review: z.boolean().optional(),
        max_review_rounds: z.number().int().min(1).max(10).optional(),
        polling_interval_ms: z.number().int().min(5000).optional(),
        default_provider: z.string().optional(),
    }).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONFIG SCHEMA (opencode.json -> cloud_workers)
// ═══════════════════════════════════════════════════════════════════════════

export const ProjectConfigSchema = z.object({
    default_provider: z.string().optional(),
    auto_review: z.boolean().optional(),
    max_review_rounds: z.number().int().min(1).max(10).optional(),
    polling_interval_ms: z.number().int().min(5000).optional(),
    providers: ProvidersSchema.optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// MERGED CONFIG SCHEMA (final result)
// ═══════════════════════════════════════════════════════════════════════════

export const MergedConfigSchema = z.object({
    default_provider: z.string(),
    providers: z.object({
        jules: z.object({
            api_key: z.string(),
            base_url: z.string(),
            api_version: z.string(),
        }),
        github: z.object({
            token: z.string(),
        }),
    }),
    auto_review: z.boolean(),
    max_review_rounds: z.number(),
    polling_interval_ms: z.number(),
});
