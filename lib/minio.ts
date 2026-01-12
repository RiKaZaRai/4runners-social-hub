import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.MINIO_REGION ?? 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin'
  },
  forcePathStyle: true
});

export const minioBucket = process.env.MINIO_BUCKET ?? '4runners-media';
