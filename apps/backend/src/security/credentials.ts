import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Credentials } from "@showcase/contracts";

const ALGORITHM = "aes-256-gcm";

export interface CredentialCipher {
  encrypt(value: Credentials): string;
  decrypt(ciphertext: string): Credentials;
}

function resolveKey(value: string | undefined): Buffer {
  if (value) {
    const key = Buffer.from(value, "hex");
    if (key.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 64 hexadecimal characters");
    return key;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is required in production");
  }
  return randomBytes(32);
}

export function createCredentialCipher(keyValue = process.env.CREDENTIAL_ENCRYPTION_KEY): CredentialCipher {
  const key = resolveKey(keyValue);
  return {
    encrypt(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
    },
    decrypt(ciphertext) {
      const [ivPart, tagPart, dataPart] = ciphertext.split(".");
      if (!ivPart || !tagPart || !dataPart) throw new Error("Invalid credential ciphertext");
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
      decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(dataPart, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      return JSON.parse(plaintext) as Credentials;
    },
  };
}
