/** Header di sicurezza da applicare a tutte le risposte HTML del server Lovable. */
export const HTML_HEADERS: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-cache, must-revalidate, max-age=0",
  "content-security-policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

export const REDIRECT_HEADERS: Record<string, string> = {
  "cache-control": "no-cache",
};

export function html(body: string, status = 200, extra: Record<string, string> = {}) {
  return new Response(body, { status, headers: { ...HTML_HEADERS, ...extra } });
}

export function redirect(to: string, status = 301) {
  return new Response(null, { status, headers: { ...REDIRECT_HEADERS, Location: to } });
}
