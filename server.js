import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import {
  getAllTestsFromS3
} from "./getAllTestExecutionId.js";
import {
  getTraceNames
} from "./getAllFailedTraces.js";
import {
  getFailedTraceViewers
} from "./getFailedTraceViewers.js";
import {
  getTestExecutionResult
} from "./s3ResultCreationService.js";
import {
  getTestMetaData
} from "./testExecutionMetaData.js";

const app = express();

// Load configuration from environment variables
const SERVER_PORT = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const CACHE_TTL = (parseInt(process.env.CACHE_TTL_MINUTES) || 10) * 60 * 1000; // Convert minutes to milliseconds

// In-memory cache for traces responses with TTL
const tracesCache = new Map();

// Helper to get cached traces
function getCachedTraces(executionId) {
  const cached = tracesCache.get(executionId);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`Cache hit for executionId: ${executionId}`);
    return cached.data;
  }
  // Clean up expired cache
  if (cached) {
    tracesCache.delete(executionId);
  }
  return null;
}

// Helper to set cached traces
function setCachedTraces(executionId, data) {
  tracesCache.set(executionId, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "working"
  });
});

app.get("/api/getalltest", async (req, res) => {
  try {
    const alltestList = await getTestMetaData();

    console.log("All tests:", alltestList);

    res.json(alltestList);
  } catch (error) {
    console.error("Error getting tests from S3:", error);

    res.status(500).json({
      message: "Failed to get tests",
      error: error.message,
    });
  }
});

app.get("/api/traces/:executionId", async (req, res) => {
  try {
    const {
      executionId
    } = req.params;

    console.log("Getting traces for:", executionId);

    // Check cache first
    const cachedTraces = getCachedTraces(executionId);
    if (cachedTraces) {
      return res.json({
        success: true,
        executionId,
        traces: cachedTraces,
        fromCache: true,
      });
    }

    // Not in cache, fetch from trace service (now parallelized)
    const traces = await getFailedTraceViewers(executionId);

    // Cache the result for future requests
    setCachedTraces(executionId, traces);

    res.json({
      success: true,
      executionId,
      traces,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error getting traces:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get traces",
      error: error.message,
    });
  }
});

app.get("/api/getresult/:executionId", async (req, res) => {

  try {

    const {
      executionId
    } = req.params;

    let data = await getTestExecutionResult(executionId);

    res.json(data);

  } catch (error) {
    console.error("Error getting traces:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get traces",
      error: error.message,
    });
  }

})

app.get('/api/avilabletrace/:executionId', async (req, res) => {

  const {
    executionId
  } = req.params;

  const data = await getTraceNames(executionId);
  console.log(data);

  res.status(200).json({
    success: true,
    traces: data,
  });

})

app.listen(SERVER_PORT, () => {
  console.log(`Server running at http://localhost:${SERVER_PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`CORS Origins: ${CORS_ORIGINS.join(", ")}`);
  console.log(`Cache TTL: ${process.env.CACHE_TTL_MINUTES || 20} minutes`);
});