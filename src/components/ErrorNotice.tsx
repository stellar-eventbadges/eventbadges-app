import type { MappedError } from '../lib/contractErrors';

/**
 * Shows a failure using the reviewed wording from `ERRORS.md` (mapped by
 * `describeContractError`) plus its suggested next action.
 */
export function ErrorNotice({ error }: { error: MappedError }) {
  return (
    <div className="notice notice-error" role="alert">
      <p className="notice-title">{error.message}</p>
      {error.nextAction !== undefined && <p>{error.nextAction}</p>}
      {error.code !== undefined && <p className="hint">Contract error code: {error.code}</p>}
    </div>
  );
}
