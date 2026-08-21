import dotenv from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand
} from "@aws-sdk/client-s3";

dotenv.config();

// Load configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
const METADATA_BUCKET = process.env.S3_METADATA_BUCKET || "sas-metadata-db";

const s3 = new S3Client({ region: AWS_REGION });

export async function getTestMetaData() {
  const list = await s3.send(
    new ListObjectsV2Command({
      Bucket: METADATA_BUCKET,
      Prefix: "metadata_db/"
    })
  );

  const data = [];

  for (const file of list.Contents || []) {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: METADATA_BUCKET,
        Key: file.Key
      })
    );

    const text = await result.Body.transformToString();
    data.push(JSON.parse(text));
  }

  return data;
}

export async function getTestMetaDataById(executionId) {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: METADATA_BUCKET,
      Key: `metadata_db/${executionId}.json`
    })
  );

  const text = await result.Body.transformToString();

  return JSON.parse(text);
}

// // Example
// const data = await getTestMetaDataById("testExecution-1787214133182");


// const data = await getTestMetaData();

// console.log(data);