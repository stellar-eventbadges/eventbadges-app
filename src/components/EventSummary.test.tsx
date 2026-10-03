// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { eventFactory, renderOnly, renderWithA11y, textOf } from '../test/render';

import { windowSentence, windowState } from '../lib/badge';

import { EventSummary } from './EventSummary';

const OPEN = eventFactory(); // deadline in 2100, nothing claimed
const FULL = eventFactory({ claimCount: 100, maxClaims: 100 });
const CLOSED = eventFactory({ closesAt: 1_000n });
const NOW = 1_790_000_000;

describe('windowState / windowSentence', () => {
  it('derives the state from the clock and the cap', () => {
    expect(windowState(OPEN, NOW)).toBe('Open');
    expect(windowState(FULL, NOW)).toBe('Full');
    expect(windowState(CLOSED, NOW)).toBe('Closed');
  });

  it('gives every state a sentence', () => {
    for (const state of ['Open', 'Full', 'Closed'] as const) {
      expect(windowSentence(state).length).toBeGreaterThan(10);
    }
  });
});

describe('<EventSummary />', () => {
  it('shows the issued count, slots left and the deadline', () => {
    const view = renderOnly(<EventSummary event={OPEN} nowSeconds={NOW} />);
    const text = textOf(view.container);
    expect(text).toContain('Event #1');
    expect(text).toContain('Badges issued');
    expect(text).toContain('0 of 100 (100 left)');
    expect(text).toContain('Claim deadline');
  });

  it('labels the window state so screen readers get the sentence too', () => {
    const view = renderOnly(<EventSummary event={CLOSED} nowSeconds={NOW} />);
    const text = textOf(view.container);
    expect(text).toContain('Closed');
    expect(text).toContain('The claim deadline has passed.');
  });

  it('shows the name hash, not a readable name, and says so', () => {
    const view = renderOnly(<EventSummary event={OPEN} nowSeconds={NOW} />);
    const text = textOf(view.container);
    expect(text).toContain('0x11111111'); // shortened name hash
    expect(text).toContain('stores hashes');
  });

  it('keeps the full organizer address in the accessible text', () => {
    const view = renderOnly(<EventSummary event={OPEN} nowSeconds={NOW} />);
    expect(textOf(view.container)).toContain(OPEN.organizer);
  });

  it('passes the accessibility check in all three states', async () => {
    await renderWithA11y(<EventSummary event={OPEN} nowSeconds={NOW} />);
    await renderWithA11y(<EventSummary event={FULL} nowSeconds={NOW} />);
    await renderWithA11y(<EventSummary event={CLOSED} nowSeconds={NOW} />);
  });
});
