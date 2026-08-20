// Supabase delivers the outcome of an email link in the URL fragment:
//   #access_token=...&type=recovery
//   #error=access_denied&error_code=otp_expired&error_description=...
//
// supabase-js consumes and erases that fragment while the client initialises,
// so it has to be read once, synchronously, at import time. Keeping the parsing
// here means it can be tested without constructing a client.
export function parseAuthFragment(rawHash) {
  const params = new URLSearchParams((rawHash || '').replace(/^#/, ''))
  const type = params.get('type')
  const error = params.get('error')

  return {
    isRecovery: type === 'recovery',
    isConfirmation: type === 'signup' || type === 'email_change',
    error: error
      ? {
          code: params.get('error_code') || error,
          // GoTrue form-encodes the description, so '+' means space.
          description: (params.get('error_description') || '').replace(/\+/g, ' '),
        }
      : null,
  }
}
