/**
 * Returns a safe error response for edge functions.
 * Logs the real error server-side; sends only a generic message to the client.
 */
export function errorResponse(
  corsHeaders: Record<string, string>,
  e: unknown,
  status = 500,
): Response {
  console.error('[edge-fn-error]', e);
  return new Response(
    JSON.stringify({ success: false, error: 'An internal error occurred' }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
