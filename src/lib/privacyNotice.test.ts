import { describe, expect, it } from 'vitest';

import {
  CLAIM_CODE_WARNING,
  FULL_NOTICE_SECTIONS,
  NOTICE_ACK_LABEL,
  NOTICE_GATE_HINT,
  NOTICE_INTRO,
  NOTICE_POINTS,
  NOTICE_TITLE,
  NOTICE_TOGGLE_LABEL,
  NOTICE_TOGGLE_LABEL_COLLAPSED,
} from './privacyNotice';

const fullNoticeText = FULL_NOTICE_SECTIONS.flatMap((section) => section.paragraphs).join('\n');

describe('the privacy notice copy', () => {
  it('carries the claim-code warning in the short version', () => {
    expect(NOTICE_POINTS).toContain(CLAIM_CODE_WARNING);
  });

  it('carries the claim-code warning in the full version', () => {
    expect(fullNoticeText).toContain(CLAIM_CODE_WARNING);
  });

  // The sentence exists because the claim transaction carries the code's
  // SHA-256, and because `get_event` hands that digest to anyone who asks. If a
  // contract change moves either half — the raw code starts being transmitted
  // again, or the digest stops being public — the notice must change too, and
  // this failure is the signal that it did not.
  it('states that the code is hashed on the device and the digest is public', () => {
    expect(CLAIM_CODE_WARNING).toContain('never sent');
    expect(CLAIM_CODE_WARNING).toContain('your browser hashes it');
    expect(CLAIM_CODE_WARNING).toContain('public on the event itself');
  });

  it('has no empty strings anywhere in the short version', () => {
    for (const value of [NOTICE_TITLE, NOTICE_INTRO, NOTICE_ACK_LABEL, ...NOTICE_POINTS]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('has no empty strings anywhere in the full version', () => {
    for (const section of FULL_NOTICE_SECTIONS) {
      expect(section.heading.trim()).not.toBe('');
      expect(section.paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of section.paragraphs) {
        expect(paragraph.trim()).not.toBe('');
      }
    }
  });

  it('uses each section heading once, so a copy-paste cannot silently double one', () => {
    const headings = FULL_NOTICE_SECTIONS.map((section) => section.heading);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it('says the short notice is the one that gates the button', () => {
    expect(NOTICE_GATE_HINT).toContain('tick the box');
    expect(NOTICE_TOGGLE_LABEL).not.toBe(NOTICE_TOGGLE_LABEL_COLLAPSED);
  });

  it('disclaims legal advice in the full version', () => {
    expect(fullNoticeText).toContain('not legal advice');
  });

  it('offers the fresh-wallet mitigation, which is the only one an attendee has', () => {
    expect(fullNoticeText).toContain('fresh, empty wallet');
  });
});
