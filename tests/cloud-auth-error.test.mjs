import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudCodeError } from '../src/utils/cloud-auth-error.ts';
test('email delivery restrictions are distinguished from throttling and offline failures', () => {
  assert.match(cloudCodeError({code:'email_address_not_authorized'}), /configure email delivery/);
  assert.match(cloudCodeError({code:'over_email_send_rate_limit'}), /Wait/);
  assert.match(cloudCodeError({status:429}), /Wait/);
  assert.match(cloudCodeError({code:'otp_disabled'}), /disabled/);
  assert.match(cloudCodeError({name:'AuthRetryableFetchError'}), /internet connection/);
});
test('unknown server messages and private fields are never shown to users', () => {
  const sensitive = {code:'unexpected_failure',status:500,message:'smtp password secret user@example.com'};
  const text=cloudCodeError(sensitive);
  assert.match(text,/sign-in service/);
  assert.equal(text.includes('secret'),false);
  assert.equal(text.includes('user@example.com'),false);
});

test('Supabase retryable HTTP server failures are not mislabelled as phone network failures', () => {
  for (const status of [500,502,503,504]) {
    const text=cloudCodeError({name:'AuthRetryableFetchError',status});
    assert.match(text,new RegExp('HTTP '+status));
    assert.equal(text.includes('internet connection'),false);
  }
  assert.match(cloudCodeError({name:'AuthRetryableFetchError',status:0}),/internet connection/);
});
