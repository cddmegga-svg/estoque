export interface IStorageProvider {
  uploadFile(path: string, file: File | Blob): Promise<string>;
  downloadFile(path: string): Promise<Blob>;
  verifyIntegrity(path: string, expectedHash: string): Promise<boolean>;
  deleteFile(path: string): Promise<void>;
}
