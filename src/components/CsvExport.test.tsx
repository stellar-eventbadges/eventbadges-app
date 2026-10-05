// @vitest-environment happy-dom
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { badgeFactory, renderOnly, renderWithA11y, textOf } from '../test/render';
import { csvFileName } from '../lib/badgeCsv';

import { CsvExport } from './CsvExport';

/**
 * Captures what the component hands to the browser: the Blob it built and the
 * anchor it clicked. `URL.createObjectURL` is spied rather than relied on, so
 * the assertions are about the app's own call, not happy-dom's blob support.
 */
function captureDownload() {
  const blobs: Blob[] = [];
  const anchors: HTMLAnchorElement[] = [];
  const blobUrl = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return 'blob:captured';
    });
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      anchors.push(this);
    });
  return {
    blobs,
    anchors,
    restore() {
      blobUrl.mockRestore();
      revokeUrl.mockRestore();
      click.mockRestore();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<CsvExport />', () => {
  it('renders nothing when the app has read no records', () => {
    const view = renderOnly(<CsvExport badges={[]} />);
    expect(view.container.textContent).toBe('');
  });

  it('says in plain words that the file is not a roster', () => {
    const badges = [badgeFactory(), badgeFactory({ issuedAt: 1_790_000_100n })];
    const view = renderOnly(<CsvExport badges={badges} />);
    const text = textOf(view.container);

    expect(text).toContain('2 badge records this page read just now');
    expect(text).toContain('not the event’s other attendees');
    expect(text).toContain('no way to list an event’s attendees');
    expect(text).toContain('Nothing is sent anywhere');
    expect(view.getByRole('button', { name: 'Download 2 badge records as CSV' })).not.toBeNull();
  });

  it('uses the singular for one record', () => {
    const view = renderOnly(<CsvExport badges={[badgeFactory()]} />);
    expect(view.getByRole('button', { name: 'Download 1 badge record as CSV' })).not.toBeNull();
  });

  it('writes nothing until the button is pressed', () => {
    const captured = captureDownload();
    renderOnly(<CsvExport badges={[badgeFactory()]} />);

    expect(captured.blobs).toHaveLength(0);
    expect(captured.anchors).toHaveLength(0);
    captured.restore();
  });

  it('downloads exactly the records it was given, under a deterministic name', async () => {
    const captured = captureDownload();
    const badge = badgeFactory({ eventId: 7n, issuedAt: 1_790_000_000n });
    const view = renderOnly(<CsvExport badges={[badge]} />);

    fireEvent.click(view.getByRole('button'));

    expect(captured.blobs).toHaveLength(1);
    expect(captured.blobs[0].type).toBe('text/csv;charset=utf-8');
    const csv = await captured.blobs[0].text();
    expect(csv.split('\r\n')[0]).toBe('event_id,attendee,organizer,issued_at_unix,issued_at_utc');
    expect(csv).toContain(`${badge.attendee}`);
    expect(csv).toContain('2026-09-21T14:13:20.000Z');

    expect(captured.anchors).toHaveLength(1);
    expect(captured.anchors[0].download).toBe(csvFileName(7n));
    expect(captured.anchors[0].download).toMatch(/^eventbadges-7-\d{4}-\d{2}-\d{2}\.csv$/);
    captured.restore();
  });

  it('passes the accessibility check', async () => {
    await renderWithA11y(<CsvExport badges={[badgeFactory()]} />);
  });
});
