import { badgeMark } from '../lib/badgeArt';
import type { BadgeRecord } from '../lib/badge';

const CENTER = 50;

function point(angleDegrees: number, radius: number): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.round((CENTER + Math.cos(radians) * radius) * 100) / 100,
    y: Math.round((CENTER + Math.sin(radians) * radius) * 100) / 100,
  };
}

/**
 * The badge's mark: a deterministic drawing of the badge's own bytes, with no
 * text, no font, no image file and no network request behind it.
 *
 * It is `aria-hidden`: the artwork is decoration, and every fact it stands for
 * is in the list beside it. A screen reader gets the record, not the drawing.
 */
export function BadgeArt({ badge }: { badge: BadgeRecord }) {
  const mark = badgeMark(badge);
  const ticks = Array.from({ length: mark.ticks }, (_, index) => {
    const angle = mark.tickOffset + (360 / mark.ticks) * index;
    return { start: point(angle, 26), end: point(angle, 30), key: `${angle}-${index}` };
  });

  return (
    <div className="badge-art" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <circle cx={CENTER} cy={CENTER} r="48" className="badge-art-face" />
        {mark.rings.map((ring) => (
          <circle
            key={ring.radius}
            cx={CENTER}
            cy={CENTER}
            r={ring.radius}
            className="badge-art-ring"
            strokeDasharray={`${ring.dash} ${ring.dash}`}
            strokeDashoffset={ring.offset}
          />
        ))}
        {mark.spokes.map((spoke) => {
          const inner = point(spoke.angle, spoke.inner);
          const outer = point(spoke.angle, spoke.outer);
          return (
            <line
              key={spoke.angle}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              strokeWidth={spoke.width}
              className="badge-art-spoke"
            />
          );
        })}
        {ticks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.start.x}
            y1={tick.start.y}
            x2={tick.end.x}
            y2={tick.end.y}
            className="badge-art-tick"
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r="5" className="badge-art-core" />
      </svg>
    </div>
  );
}
