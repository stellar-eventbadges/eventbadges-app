import { useState } from 'react';

import {
  FULL_NOTICE_SECTIONS,
  NOTICE_ACK_LABEL,
  NOTICE_INTRO,
  NOTICE_POINTS,
  NOTICE_TITLE,
  NOTICE_TOGGLE_LABEL,
  NOTICE_TOGGLE_LABEL_COLLAPSED,
} from '../lib/privacyNotice';

export interface PrivacyNoticeProps {
  readonly acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}

/**
 * The notice an attendee reads before their wallet signs, plus the
 * acknowledgement that gates the claim button.
 *
 * Two lengths on purpose: the short one is always visible above the button,
 * and the full one is one tap away. The full text replaces nothing — it opens
 * in place, so the form keeps its state and the claim button stays where it
 * was.
 *
 * The toggle uses `aria-expanded` without `aria-controls`, because the region
 * it would point at does not exist while collapsed and a dangling reference is
 * worse than no reference.
 *
 * The wording lives in `lib/privacyNotice.ts` with the rest of the notice copy.
 */
export function PrivacyNotice({ acknowledged, onAcknowledge }: PrivacyNoticeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="notice notice-privacy" aria-labelledby="privacy-notice-heading">
      <h2 className="notice-title" id="privacy-notice-heading">
        {NOTICE_TITLE}
      </h2>
      <p>{NOTICE_INTRO}</p>
      <ul>
        {NOTICE_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <button
        type="button"
        className="secondary"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? NOTICE_TOGGLE_LABEL_COLLAPSED : NOTICE_TOGGLE_LABEL}
      </button>

      {expanded && (
        <div className="notice-full">
          {FULL_NOTICE_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      )}

      <div className="ack">
        <input
          type="checkbox"
          id="privacy-ack"
          checked={acknowledged}
          onChange={(event) => onAcknowledge(event.target.checked)}
        />
        <label htmlFor="privacy-ack">{NOTICE_ACK_LABEL}</label>
      </div>
    </section>
  );
}
