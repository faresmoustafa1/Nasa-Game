// Mission ARES — pause while the in-game menu (⚙) is open. Story clocks (useTimeline) stop counting,
// and CSS animations freeze (the body gets the class `ares-paused`).

let paused = false;

export function isPaused() {
  return paused;
}

export function setPaused(on: boolean) {
  paused = on;
  document.body.classList.toggle("ares-paused", on);
}
