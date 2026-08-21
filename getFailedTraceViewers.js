import dotenv from "dotenv";
import { getTraceNames } from "./getAllFailedTraces.js";

dotenv.config();

// Load configuration from environment variables
const TRACE_SERVICE_BASE_URL = process.env.TRACE_SERVICE_BASE_URL || "https://trace.triratnaakolayouth.com";

export async function getFailedTraceViewers(executionId) {
  const traces = await getTraceNames(executionId);

  // Parallelize all trace viewer requests instead of serial processing
  const promises = traces.map(async (trace) => {
    const url =
      `${TRACE_SERVICE_BASE_URL}/trace/${trace}` +
      `?testExecutionId=${executionId}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      return {
        trace,
        success: result.success,
        vuid: result.vuid,
        viewer: result.viewer,
        sessionId: result.sessionId,
        port: result.port,
        expiresIn: result.expiresIn,
      };
    } catch (error) {
      return {
        trace,
        success: false,
        error: error.message,
      };
    }
  });

  // Wait for all requests to complete in parallel
  const results = await Promise.all(promises);
  return results;
}