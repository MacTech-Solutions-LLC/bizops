/**
 * Storage adapter boundary. Document *binaries* are never stored in Postgres —
 * only metadata + a `storageReference` (key/path/URL). This interface lets the
 * app swap the physical store (S3, Azure Blob, Google Drive, SharePoint, Railway
 * volume, GitHub) without touching the domain layer. The default adapter is a
 * local/Railway-volume filesystem reference resolver; cloud adapters are stubs to
 * be wired when credentials are provisioned.
 */

export type StorageProvider =
  | "local"
  | "railway_volume"
  | "s3"
  | "azure_blob"
  | "google_drive"
  | "sharepoint"
  | "github";

export interface StoredObjectRef {
  provider: StorageProvider;
  /** Opaque reference: object key, path, or URL. Never the binary. */
  reference: string;
  contentType?: string;
  sizeBytes?: number;
  checksum?: string;
}

export interface StorageAdapter {
  readonly provider: StorageProvider;
  /** Produce a (possibly time-limited) URL a user can use to fetch the object. */
  resolveUrl(ref: StoredObjectRef): Promise<string>;
  /** Whether this adapter is configured and usable in the current environment. */
  isConfigured(): boolean;
}

/** Local / Railway-volume adapter — reference is a path or absolute URL. */
class LocalStorageAdapter implements StorageAdapter {
  readonly provider: StorageProvider = "railway_volume";
  isConfigured() {
    return true;
  }
  async resolveUrl(ref: StoredObjectRef): Promise<string> {
    // If the reference is already a URL, pass it through; otherwise expose it as
    // a relative path under the configured volume mount.
    if (/^https?:\/\//.test(ref.reference)) return ref.reference;
    const base = process.env.STORAGE_PUBLIC_BASE_URL ?? "";
    return `${base}${ref.reference.startsWith("/") ? "" : "/"}${ref.reference}`;
  }
}

/** Cloud adapter stubs — throw until configured so callers fail loudly, never
 * silently serve the wrong object. */
class UnconfiguredAdapter implements StorageAdapter {
  constructor(readonly provider: StorageProvider) {}
  isConfigured() {
    return false;
  }
  async resolveUrl(): Promise<string> {
    throw new Error(`Storage provider "${this.provider}" is not configured.`);
  }
}

const ADAPTERS: Record<StorageProvider, StorageAdapter> = {
  local: new LocalStorageAdapter(),
  railway_volume: new LocalStorageAdapter(),
  s3: new UnconfiguredAdapter("s3"),
  azure_blob: new UnconfiguredAdapter("azure_blob"),
  google_drive: new UnconfiguredAdapter("google_drive"),
  sharepoint: new UnconfiguredAdapter("sharepoint"),
  github: new UnconfiguredAdapter("github"),
};

export function getStorageAdapter(provider: StorageProvider | null | undefined): StorageAdapter {
  return ADAPTERS[provider ?? "railway_volume"] ?? ADAPTERS.railway_volume;
}
