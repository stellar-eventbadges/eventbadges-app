/**
 * Shown instead of the app when `.env` is missing values or is pointed at
 * something other than testnet. Nothing else renders, so no transaction can be
 * built from a broken configuration.
 */
export function ConfigNotice({ problems }: { problems: readonly string[] }) {
  return (
    <main className="notice notice-error">
      <h1>This app is not configured yet</h1>
      <p>
        Nothing can be shown or sent until the environment is complete. Copy <code>.env.example</code>{' '}
        to <code>.env</code> and fill in each value.
      </p>
      <ul>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
      <p className="hint">
        The contract id is only available after a real organizer has agreed to a pilot and the
        maintainer has deployed to testnet. Until then it stays a placeholder.
      </p>
    </main>
  );
}
