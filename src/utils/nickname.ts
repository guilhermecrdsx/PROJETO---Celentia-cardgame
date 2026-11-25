/**
 * Shared @nick handle normalization & validation helpers used across both
 * Express backend (PostgreSQL) and React frontend.
 *
 * Rules:
 * - Always starts with "@"
 * - Followed by 2 to 17 characters matching [a-zA-Z0-9_.]
 * - Total length between 3 and 18 characters (e.g. @joao, @Arcanista_99)
 * - Uniqueness is enforced case-insensitively on the server
 */

export const HANDLE_REGEX = /^@[a-zA-Z0-9_.]{2,17}$/;
export const HANDLE_MAX_LENGTH = 18;
export const HANDLE_MIN_BODY_LENGTH = 2;

/**
 * Strips whitespace, collapses leading "@", and removes invalid handle chars
 * while preserving the user's preferred casing. Always prefixes with "@".
 */
export function sanitizeHandleDraft(raw: string): string {
  const withoutAt = String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .slice(0, HANDLE_MAX_LENGTH - 1);
  return `@${withoutAt}`;
}

/**
 * Normalizes a display name (e.g. from Google Auth or legacy DB rows) into
 * a guaranteed valid @handle base string.
 */
export function buildBaseHandleFromRaw(raw: string, fallback = 'duelista'): string {
  const ascii = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .slice(0, HANDLE_MAX_LENGTH - 1);

  const safeBody = ascii.length >= HANDLE_MIN_BODY_LENGTH ? ascii : fallback;
  return `@${safeBody.slice(0, HANDLE_MAX_LENGTH - 1)}`;
}

/**
 * Validates user-submitted handle input. Automatically ensures leading "@"
 * and rejects invalid characters or lengths.
 */
export function validateHandle(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed === '@') {
    return {
      valid: false,
      normalized: '@',
      error: 'Informe um nick válido começando com @ (ex: @arcanista).',
    };
  }

  const withPrefix = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;

  if (withPrefix.length < 3) {
    return {
      valid: false,
      normalized: withPrefix,
      error: 'O nick deve ter pelo menos 2 caracteres após o @ (ex: @lu).',
    };
  }

  if (withPrefix.length > HANDLE_MAX_LENGTH) {
    return {
      valid: false,
      normalized: withPrefix.slice(0, HANDLE_MAX_LENGTH),
      error: `O nick pode ter no máximo ${HANDLE_MAX_LENGTH} caracteres (incluindo @).`,
    };
  }

  if (!HANDLE_REGEX.test(withPrefix)) {
    return {
      valid: false,
      normalized: withPrefix,
      error:
        'Use apenas letras, números, ponto (.) ou underline (_) após o @, sem espaços ou acentos.',
    };
  }

  return { valid: true, normalized: withPrefix };
}

/**
 * Formats any stored nickname for consistent UI display with a leading "@".
 */
export function formatHandleDisplay(nick?: string | null): string {
  const clean = String(nick || '').trim();
  if (!clean) return '@duelista';
  return clean.startsWith('@') ? clean : `@${clean}`;
}
