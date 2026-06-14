// Runtime env access. Always called INSIDE request handlers (never at module
// top-level) so `next build` succeeds with placeholder/empty env.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(name: string): string | undefined {
  return process.env[name];
}
