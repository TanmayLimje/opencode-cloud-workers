import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { RemoteWorkerProvider } from "../core/interfaces/provider";
import { SessionManager } from "../core/session-manager";

export const createFeedbackTool = (
    provider: RemoteWorkerProvider,
    sessionManager: SessionManager
) => {
    return tool({
        description: "Send feedback to a cloud worker session (e.g. to request changes or provide guidance).",
        args: {
            session_id: z.string().describe("The local session ID"),
            feedback: z.string().describe("The feedback message to send"),
        },
        execute: async (args) => {
            const session = sessionManager.getSession(args.session_id);
            if (!session) {
                throw new Error(`Session ${args.session_id} not found.`);
            }

            await provider.sendFeedback(session.remoteSessionId, args.feedback);

            // Update local state to reflect we are waiting again
            sessionManager.updateSession(session.id, {
                status: "in_progress",
                statusMessage: "Feedback sent by user",
                inFlight: false,
                watching: true // Ensure we are watching for the next update
            });

            return `Feedback sent to session ${args.session_id}. Worker will now iterate on the task.`;
        },
    });
};
