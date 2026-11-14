type AuthFailure = { code?: string; status?: number; name?: string };
export function cloudCodeError(error: AuthFailure) {
  switch (error.code) {
    case 'email_address_not_authorized':
      return 'This email address cannot receive sign-in codes yet. The app owner needs to configure email delivery.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many sign-in requests. Wait before requesting another code.';
    case 'email_provider_disabled':
    case 'otp_disabled':
    case 'signup_disabled':
      return 'Email sign-in is disabled for this app. Contact the app owner.';
    case 'email_address_invalid':
      return 'This email address is not supported. Use a valid personal or work email address.';
    case 'captcha_failed':
      return 'Sign-in requires a security check that this app cannot complete yet. Contact the app owner.';
    case 'request_timeout':
      return 'The sign-in request timed out. Check your connection and try again.';
  }
  if (error.status === 429) return 'Too many sign-in requests. Wait before requesting another code.';
  if (error.status && error.status >= 500) return `The sign-in service returned HTTP ${error.status}. Email delivery may be unavailable. Contact the app owner.`;
  if ((error.name === 'AuthRetryableFetchError' && !error.status) || error.status === 0) return 'Unable to reach sign-in. Check your internet connection and try again.';
  if (error.status === 401 || error.status === 403) return 'Cloud sign-in configuration was rejected. Contact the app owner.';
  return 'Unable to request a sign-in code. Please try again later.';
}
