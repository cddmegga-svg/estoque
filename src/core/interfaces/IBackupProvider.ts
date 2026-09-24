export interface IBackupProvider {
  createSnapshot(): Promise<string>;
  restoreSnapshot(snapshotId: string): Promise<boolean>;
  verifyIntegrity(snapshotId: string): Promise<boolean>;
}
