declare module 'aws-sdk' {
  export interface S3Config {
    endpoint?: string;
    s3ForcePathStyle?: boolean;
  }

  export interface S3UploadParams {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType?: string;
    Metadata?: Record<string, string>;
  }

  export interface S3GetObjectParams {
    Bucket: string;
    Key: string;
  }

  export interface S3DeleteObjectParams {
    Bucket: string;
    Key: string;
  }

  export interface S3ListObjectsParams {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
  }

  export interface S3Object {
    Key?: string;
  }

  export interface S3ListObjectsResult {
    Contents?: S3Object[];
  }

  export interface S3GetObjectResult {
    Body: Buffer;
  }

  export interface S3UploadResult {
    Location: string;
    ETag: string;
    Bucket: string;
    Key: string;
  }

  export interface AWSError {
    code: string;
    message: string;
  }

  export class S3 {
    constructor(config?: S3Config);
    upload(params: S3UploadParams): {
      promise(): Promise<S3UploadResult>;
    };
    getObject(params: S3GetObjectParams): {
      promise(): Promise<S3GetObjectResult>;
    };
    deleteObject(params: S3DeleteObjectParams): {
      promise(): Promise<void>;
    };
    listObjects(params: S3ListObjectsParams): {
      promise(): Promise<S3ListObjectsResult>;
    };
  }

  export const config: {
    update(config: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    }): void;
  };

  export { AWSError };
}