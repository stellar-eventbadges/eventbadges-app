// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { badgeFactory, renderOnly, renderWithA11y, textOf } from '../test/render';

import { BadgeCard } from './BadgeCard';

describe('<BadgeCard />', () => {
  it('names the event and shows who issued the badge and when', () => {
    const badge = badgeFactory({ eventId: 3n });
    const view = renderOnly(<BadgeCard badge={badge} />);
    const text = textOf(view.container);
    expect(text).toContain('Badge for event #3');
    expect(text).toContain('Issued by');
    expect(text).toContain('Issued at');
  });

  it('says the badge cannot be moved', () => {
    const view = renderOnly(<BadgeCard badge={badgeFactory()} />);
    expect(textOf(view.container)).toContain('cannot be sold, given away or moved');
  });

  it('keeps both addresses in the accessible text', () => {
    const badge = badgeFactory();
    const text = textOf(renderOnly(<BadgeCard badge={badge} />).container);
    expect(text).toContain(badge.attendee);
    expect(text).toContain(badge.organizer);
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<BadgeCard badge={badgeFactory({ eventId: 1n })} />);
  });

  it('draws the same artwork twice for the same badge', () => {
    const badge = badgeFactory({ eventId: 7n });
    const first = renderOnly(<BadgeCard badge={badge} />).container.querySelector('svg')?.outerHTML;
    const second = renderOnly(<BadgeCard badge={badge} />).container.querySelector('svg')?.outerHTML;

    expect(first).toBeDefined();
    expect(first).toBe(second);
  });

  it('draws different artwork for a badge with different bytes', () => {
    const one = renderOnly(<BadgeCard badge={badgeFactory({ eventId: 7n })} />);
    const two = renderOnly(<BadgeCard badge={badgeFactory({ eventId: 8n })} />);

    expect(one.container.querySelector('svg')?.outerHTML).not.toBe(
      two.container.querySelector('svg')?.outerHTML,
    );
  });

  it('draws the mark locally, with nothing to fetch', () => {
    const markup = renderOnly(<BadgeCard badge={badgeFactory()} />).container.innerHTML;

    expect(markup).not.toContain('http');
    expect(markup).not.toContain('href');
    expect(markup).not.toContain('<image');
  });

  it('hides the artwork from assistive technology', () => {
    const view = renderOnly(<BadgeCard badge={badgeFactory()} />);
    const art = view.container.querySelector('.badge-art');

    expect(art?.getAttribute('aria-hidden')).toBe('true');
  });
});
