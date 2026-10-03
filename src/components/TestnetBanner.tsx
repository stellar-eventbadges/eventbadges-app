/**
 * The testnet banner. It is rendered on every screen, including the
 * configuration-error screen, because "this is not real money" is the first
 * thing a reader needs to know.
 */
export function TestnetBanner() {
  return (
    <div className="banner" role="status" aria-live="polite">
      <span className="banner-tag">TESTNET - no real money</span>
      <span>
        This is Stellar&rsquo;s practice network. The tokens are not worth anything and the
        network can be reset, so records can disappear.
      </span>
    </div>
  );
}
