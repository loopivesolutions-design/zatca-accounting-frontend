/**
 * Structured error response from the backend (HTTP 422 / 400).
 */
interface ApiErrorBody {
  error?: string;          // e.g. "TAX_RATE_IS_DEFAULT"
  message?: string;        // human-readable message
  suggestion?: string;     // hint for the user
  details?: { field?: string; code?: string; message?: string }[];
  locked_fields?: string[];
  editable_fields?: string[];
  [key: string]: unknown;  // validation field errors: { "rate": ["..."] }
}

/**
 * Extract the best user-facing message from an axios error.
 * Returns { title, detail } where:
 *   title  — short error name / code (optional, shown as bold prefix)
 *   detail — full message to show the user
 */
export function parseApiError(err: unknown): string {
  const body = (err as { response?: { data?: ApiErrorBody & { non_field_errors?: string[] } } }).response?.data;
  if (!body) return 'An unexpected error occurred. Please try again.';

  // Structured ZATCA / business-rule error (has `message` key)
  if (body.message) {
    const hint = body.suggestion ? `\n\nHint: ${body.suggestion}` : '';
    let detail = '';
    if (Array.isArray(body.details) && body.details.length) {
      detail = '\n\n' + body.details
        .map((d) => [d.field, d.code, d.message].filter(Boolean).join(' — '))
        .join('\n');
    }
    return body.message + hint + detail;
  }

  if (Array.isArray(body.non_field_errors) && body.non_field_errors.length) {
    return body.non_field_errors.join('\n');
  }

  // DRF validation error — flat or nested field errors
  const lines: string[] = [];
  for (const val of Object.values(body)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string') lines.push(item);
        else if (item && typeof item === 'object') lines.push(JSON.stringify(item));
      }
    } else if (typeof val === 'string') lines.push(val);
  }
  if (lines.length) return lines.join('\n');

  return 'Failed to complete the request.';
}

/**
 * Returns the error code string if present (e.g. "TAX_RATE_IS_DEFAULT").
 */
export function parseApiErrorCode(err: unknown): string | null {
  return (err as { response?: { data?: { error?: string } } })
    .response?.data?.error ?? null;
}
