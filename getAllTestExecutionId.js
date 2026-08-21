import {
  S3Client,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "eu-north-1"
});

const BUCKET_NAME = "sas-migration-result-eveidence";

async function getTopLevelFolders() {
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: "/"
    })
  );

  return (response.CommonPrefixes || []).map(
    item => item.Prefix.replace(/\/$/, "")
  );
}

export async function getAllTestsFromS3() {
  try {
    const folders = await getTopLevelFolders();

    console.log(folders);

    return folders; // <-- THIS WAS MISSING
  } catch (error) {
    console.error("S3 Error:", error);
    throw error; // <-- let server.js handle the error
  }
}