import { Plugin } from "@opencode-ai/plugin";
import { loadConfig, getGlobalConfigPath } from "./config/loader";
import { SessionManager } from "./core/session-manager";
import { JulesProvider } from "./providers/jules/provider";

import { createStartTool } from "./tools/start";
import { createStatusTool } from "./tools/status";
import { createListTool } from "./tools/list";
import { createFeedbackTool } from "./tools/feedback";
import { createMergeTool } from "./tools/merge";
import { CloudWorkerLoop } from "./core/loop";

const CloudWorkersPlugin: Plugin = async (ctx) => {
    // 1. Load Configuration (global + project, with env var fallback)
    const config = await loadConfig(ctx.directory);

    // 2. Initialize Persistence
    const sessionManager = new SessionManager(ctx.directory);
    await sessionManager.load();

    // 3. Initialize Provider(s) using config
    if (!config.providers.jules.api_key) {
        console.warn(
            `[CloudWorkers] Jules API key not found. Configure in:\n` +
            `  - Global: ${getGlobalConfigPath()}\n` +
            `  - Env var: JULES_API_KEY`
        );
    }

    const provider = new JulesProvider({
        apiKey: config.providers.jules.api_key,
        baseUrl: config.providers.jules.base_url,
        apiVersion: config.providers.jules.api_version,
    });

    console.log(`[CloudWorkers] Loaded plugin with provider: ${provider.name}`);
    console.log(`[CloudWorkers] Config: auto_review=${config.auto_review}, polling=${config.polling_interval_ms}ms`);

    // 4. Start Background Loop (with configurable interval)
    const loop = new CloudWorkerLoop(sessionManager, provider, ctx);
    loop.start(config.polling_interval_ms);

    // 5. Register Tools (pass config for defaults)
    return {
        tool: {
            cloud_worker_start: createStartTool(provider, sessionManager, ctx, config),
            cloud_worker_status: createStatusTool(provider, sessionManager),
            cloud_worker_list: createListTool(sessionManager),
            cloud_worker_feedback: createFeedbackTool(provider, sessionManager),
            cloud_worker_merge: createMergeTool(provider, sessionManager),
        },

        // Event hooks (if needed later)
        event: async (input) => {
            // We could hook into specific events here if needed
        }
    };
};

export default CloudWorkersPlugin;
