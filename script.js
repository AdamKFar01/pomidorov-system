const DEFAULTS = { work: 25, short: 5, long: 15 };
const LABELS = { work: "Focus", short: "Short break", long: "Long break" };
const STORE_KEY = "pomidorov.lengths";
const LIMITS = { min: 1, max: 180 };

let lengths = { ...DEFAULTS };
let mode = "work";
let secondsLeft = lengths.work * 60;
let ticker = null;
let finished = 0;

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
  el.toggle.textContent = isRunning() ? "Pause" : "Start";
  el.count.textContent = String(finished);

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

/* Timer */

function start() {
  if (isRunning() || secondsLeft === 0) return;
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
    if (mode === "work") finished += 1;
  }
  render();
}

function reset() {
  pause();
  secondsLeft = lengths[mode] * 60;
  render();
}

function selectMode(next) {
  mode = next;
  el.modes.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.mode === next));
  });
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
