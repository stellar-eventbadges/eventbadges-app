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
});
