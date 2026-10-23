export const REMOTE_PROTOCOLS = ['http://', 'https://', 's3://', 'gs://', 'ftp://']

export function isRemoteStore(path: string): boolean {
  return REMOTE_PROTOCOLS.some(p => path.toLowerCase().startsWith(p));
}