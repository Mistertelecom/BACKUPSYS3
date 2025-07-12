export interface Provider {
  id: number;
  name: string;
  type: 'local' | 'aws-s3' | 'gcs' | 'dropbox' | 'google-drive';
  config: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderConfig {
  [key: string]: any;
}

export interface LocalConfig {
  path: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface GCSConfig {
  bucket: string;
  projectId: string;
  keyFilename?: string;
  credentials?: object;
}

export interface DropboxConfig {
  accessToken: string;
  refreshToken?: string;
  appKey?: string;
  appSecret?: string;
  folderPath?: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  folderId?: string;
  folderName?: string;
}

export const PROVIDER_TYPES = {
  local: 'Local Storage',
  'aws-s3': 'AWS S3',
  gcs: 'Google Cloud Storage',
  dropbox: 'Dropbox',
  'google-drive': 'Google Drive'
} as const;

export const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];