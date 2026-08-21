import express from "express";
import cors from "cors";

import {
    CloudWatchLogsClient,
    GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.json());


// -----------------------------------------
// AWS
// -----------------------------------------

const cloudwatch = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
});

const LOG_GROUP_NAME =
    "/ecs/sas_loadtest_cluster_new";

const LOG_STREAM_NAME =
    "ecs/Main/a07e20d7b665461882b308be20d2e895";


// -----------------------------------------
// Health check
// -----------------------------------------

app.get("/health", (req, res) => {

    res.json({
        status: "ok"
    });

});


// -----------------------------------------
// Logs
// -----------------------------------------

app.get("/api/logs", async (req, res) => {

    console.log(
        "GET /api/logs"
    );

    try {

        const response = await cloudwatch.send(
            new GetLogEventsCommand({

                logGroupName:
                    LOG_GROUP_NAME,

                logStreamName:
                    LOG_STREAM_NAME,

                startFromHead: true,

                limit: 100,

            })
        );


        const logs =
            response.events || [];


        const result =
            logs.map((event) => ({

                timestamp:
                    new Date(
                        event.timestamp
                    ).toISOString(),

                message:
                    event.message,

            }));


        console.log(
            `Returning ${result.length} logs`
        );


        res.json({
            logs: result
        });


    } catch (error) {

        console.error(
            "CloudWatch error:",
            error
        );


        res.status(500).json({

            error:
                error.message,

        });

    }

});


// -----------------------------------------
// Start server
// -----------------------------------------

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "================================="
        );

    }
);