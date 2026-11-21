export type LoginIntent = 'customer' | 'merchant';

const KEY = 'celerity_login_intent';

export function getLoginIntent(): LoginIntent {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === 'merchant' || v === 'customer') return v;
  } catch {
    /* ignore */
  }
  return 'customer';
}

/** Remember Customer vs Merchant for post-login portal routing. */
export function setLoginIntent(intent: LoginIntent) {
  try {
    sessionStorage.setItem(KEY, intent);
  } catch {
    /* ignore */
  }
}

export function clearLoginIntent() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
