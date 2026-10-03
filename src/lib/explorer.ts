function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/** A link to a transaction on the configured explorer. */
export function explorerTxUrl(baseUrl: string, hash: string): string {
  return `${trimBase(baseUrl)}/tx/${hash}`;
}

/** A link to a contract on the configured explorer. */
export function explorerContractUrl(baseUrl: string, contractId: string): string {
  return `${trimBase(baseUrl)}/contract/${contractId}`;
}

/** Shortens a hash or address for display, keeping both ends. */
export function shorten(value: string, edge = 6): string {
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}
