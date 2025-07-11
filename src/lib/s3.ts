import AWS from "aws-sdk";
export async function uploadToS3(file: File) {
  try {
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });
    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: { Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME },
      region: process.env.AWS_REGION,
    });
    const file_key =
      "uploads/" + Date.now().toString() + file.name.replace(" ", "_");
    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: file,
    };

    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", function (evt) {
        console.log(evt.loaded + " of " + evt.total + " Bytes");
      })
      .promise();

    await upload.then(() => {
      console.log("Successfully uploaded data to S3");
    });

    return Promise.resolve({ file_key, file_name: file.name });
  } catch (error) {
    console.error(error);
  }
}

export function getS3Url(file_key: string) {
  return `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file_key}`;
}

export async function deleteFromS3(file_key: string) {
  try {
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
    });
    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: { Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME },
      region: process.env.AWS_REGION,
    });
    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
    };

    const del = s3.deleteObject(params).promise();

    await del.then(() => {
      console.log("Successfully deleted from S3");
    });

    return Promise.resolve({ file_key });
  } catch (error) {
    console.error(error);
  }
}
