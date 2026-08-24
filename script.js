const DEFAULTS = { work: 25, short: 5, long: 15 };
const LABELS = { work: "Focus", short: "Short break", long: "Long break" };
const STORE_KEY = "pomidorov.lengths";
const LIMITS = { min: 1, max: 180 };

/* The technique runs in sets: four focus sessions, a short break after each
   of the first three, then a long break that closes the set. */
const SET_LENGTH = 4;

let lengths = { ...DEFAULTS };
let mode = "work";
let secondsLeft = lengths.work * 60;
let ticker = null;
let finished = 0;
let inSet = 0;
let pending = null;

const el = {
  timer: document.getElementById("timer"),
  sessionName: document.getElementById("sessionName"),
  sessionState: document.getElementById("sessionState"),
  dot: document.querySelector(".dot"),
  toggle: document.getElementById("toggleBtn"),
  reset: document.getElementById("resetBtn"),
  count: document.getElementById("count"),
  modes: document.querySelectorAll(".segmented button"),
  settings: document.getElementById("settings"),
  settingsToggle: document.getElementById("settingsToggle"),
  form: document.getElementById("settingsForm"),
  restore: document.getElementById("restoreBtn"),
  saved: document.getElementById("savedNote"),
  set: document.getElementById("setProgress"),
  segmented: document.getElementById("segmented"),
};

const inputs = {
  work: document.getElementById("workLen"),
  short: document.getElementById("shortLen"),
  long: document.getElementById("longLen"),
};

const errors = {
  work: document.getElementById("workLenError"),
  short: document.getElementById("shortLenError"),
  long: document.getElementById("longLenError"),
};

const isRunning = () => ticker !== null;

/* Rendering */

function render() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  el.timer.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const done = secondsLeft === 0;
  el.timer.dataset.finished = String(done);
  el.sessionName.textContent = LABELS[mode];
  el.count.textContent = String(finished);
  renderSet();

  /* One primary control, three jobs: pause, resume, or move onto what the
     technique says comes next. */
  if (isRunning()) {
    el.toggle.textContent = "Pause";
  } else if (pending) {
    el.toggle.textContent = `Start ${LABELS[pending].toLowerCase()}`;
  } else {
    el.toggle.textContent = "Start";
  }

  if (done) {
    el.sessionState.textContent = "Finished";
    el.dot.dataset.state = "done";
  } else if (isRunning()) {
    el.sessionState.textContent = "Running";
    el.dot.dataset.state = "running";
  } else if (secondsLeft === lengths[mode] * 60) {
    el.sessionState.textContent = "Ready";
    el.dot.dataset.state = "idle";
  } else {
    el.sessionState.textContent = "Paused";
    el.dot.dataset.state = "idle";
  }
}

/* How far through the set of four you are. Without this the long break
   arrives as a surprise, and the tally only ever counts upward. */
function renderSet() {
  if (!el.set) return;

  const marks = el.set.querySelectorAll("[data-step]");
  marks.forEach((mark, index) => {
    mark.dataset.done = String(index < inSet);
  });

  el.set.setAttribute(
    "aria-label",
    `Focus session ${Math.min(inSet + 1, SET_LENGTH)} of ${SET_LENGTH}`
  );
}

/* Timer */

function start() {
  if (isRunning()) return;
  /* Pressing start on a finished session moves onto the queued one. */
  if (secondsLeft === 0) advance();
  if (secondsLeft === 0) return;
  ticker = setInterval(tick, 1000);
  render();
}

function pause() {
  clearInterval(ticker);
  ticker = null;
  render();
}

function tick() {
  secondsLeft -= 1;
  if (secondsLeft <= 0) {
    secondsLeft = 0;
    clearInterval(ticker);
    ticker = null;
    complete();
  }
  render();
}

/* Called once, when a session reaches zero. The finished session stays on
   screen and the next one is queued, so the completed state is actually
   visible instead of being skipped past. */
function complete() {
  const wasWork = mode === "work";

  if (wasWork) {
    finished += 1;
    inSet += 1;
  }

  pending = wasWork ? (inSet >= SET_LENGTH ? "long" : "short") : "work";

  announce(LABELS[mode], LABELS[pending]);
}

/* A focus timer you have to watch is not doing its job, so the end of a
   session has to reach you when the window is behind something else. */
function announce(justFinished, next) {
  chime();

  if (typeof Notification === "undefined") return;

  const show = () => {
    try {
      new Notification(`${justFinished} finished`, {
        body: `${next} is up next.`,
        silent: true, // the chime already played
      });
    } catch {
      // Notifications are a courtesy; never let one break the timer.
    }
  };

  if (Notification.permission === "granted") {
    show();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((result) => {
      if (result === "granted") show();
    });
  }
}

