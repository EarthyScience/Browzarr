const REMOTE_PROTOCOLS = ['http://', 'https://', 's3://', 'gs://', 'ftp://']

export function isRemoteStore(path: string): boolean {
  return REMOTE_PROTOCOLS.some(p => path.toLowerCase().startsWith(p));
}

export function toHttps(url: string): string {
  const lower = url.toLowerCase();
  if (lower.startsWith('gs://')) {
    return `https://storage.googleapis.com/${url.slice(5)}`;
  }
  if (lower.startsWith('s3://')) {
    const rest = url.slice(5);
    const slash = rest.indexOf('/');
    const bucket = slash === -1 ? rest : rest.slice(0, slash);
    const key = slash === -1 ? '' : rest.slice(slash);
    return `https://${bucket}.s3.amazonaws.com${key}`;
  }
  return url;
}