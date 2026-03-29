import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionSecret() {
  return (
    process.env.BILIMCLASS_CREDENTIALS_SECRET ??
    process.env.JWT_REFRESH_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    ""
  );
}

function getKey() {
  const secret = getEncryptionSecret();

  if (!secret) {
    throw new Error("BILIMCLASS_CREDENTIALS_SECRET or JWT secrets must be configured");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptBilimClassSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptBilimClassSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length).split(".");
  if (payload.length !== 3) {
    throw new Error("BilimClass secret payload is invalid");
  }

  const [iv, authTag, encrypted] = payload;
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
