import path from "node:path";

export function resolveDatabaseUrl(rawUrl = process.env.DATABASE_URL ?? "") {
  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }

  const sqlitePath = rawUrl.slice("file:".length);
  if (!sqlitePath) {
    return rawUrl;
  }

  if (path.isAbsolute(sqlitePath)) {
    return `file:${sqlitePath.replace(/\\/g, "/")}`;
  }

  const resolved = path.resolve(process.cwd(), "prisma", sqlitePath);
  return `file:${resolved.replace(/\\/g, "/")}`;
}
