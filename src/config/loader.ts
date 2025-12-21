import { z } from "zod";
import path from "path";
import fs from "fs/promises";

export const CloudWorkersConfigSchema = z.object({
    default_provider: z.string().default("jules"),
    providers: z.record(z.string(), z.object({
        api_key_env: z.string().optional(),
        base_url: z.string().optional(),
        api_version: z.string().optional(),
    })).optional(),
});

export type CloudWorkersConfig = z.infer<typeof CloudWorkersConfigSchema>;

export async function loadConfig(workspaceDir: string): Promise<CloudWorkersConfig> {
    const defaults: CloudWorkersConfig = {
        default_provider: "jules",
    };

    try {
        const configPath = path.join(workspaceDir, "opencode.json");
        const content = await fs.readFile(configPath, "utf-8");
        const json = JSON.parse(content);

        // Check if cloud_workers section exists
        if (json.cloud_workers) {
            return CloudWorkersConfigSchema.parse({
                ...defaults,
                ...json.cloud_workers,
            });
        }
    } catch (error) {
        // Ignore errors, return defaults
    }

    return defaults;
}