/* Two short tones, synthesised rather than shipped as an audio file. */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    [0, 0.18].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = index === 0 ? 660 : 880;

      /* Ramped, not switched. A square-edged gain change clicks. */
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // No audio device, autoplay blocked, or context limit reached.
  }
}

/* Moves onto the queued session. Auto-starting a break for someone who
   walked away just burns the break, so this only runs on a deliberate press. */
function advance() {
  if (!pending) return;

  /* The long break closes the set, so the count restarts behind it. */
  if (pending === "long") inSet = 0;

  mode = pending;
  pending = null;
  secondsLeft = lengths[mode] * 60;
  syncModeButtons();
}

function reset() {
  pause();
  /* Reset re-runs the session you just finished rather than skipping ahead. */
  pending = null;
  secondsLeft = lengths[mode] * 60;
  render();
}

function syncModeButtons() {
  el.modes.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.mode === mode));
  });
  /* The thumb's position is driven off this, so it slides on its own. */
  if (el.segmented) el.segmented.dataset.selected = mode;
}

/* Manual switching overrides the set. Picking a long break yourself closes
   the set the same way finishing one does. */
function selectMode(next) {
  mode = next;
  pending = null;
  if (next === "long") inSet = 0;
  syncModeButtons();
  reset();
}

/* Settings */

function readStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of Object.keys(DEFAULTS)) {
      const value = Number(saved[key]);
      if (Number.isInteger(value) && value >= LIMITS.min && value <= LIMITS.max) {
        lengths[key] = value;
      }
    }
  } catch {
    // Corrupt or unavailable storage just falls back to the defaults.
  }
}

function fillInputs() {
  for (const key of Object.keys(inputs)) {
    inputs[key].value = String(lengths[key]);
  }
}

function showError(key, message) {
  errors[key].textContent = message;
  errors[key].hidden = false;
  inputs[key].setAttribute("aria-invalid", "true");
}

function clearError(key) {
  errors[key].hidden = true;
  inputs[key].removeAttribute("aria-invalid");
}

function validate() {
  let valid = true;
  const next = {};

  for (const key of Object.keys(inputs)) {
    const raw = inputs[key].value.trim();
    const value = Number(raw);

    if (raw === "") {
      showError(key, "Enter a number of minutes.");
      valid = false;
    } else if (!Number.isInteger(value)) {
      showError(key, "Use whole minutes only.");
      valid = false;
    } else if (value < LIMITS.min || value > LIMITS.max) {
      showError(key, `Use ${LIMITS.min} to ${LIMITS.max} minutes.`);
      valid = false;
    } else {
      clearError(key);
      next[key] = value;
    }
  }

  return valid ? next : null;
}

function save(event) {
  event.preventDefault();
  const next = validate();
  if (!next) return;

  lengths = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(lengths));
  } catch {
    // Saving is a convenience; the session still uses the new lengths.
  }

  if (!isRunning()) {
    secondsLeft = lengths[mode] * 60;
  }
  render();

  el.saved.hidden = false;
  setTimeout(() => { el.saved.hidden = true; }, 2000);
}

function restore() {
  lengths = { ...DEFAULTS };
  fillInputs();
  Object.keys(inputs).forEach(clearError);
  if (!isRunning()) {
    secondsLeft = lengths[mode] * 60;
  }
  render();
}

function toggleSettings() {
  const open = el.settings.hidden;
  el.settings.hidden = !open;
  el.settingsToggle.setAttribute("aria-expanded", String(open));
}

/* Wiring */

el.toggle.addEventListener("click", () => (isRunning() ? pause() : start()));
el.reset.addEventListener("click", reset);
el.modes.forEach((button) => {
  button.addEventListener("click", () => selectMode(button.dataset.mode));
});
el.settingsToggle.addEventListener("click", toggleSettings);
el.form.addEventListener("submit", save);
el.restore.addEventListener("click", restore);

/* Shortcuts get hit constantly, so their state changes land with no
   transition. The flag is read by CSS and cleared once the frame has
   painted, which keeps pointer interactions animated as normal. */
function withoutMotion(action) {
  document.body.dataset.input = "keyboard";
  action();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      delete document.body.dataset.input;
    });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.code === "Space") {
    event.preventDefault();
    withoutMotion(() => (isRunning() ? pause() : start()));
  }
  if (event.key.toLowerCase() === "r") {
    withoutMotion(reset);
  }
});

readStored();
fillInputs();
secondsLeft = lengths[mode] * 60;
render();
