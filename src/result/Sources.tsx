// Mission ARES — the Data Sources screen: where every fact and number in the game comes from.

import { SOURCE_GROUPS } from "../game/sources";
import "./result.css";

export default function Sources({ onBack, backLabel = "◂ Back" }: { onBack: () => void; backLabel?: string }) {
  return (
    <div className="res">
      <div className="res__page">
        <header className="res__head res__head--small">
          <div>
            <h1>Data sources</h1>
            <p className="res__line">Real NASA data and facts are marked with where they come from. Game rules are marked too.</p>
          </div>
        </header>
        {SOURCE_GROUPS.map((g) => (
          <section key={g.id} className="res__src" aria-label={g.title}>
            <h2>{g.title}</h2>
            <p className="res__blurb">{g.blurb}</p>
            <ul>
              {g.items.map((it, i) => (
                <li key={i}>
                  <b>{it.scene}</b>
                  <span>{it.what}</span>
                  <small>Source: {it.source}</small>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="res__buttons">
          <button type="button" className="res__btn res__btn--main" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
