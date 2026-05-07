(function () {
  const root = document.getElementById('stelo-gate');
  if (!root) return;
  const productId = root.dataset.productId;
  const API = root.dataset.apiBase.replace(/\/$/, '');
  // Network passphrase passed to Freighter when signing the SIWS challenge.
  // Merchant configures this per storefront via the theme editor — testnet
  // stores must select "testnet" or Freighter will refuse to sign.
  const NETWORK_PASSPHRASE =
    root.dataset.network === 'testnet'
      ? 'Test SDF Network ; September 2015'
      : 'Public Global Stellar Network ; September 2015';

  const $ = (sel) => root.querySelector(sel);
  const show = (el) => el && (el.hidden = false);
  const hide = (el) => el && (el.hidden = true);

  const lockedEl = $('.stelo-gate__locked');
  const verifyingEl = $('.stelo-gate__verifying');
  const failedEl = $('.stelo-gate__failed');
  const passedEl = $('.stelo-gate__passed');
  const errorEl = $('.stelo-gate__error');
  const walletEl = $('.stelo-gate__wallet');
  const buyBtn = document.querySelector('form[action="/cart/add"] button[type="submit"]');
  const buyAddons = document.querySelectorAll('[data-stelo-gated-action]');

  function setBuyEnabled(on) {
    if (buyBtn) buyBtn.disabled = !on;
    buyAddons.forEach((b) => (b.disabled = !on));
  }

  async function recordWalletInCart(walletAddress) {
    try {
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attributes: { stelo_buyer_wallet: walletAddress } }),
      });
    } catch (e) {
      // non-fatal — webhook fallback can still cancel order if wallet missing
      console.warn('stelo-gate: cart attribute write failed', e);
    }
  }

  async function checkGate() {
    let r, data;
    try {
      r = await fetch(`${API}/gating/check?merchantProductId=${productId}`, { credentials: 'include' });
      data = await r.json();
    } catch {
      // Network failure → fail closed
      hide(passedEl); hide(lockedEl); hide(verifyingEl); show(failedEl);
      errorEl.textContent = 'Verification temporarily unavailable. Please try again in a moment.';
      setBuyEnabled(false);
      return;
    }
    if (r.status === 503) {
      // Backend exhausted retries against Horizon/Soroban — fail closed.
      hide(passedEl); hide(lockedEl); hide(verifyingEl); show(failedEl);
      errorEl.textContent = data.message || 'Verification temporarily unavailable. Please try again in a moment.';
      setBuyEnabled(false);
      return;
    }
    if (data.passed) {
      hide(lockedEl); hide(failedEl); hide(verifyingEl); show(passedEl);
      walletEl.textContent = data.walletAddress || '';
      setBuyEnabled(true);
    } else if (data.reason === 'no_wallet') {
      hide(passedEl); hide(failedEl); hide(verifyingEl); show(lockedEl);
      setBuyEnabled(false);
    } else {
      hide(passedEl); hide(lockedEl); hide(verifyingEl); show(failedEl);
      errorEl.textContent = data.errorMessage || "You don't hold the required asset.";
      setBuyEnabled(false);
    }
  }

  async function connect() {
    if (!window.freighterApi) {
      alert('Please install the Freighter Stellar wallet extension to continue.');
      return;
    }
    show(verifyingEl); hide(lockedEl);

    try {
      const { address } = await window.freighterApi.requestAccess();
      const c = await fetch(`${API}/gating/buyer-siws/challenge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const { nonce } = await c.json();
      // Freighter API: signMessage returns { signedMessage }; signature is hex-encoded raw bytes.
      // Verify against the actual Freighter SDK shape; this matches v3+ API.
      const sigResult = await window.freighterApi.signMessage(nonce, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      const signed = sigResult.signedMessage || sigResult.signedTxXdr || sigResult;
      await fetch(`${API}/gating/buyer-siws/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signedNonce: signed }),
      });
      await recordWalletInCart(address);
      await checkGate();
    } catch (err) {
      hide(verifyingEl); show(failedEl);
      errorEl.textContent = `Wallet connect failed: ${err && err.message ? err.message : 'unknown'}`;
      setBuyEnabled(false);
    }
  }

  $('.stelo-gate__connect').addEventListener('click', connect);
  setBuyEnabled(false);
  checkGate();
})();
