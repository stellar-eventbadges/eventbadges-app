/**
 * The attendee privacy notice, in one place.
 *
 * These strings are the app's half of item 7 of the legal-review checklist
 * ("what attendees are told"), drafted in `docs/attendee-notice.md` with every
 * line traced to the code that makes it true. They live here rather than
 * inside a component for the same reason `contractErrors.ts` exists: wording
 * that is tested in one module cannot drift between the short and full
 * versions, and cannot be quietly deleted from one of them.
 *
 * Nothing here is legal advice, and the wording says so. The claims are
 * verified against `eventbadges-contracts`; see `docs/attendee-notice.md` for
 * the traceability table.
 */

export interface NoticeSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

/**
 * The one sentence about the claim code. It is the reason this notice exists,
 * and it has changed twice with the contract:
 *
 * 1. ADR 0002 made `claim` take the code's SHA-256, so the code itself stopped
 *    entering a transaction — but that digest was stored on the event and
 *    readable by anyone, so the warning became "your code is hashed, and the
 *    hash is public anyway".
 * 2. ADR 0003 made each attendee's code their own leaf of a Merkle tree, and
 *    the event now stores only the root. Leaves are not derivable from it and
 *    a leaf is spent when used, so the public record no longer hands anyone
 *    the means to claim: what remains is that a leaked code can be used first.
 *
 * It is named separately and interpolated into both lengths, and
 * `privacyNotice.test.ts` fails if it goes missing from either. If the
 * contract ever publishes something a claim can be made from again, this
 * sentence becomes wrong and must change with it.
 */
export const CLAIM_CODE_WARNING =
  'The claim code you type is never sent: your browser hashes it first, and only that hash goes to the network. Each attendee has their own code, and one code is good for one badge.';

export const NOTICE_TITLE = 'Before you claim';

export const NOTICE_INTRO =
  'Claiming writes one thing to a public blockchain: a record that your wallet address holds a badge for this event. Anyone, anywhere, can read it, with no wallet and without asking anyone.';

/** The four points shown above the claim button. */
export const NOTICE_POINTS: readonly string[] = [
  'Your address and the time you claimed are public, and can be linked together across every event you ever claim from.',
  'Nothing can ever be deleted. If the organizer takes your badge back, the record of you claiming it stays.',
  CLAIM_CODE_WARNING,
  'This is testnet software that has never been used with real people.',
];

export const NOTICE_ACK_LABEL =
  'I understand my address will be recorded publicly and cannot be removed.';

export const NOTICE_TOGGLE_LABEL = 'Read the full notice';
export const NOTICE_TOGGLE_LABEL_COLLAPSED = 'Hide the full notice';

/** Shown under the claim button while the acknowledgement is unticked. */
export const NOTICE_GATE_HINT =
  'Read the notice above and tick the box to enable claiming.';

/** The full notice, shown one tap from the short one. */
export const FULL_NOTICE_SECTIONS: readonly NoticeSection[] = [
  {
    heading: 'What a badge actually is',
    paragraphs: [
      'A badge is not an item in your wallet. It is a line of text on a public network saying that this address holds a badge for this event. That record is what makes the badge worth something — and it is what it costs you.',
    ],
  },
  {
    heading: 'What becomes public',
    paragraphs: [
      'Your wallet address, against this event.',
      'The moment you claimed it. Your address and that timestamp can be matched up, so anyone can build a list of every event you have ever claimed from, using this one address.',
      'That you attended an event. The event’s name is stored as a hash rather than readable text. There are not many plausible event names, so someone determined can work it out. Treat the event as public, not as hidden.',
    ],
  },
  {
    heading: 'What can never be undone',
    paragraphs: [
      'Nothing in a transaction’s history can be deleted, ever. Not by you, not by the organizer, not by anyone.',
      'The organizer can remove your badge at any time, including long after the deadline, for badges issued in error. The removal does not erase the fact that you claimed.',
      'An organizer can also issue a badge to your address without you ever claiming. If you did not claim it yourself, you did not necessarily attend. Check before you rely on a badge you did not claim.',
      'The contract’s own badge entry is kept alive for a period after the event and can eventually expire if nobody reads it for months. That is not deletion: your address and your claim remain in the permanent transaction history either way.',
    ],
  },
  {
    heading: 'Your claim code is yours alone',
    paragraphs: [
      CLAIM_CODE_WARNING,
      'The event\u2019s public record holds one fingerprint of every attendee\u2019s code together, which is what the contract checks your code against. That fingerprint does not give anyone a code, and it cannot be used to claim: only someone holding a code can claim with it.',
      'Keep your code to yourself anyway. If someone else gets it, they can use it before you do, and the one place it was good for is gone. Tell the organizer if that happens — they can take back the badge that used it and issue you one directly.',
    ],
  },
  {
    heading: 'Addresses are pseudonymous, not anonymous',
    paragraphs: [
      'Nothing here is tied to your name — but the moment anyone links your address to your identity (a payment, a social post, any earlier transaction you made), every badge you have claimed becomes attributable to you, forever.',
      'If that matters to you, use a fresh, empty wallet for the event, funded only with what you need for fees, and do not reuse it elsewhere.',
    ],
  },
  {
    heading: 'Why anyone can check you, too',
    paragraphs: [
      'Anyone can confirm whether an address holds a badge for an event, with no wallet and no permission from the organizer. That is deliberate: a proof nobody else can check proves nothing. It also means your attendance is a public statement, not a private record.',
    ],
  },
  {
    heading: 'What this software has not done',
    paragraphs: [
      'This is testnet-only software. No version of it has yet been used with real attendees by anyone, and no contract has been deployed. It has had no security review or audit. You may lose a badge; testnet tokens have no value.',
    ],
  },
  {
    heading: 'Agreeing',
    paragraphs: [
      'Claiming means you accept that your address will be recorded on a public, effectively permanent network, linked to this event and its timestamp, and that you cannot have it removed. If you do not accept that, do not claim — ask the organizer whether they can record your attendance another way.',
      'This notice describes what the software does. It is not legal advice, and it does not replace the organizer’s own privacy notice, which may say more about how they handle your information off the network.',
    ],
  },
];
