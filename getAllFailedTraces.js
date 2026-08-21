

import dotenv from "dotenv";
import {
  S3Client,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';

dotenv.config();

// Load configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "sas-migration-result-eveidence";

const s3 = new S3Client({
  region: AWS_REGION
});

/**
 * Get all trace ZIP file names for a test execution.
 *
 * @param {string} executionId - Example: "1786976044823"
 * @returns {Promise<string[]>}
 */
export async function getTraceNames(executionId) {
  if (!executionId) {
    throw new Error("executionId is required");
  }

  const prefix = `${executionId}/`;

  const traceNames = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken
    });

    const response = await s3.send(command);

    const names = (response.Contents || [])
      .map(item => item.Key)
      .filter(key => key && key.toLowerCase().endsWith(".zip"))
      .map(key => key.substring(prefix.length));

    traceNames.push(...names);

    continuationToken = response.NextContinuationToken;

  } while (continuationToken);

  return traceNames;
}


// Example usage
(async () => {
  try {
    const executionId = "testexecution1234";

    const traces = await getTraceNames(executionId);


    //logic to just check wether traces mapping properly or not 

    // traces.forEach((itr)=>{
    //     console.log(itr);
        
    // })
    // console.log("Trace files:");
    // // console.log(traces);

  } catch (error) {
    console.error("Error:", error.message);
  }
})();