import { createHash } from 'node:crypto';

/**
 * A test-only reference implementation of the tree rule in
 * `eventbadges-contracts/docs/claim-codes.md`, written independently of
 * `src/lib/merkle.ts` on node's own SHA-256. Render and unit tests compare the
 * app's builder against this; `src/lib/merkle.test.ts` also pins it against
 * fixed vectors computed with .NET's SHA-256.
 */

const hashHex = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

/** The leaf for one attendee's code. */
export function referenceLeaf(codeHex: string): string {
  return hashHex(Buffer.from(codeHex, 'hex'));
}

/** The committed root over `leavesHex`, one level at a time. */
export function referenceRoot(leavesHex: readonly string[]): string {
  let level = [...leavesHex];
  while (level.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = index + 1 < level.length ? level[index + 1] : left;
      const [low, high] = left <= right ? [left, right] : [right, left];
      next.push(hashHex(Buffer.concat([Buffer.from(low, 'hex'), Buffer.from(high, 'hex')])));
    }
    level = next;
  }
  return level[0];
}

/** The proof for one leaf: the sibling at each level, bottom up. */
export function referenceProof(leavesHex: readonly string[], leafIndex: number): string[] {
  const proof: string[] = [];
  let level = [...leavesHex];
  let index = leafIndex;
  while (level.length > 1) {
    const sibling = index ^ 1;
    proof.push(sibling < level.length ? level[sibling] : level[index]);
    const next: string[] = [];
    for (let pairIndex = 0; pairIndex < level.length; pairIndex += 2) {
      const left = level[pairIndex];
      const right = pairIndex + 1 < level.length ? level[pairIndex + 1] : left;
      const [low, high] = left <= right ? [left, right] : [right, left];
      next.push(hashHex(Buffer.concat([Buffer.from(low, 'hex'), Buffer.from(high, 'hex')])));
    }
    level = next;
    index >>= 1;
  }
  return proof;
}

/** Folds a leaf and its proof up to a root. */
export function foldProof(leafHex: string, proofHex: readonly string[]): string {
  let node = leafHex;
  for (const sibling of proofHex) {
    const [low, high] = node <= sibling ? [node, sibling] : [sibling, node];
    node = hashHex(Buffer.concat([Buffer.from(low, 'hex'), Buffer.from(high, 'hex')]));
  }
  return node;
}
