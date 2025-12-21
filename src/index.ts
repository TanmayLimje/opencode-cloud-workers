import { Plugin } from "@opencode-ai/plugin";
import { loadConfig } from "./config/loader";
import { SessionManager } from "./core/session-manager";
import { JulesProvider } from "./providers/jules/provider";

import { createStartTool } from "./tools/start";
import { createStatusTool } from "./tools/status";
import { createListTool } from "./tools/list";
import { createFeedbackTool } from "./tools/feedback";
import { createMergeTool } from "./tools/merge";
import { CloudWorkerLoop } from "./core/loop";

const CloudWorkersPlugin: Plugin = async (ctx) => {
    // 1. Load Configuration
    const config = await loadConfig(ctx.directory);

    // 2. Initialize Persistence
    const sessionManager = new SessionManager(ctx.directory);
    await sessionManager.load();

    // 3. Initialize Provider(s)
    const julesApiKey = process.env.JULES_API_KEY;
    if (!julesApiKey) {
        console.warn("[CloudWorkers] JULES_API_KEY not found in environment. Jules functionality will differ.");
    }

    const provider = new JulesProvider({
        apiKey: julesApiKey || "",
    });

    console.log(`[CloudWorkers] Loaded plugin with provider: ${provider.name}`);

    // 4. Start Background Loop
    const loop = new CloudWorkerLoop(sessionManager, provider, ctx);
    loop.start(); // Runs every 30s by default

    // 5. Register Tools
    return {
        tool: {
            cloud_worker_start: createStartTool(provider, sessionManager, ctx),
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
