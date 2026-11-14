// Mission ARES — the last shot: back in the grass under the stars, wearing the crown, holding a little red rock.
// It never says whether it was a dream. About 7 seconds, then the score screen.

import { Boy, StarField } from "../game/art";
import { NoteLayer } from "../game/notes";
import type { SceneNote } from "../game/notes";
import { useTimeline } from "../game/useTimeline";
import type { Badge } from "./score";
import "../game/game.css";
import "./finalshot.css";

const END_AT = 8;

export default function FinalShot({ badge, onDone }: { badge: Badge; onDone: () => void }) {
  const { t } = useTimeline({ endAt: END_AT, onEnd: onDone });
  const notes: SceneNote[] = [
    { from: 1.2, to: 4.6, kind: "story", text: "He is back in the grass, under the same stars...", box: { x: 460, y: 70, w: 680 } },
    { from: 4.6, to: END_AT, kind: "story", text: "...with a crown on his head, and a little red rock from Mars in his hand.", box: { x: 400, y: 70, w: 800 } },
  ];

  return (
    <div className="ares final">
      <div className="ares__stage">
        <svg className="ares__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The boy in the grass at night, wearing the crown and holding a red rock from Mars">
          <defs>
            <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#070a24" />
              <stop offset="1" stopColor="#1d2a5a" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#fs-sky)" />
          <StarField count={150} seed={5} maxY={600} />
          <circle className="final__mars" cx="1380" cy="340" r="26" fill="#d9663a" />
          <path d="M0 640 Q300 560 640 620 Q1000 690 1300 610 Q1500 570 1600 600 V900 H0 Z" fill="#12301f" />
          <path d="M0 740 Q400 690 800 730 Q1200 770 1600 720 V900 H0 Z" fill="#0b2216" />
          <g transform="translate(800 790) scale(1.5)">
            <Boy mood="smile" look={0} className="is-bob" />
            <g transform="translate(0 -194) scale(0.55)">
              <path d="M-44 0 L-52 -52 L-26 -26 L0 -66 L26 -26 L52 -52 L44 0 Z" fill={badge.color} stroke={badge.rim} strokeWidth="5" strokeLinejoin="round" />
              <rect x="-46" y="-9" width="92" height="12" rx="4" fill={badge.rim} />
            </g>
            <ellipse className="final__rock" cx="32.5" cy="-90" rx="11" ry="8" fill="#b5482a" stroke="#7a2c16" strokeWidth="2" />
          </g>
        </svg>
        <NoteLayer notes={notes} t={t} />
        <button type="button" className="ares__skip" onClick={onDone}>
          Skip ▸
        </button>
      </div>
    </div>
  );
}
