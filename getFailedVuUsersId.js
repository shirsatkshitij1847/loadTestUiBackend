import { getTraceNames } from "./getAllFailedTraces.js";

async function demo() {
  const executionId = "testexecution1234";

  const traces = await getTraceNames(executionId);

  for (const trace of traces) {
    const url =
      `https://trace.triratnaakolayouth.com/trace/${trace}` +
      `?testExecutionId=${executionId}`;

    try {
      const response = await fetch(url);
      const result = await response.text();

      console.log(trace, "=>", result);
    } catch (error) {
      console.error(trace, "=> ERROR:", error.message);
    }
  }
}

demo();