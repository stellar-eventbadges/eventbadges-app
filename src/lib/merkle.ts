/**
 * The Merkle tree the contract verifies: `hash_pair` in
 * `eventbadges-contracts/src/badges.rs`. Leaves are `SHA-256(code)`, one per
 * attendee; every pair is sorted **byte-wise** before hashing — compare the
 * bytes, not the hex strings as text — so a proof is an unordered list of
 * siblings; and an odd level is closed by hashing its last node with itself,
 * which keeps every proof `ceil(log2(leaves))` long.
 *
 * The same rule is written out in the contracts repo's `docs/claim-codes.md`.
 * Everything here runs in the browser; nothing is sent anywhere.
 */

export interface MerkleTree {
  readonly root: Uint8Array<ArrayBuffer>;
  /** One proof per leaf, in leaf order, leaf level first. */
  readonly proofs: readonly (readonly Uint8Array<ArrayBuffer>[])[];
}

/** SHA-256 over the concatenation of `parts`. */
export async function sha256Bytes(
  parts: readonly Uint8Array[],
): Promise<Uint8Array<ArrayBuffer>> {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  const digest = await crypto.subtle.digest('SHA-256', joined);
  return new Uint8Array(digest);
}

/** Byte-wise ordering, the same comparison the contract makes (`a <= b`). */
function lowerFirst(a: Uint8Array, b: Uint8Array): [Uint8Array, Uint8Array] {
  const shared = Math.min(a.length, b.length);
  for (let index = 0; index < shared; index += 1) {
    if (a[index] !== b[index]) {
      return a[index] < b[index] ? [a, b] : [b, a];
    }
  }
  return a.length <= b.length ? [a, b] : [b, a];
}

/** One tree step: the sorted pair hashed together. */
export async function merklePair(
  a: Uint8Array,
  b: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const [low, high] = lowerFirst(a, b);
  return sha256Bytes([low, high]);
}

/**
 * Builds the tree over `leaves` (at least one) and returns its root and every
 * leaf's proof. A one-leaf tree has the leaf as its root and an empty proof.
 */
export async function buildMerkleTree(
  leaves: readonly Uint8Array<ArrayBuffer>[],
): Promise<MerkleTree> {
  if (leaves.length === 0) {
    throw new Error('a Merkle tree needs at least one leaf');
  }

  const levels: Uint8Array<ArrayBuffer>[][] = [[...leaves]];
  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const next: Uint8Array<ArrayBuffer>[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = index + 1 < current.length ? current[index + 1] : left;
      next.push(await merklePair(left, right));
    }
    levels.push(next);
  }

  const root = levels[levels.length - 1][0];
  const proofs: Uint8Array<ArrayBuffer>[][] = leaves.map((_, leafIndex) => {
    const proof: Uint8Array<ArrayBuffer>[] = [];
    let index = leafIndex;
    for (const level of levels) {
      if (level.length === 1) break;
      // A lone node is its own sibling, so an odd level still gives one
      // sibling per level.
      const sibling = index ^ 1;
      proof.push(sibling < level.length ? level[sibling] : level[index]);
      index >>= 1;
    }
    return proof;
  });

  return { root, proofs };
}
