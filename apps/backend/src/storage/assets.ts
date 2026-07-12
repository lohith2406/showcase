import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

export interface AssetStore {
  put(key: string, data: Uint8Array, contentType: string): Promise<string>;
}

export class LocalAssetStore implements AssetStore {
  constructor(
    private readonly root = path.resolve(process.cwd(), "artifacts"),
    private readonly publicBaseUrl = process.env.ASSET_PUBLIC_URL ??
      "http://localhost:4000/assets",
  ) {}

  async put(key: string, data: Uint8Array): Promise<string> {
    const safeKey = key.replace(/[^a-zA-Z0-9/_.-]/g, "-").replace(/\.\./g, "");
    const destination = path.join(this.root, safeKey);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data);
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${safeKey.split(path.sep).join("/")}`;
  }
}

export class VercelBlobAssetStore implements AssetStore {
  async put(
    key: string,
    data: Uint8Array,
    contentType: string,
  ): Promise<string> {
    const result = await put(key, Buffer.from(data), {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return result.url;
  }
}

export function createAssetStore(): AssetStore {
  return process.env.ASSET_STORAGE_PROVIDER === "vercel-blob"
    ? new VercelBlobAssetStore()
    : new LocalAssetStore();
}
