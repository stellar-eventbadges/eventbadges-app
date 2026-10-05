import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bytesToHex, hexToBytes } from './claimCode';
import { buildMerkleTree, merklePair, sha256Bytes } from './merkle';
import { foldProof, referenceProof, referenceRoot } from '../test/merkleReference';

const nodeHash = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

/** `SHA-256(32 x seed)` — the leaf for a synthetic claim code. */
function leafBytes(seed: number): Uint8Array<ArrayBuffer> {
  const filled = new Uint8Array(32).fill(seed);
  return new Uint8Array(createHash('sha256').update(filled).digest());
}

// Fixed vectors computed independently of this module with .NET's SHA-256 via
// PowerShell — a different language and implementation of the same formula —
// for the synthetic seeds 0x11, 0x22, 0x33, 0x44.
const VECTORS = {
  l11: '02d449a31fbb267c8f352e9968a79e3e5fc95c1bbeaa502fd6454ebde5a4bedc',
  l22: '9f72ea0cf49536e3c66c787f705186df9a4378083753ae9536d65b3ad7fcddc4',
  l33: 'deb0e38ced1e41de6f92e70e80c418d2d356afaaa99e26f5939dbc7d3ef4772a',
  l44: 'bb391415c05e39d77ca17381d3be3f7d0cd5e5332e5a579311adaa0aa62106e9',
  p12: '4aa9c7fb082fdd4e0228c3f7447d26c928b596ce0acb554900ac7f3fdbfe9dd8',
  p34: '8d8bf5ce55d458e88d9b2770f9b94e721b1f95b0a376ef144937a494d313165c',
  p33: '03887f493d47a118a2fa12e53e650322e5ebb7fa11ce5f7c5bfd384999fa1360',
  root3: 'b10c10014cddd65ce2153c08792274660b22f4e021133759cfc5651429663650',
  root4: '5e2527d6dd500fcee0d211771b95248808222698f6d92a2d5ff125f9d2765a05',
} as const;

describe('buildMerkleTree', () => {
  it('gives a one-leaf tree its leaf as the root and an empty proof', async () => {
    const leaf = leafBytes(0x11);
    const tree = await buildMerkleTree([leaf]);
    expect(bytesToHex(tree.root)).toBe(VECTORS.l11);
    expect(tree.proofs).toHaveLength(1);
    expect(tree.proofs[0]).toEqual([]);
  });

  it('matches fixed .NET vectors for three leaves, including the odd self-pair', async () => {
    const leaves = [leafBytes(0x11), leafBytes(0x22), leafBytes(0x33)];
    expect(bytesToHex(leaves[0])).toBe(VECTORS.l11);
    expect(bytesToHex(leaves[1])).toBe(VECTORS.l22);
    expect(bytesToHex(leaves[2])).toBe(VECTORS.l33);

    const tree = await buildMerkleTree(leaves);
    expect(bytesToHex(tree.root)).toBe(VECTORS.root3);
    expect(tree.proofs.map((proof) => proof.map(bytesToHex))).toEqual([
      [VECTORS.l22, VECTORS.p33],
      [VECTORS.l11, VECTORS.p33],
      [VECTORS.l33, VECTORS.p12],
    ]);
  });

  it('matches fixed .NET vectors for four leaves', async () => {
    const leaves = [leafBytes(0x11), leafBytes(0x22), leafBytes(0x33), leafBytes(0x44)];
    expect(bytesToHex(leaves[3])).toBe(VECTORS.l44);
    const tree = await buildMerkleTree(leaves);
    expect(bytesToHex(tree.root)).toBe(VECTORS.root4);
    expect(tree.proofs.map((proof) => proof.map(bytesToHex))).toEqual([
      [VECTORS.l22, VECTORS.p34],
      [VECTORS.l11, VECTORS.p34],
      [VECTORS.l44, VECTORS.p12],
      [VECTORS.l33, VECTORS.p12],
    ]);
  });

  it('agrees with an independently written reference for sizes 1 through 9', async () => {
    for (let size = 1; size <= 9; size += 1) {
      const leaves = Array.from({ length: size }, (_, index) => leafBytes(index + 1));
      const hexLeaves = leaves.map(bytesToHex);
      const tree = await buildMerkleTree(leaves);

      expect(bytesToHex(tree.root)).toBe(referenceRoot(hexLeaves));
      tree.proofs.forEach((proof, index) => {
        const proofHex = proof.map(bytesToHex);
        expect(proofHex).toEqual(referenceProof(hexLeaves, index));
        // Every proof must fold back to the committed root.
        expect(foldProof(hexLeaves[index], proofHex)).toBe(bytesToHex(tree.root));
      });
    }
  });

  it('builds the contract’s maximum tree within the proof-depth bound', async () => {
    const size = 10_000;
    const leaves = Array.from({ length: size }, (_, index) => leafBytes(index % 251));
    const tree = await buildMerkleTree(leaves);

    expect(tree.proofs).toHaveLength(size);
    expect(Math.max(...tree.proofs.map((proof) => proof.length))).toBe(14);
    expect(bytesToHex(tree.root)).toBe(referenceRoot(leaves.map(bytesToHex)));
  });

  it('refuses an empty tree', async () => {
    await expect(buildMerkleTree([])).rejects.toThrow('at least one leaf');
  });
});

describe('merklePair', () => {
  it('hashes the same pair the same way whichever side is offered first', async () => {
    const a = leafBytes(0x11);
    const b = leafBytes(0x22);
    expect(bytesToHex(await merklePair(a, b))).toBe(VECTORS.p12);
    expect(bytesToHex(await merklePair(b, a))).toBe(VECTORS.p12);
  });
});

describe('sha256Bytes', () => {
  it('hashes the concatenation of its parts', async () => {
    const first = hexToBytes('ab'.repeat(32));
    const second = hexToBytes('cd'.repeat(16));
    const concatenated = new Uint8Array([...first, ...second]);
    expect(bytesToHex(await sha256Bytes([first, second]))).toBe(
      nodeHash(concatenated),
    );
  });
});
