import dotenv from "dotenv";
import fs from "fs/promises";
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({ region: process.env.AWS_REGION, });

console.log("S3 Bucket:", BUCKET_NAME);
console.log("AWS Region:", process.env.AWS_REGION);


/**
 * Get and combine all JSON result files
 * for a test execution.
 *
 * @param {string} testExecutionId
 * @returns {Promise<object>}
 */
export async function getTestExecutionResult(testExecutionId) {

    if (!testExecutionId) {
        throw new Error("testExecutionId is required");
    }

    const prefix = `${testExecutionId}/`;

    console.log(`🔍 Fetching results for: ${testExecutionId}`);
    console.log(`📂 S3 Prefix: ${prefix}`);


    // ============================================================
    // 1. Get all objects under testExecutionId/
    // ============================================================

    const objects = [];

    let continuationToken;

    do {

        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
            objects.push(...response.Contents);
        }

        continuationToken = response.NextContinuationToken;

    } while (continuationToken);


    // ============================================================
    // 2. Only process JSON files
    // ============================================================

    const jsonObjects = objects.filter( (object) => object.Key && object.Key.toLowerCase().endsWith(".json")  );

    console.log( `📄 Found ${jsonObjects.length} JSON result files` );


    // ============================================================
    // 3. Read all JSON files directly from S3
    // ============================================================

    const results = await Promise.all(

        jsonObjects.map(async (object) => {

            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: object.Key,
            });

            const response = await s3Client.send(command);

            const content = await response.Body.transformToString();

            try {

                return {
                    key: object.Key,
                    data: JSON.parse(content),
                };

            } catch (error) {

                throw new Error(
                    `Invalid JSON in S3 object: ${object.Key}`
                );
            }
        })
    );


    // ============================================================
    // 4. Combine VUs + calculate statistics
    // ============================================================

    const virtualUsers = [];

    const stepMap = new Map();

    let totalSteps = 0;
    let passedSteps = 0;
    let failedSteps = 0;


    for (const result of results) {

        const users = result.data.virtualUsers || [];

        for (const vu of users) {

            // Keep original VU information
            virtualUsers.push(vu);


            for (const step of vu.steps || []) {

                totalSteps++;

                const duration =
                    Number(step.duration) || 0;


                // ------------------------------------------
                // Overall pass/fail
                // ------------------------------------------

                if (step.status === "passed") {
                    passedSteps++;
                } else {
                    failedSteps++;
                }


                // ------------------------------------------
                // Create step entry if it doesn't exist
                // ------------------------------------------

                if (!stepMap.has(step.name)) {

                    stepMap.set(step.name, {
                        name: step.name,
                        totalExecutions: 0,
                        passed: 0,
                        failed: 0,
                        durations: [],
                    });
                }


                const stepSummary = stepMap.get(step.name);


                // ------------------------------------------
                // Update step statistics
                // ------------------------------------------
          
                stepSummary.totalExecutions++;

                stepSummary.durations.push(duration);


                if (step.status === "passed") {
                    stepSummary.passed++;
                } else {
                    stepSummary.failed++;
                }
            }
        }
    }


    // ============================================================
    // 5. Build stepSummary
    // ============================================================

    const stepSummary = Array.from(
        stepMap.values()
    ).map((step) => {

        const durations = step.durations;

        const min =
            durations.length
                ? Math.min(...durations)
                : 0;

        const max =
            durations.length
                ? Math.max(...durations)
                : 0;

        const average =
            durations.length
                ? durations.reduce(
                    (sum, value) => sum + value,
                    0
                ) / durations.length
                : 0;

        const passRate =
            step.totalExecutions
                ? (step.passed / step.totalExecutions) * 100
                : 0;


        return {

            name: step.name,

            totalExecutions:
                step.totalExecutions,

            passed:
                step.passed,

            failed:
                step.failed,

            passRate:
                Number(passRate.toFixed(2)),

            duration: {

                min:
                    Number(min.toFixed(2)),

                max:
                    Number(max.toFixed(2)),

                average:
                    Number(average.toFixed(2)),
            },
        };
    });


    // ============================================================
    // 6. Overall pass rate
    // ============================================================

    const passRate =
        totalSteps
            ? (passedSteps / totalSteps) * 100
            : 0;


    // ============================================================
    // 7. Final combined result
    // ============================================================

    const finalResult = {

        testExecutionId,

        summary: {
            testExecutionId:testExecutionId,

            rigion : process.env.AWS_REGION,

            worker: 5,

            cpu : "2 vCPU",

            memory:"4 GB",

            user:"kshitij.shirsat",

            tag: [
                "user:kshitij.shirsat",
                "name:loginPerformance"
            ],

            servise:"ecs:fargate",

            totalResultFiles:
                jsonObjects.length,

            totalVirtualUsers:
                virtualUsers.length,

            totalSteps,

            passedSteps,

            failedSteps,

            passRate:
                Number(passRate.toFixed(2)),
        },


        stepSummary,


        virtualUsers,
    };


    // ============================================================
    // 8. Logging
    // ============================================================

    console.log(
        "✅ Test execution result created"
    );

    console.log(
        `📄 Result files: ${
            finalResult.summary.totalResultFiles
        }`
    );

    console.log(
        `👥 Virtual users: ${
            finalResult.summary.totalVirtualUsers
        }`
    );

    console.log(
        `📊 Total steps: ${
            finalResult.summary.totalSteps
        }`
    );

    console.log(
        `✅ Passed: ${
            finalResult.summary.passedSteps
        }`
    );

    console.log(
        `❌ Failed: ${
            finalResult.summary.failedSteps
        }`
    );

    console.log(
        `📈 Pass rate: ${
            finalResult.summary.passRate
        }%`
    );


    return finalResult;
}


// ============================================================
// Run
// ============================================================

// const result = await getTestExecutionResult(
//     "testExecution-1787214133182"
// );


// // Print result
// console.log(
//     JSON.stringify(result, null, 2)
// );


// // Save combined result
// await fs.writeFile(
//     "result_4_worker.json",
//     JSON.stringify(result, null, 2)
// );

// console.log(
//     "✅ Combined result saved to result.json"
// );