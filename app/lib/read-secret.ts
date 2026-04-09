import { readFileSync, existsSync } from 'node:fs';

/**
 * Mapping from environment variable names to Docker secret file names.
 * Docker secrets are mounted at /run/secrets/<secret_name>.
 */
const SECRET_NAME_MAP: Record<string, string> = {
  SHOPIFY_API_SECRET: 'shopify_secret',
};

/**
 * Read a secret from Docker secrets (/run/secrets/<name>),
 * falling back to the corresponding environment variable.
 *
 * This allows the same code to work both in Docker (with secrets)
 * and locally (with .env files).
 */
export function readSecret(name: string): string | undefined {
  const secretName = SECRET_NAME_MAP[name] || name.toLowerCase();
  const secretPath = `/run/secrets/${secretName}`;

  if (existsSync(secretPath)) {
    return readFileSync(secretPath, 'utf-8').trim();
  }

  return process.env[name];
}
