const DURATIONS = {
  work: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

let mode = "work";
let secondsLeft = DURATIONS[mode];
let timerId = null;
let pomodoroCount = 0;

const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const countEl = document.getElementById("count");
const modeButtons = document.querySelectorAll(".mode-btn");

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateDisplay() {
  timerEl.textContent = formatTime(secondsLeft);
}

function tick() {
  if (secondsLeft <= 0) {
    clearInterval(timerId);
    timerId = null;
    if (mode === "work") {
      pomodoroCount++;
      countEl.textContent = pomodoroCount;
    }
    return;
  }
  secondsLeft--;
  updateDisplay();
}

function start() {
  if (timerId) return;
  timerId = setInterval(tick, 1000);
}

function pause() {
  clearInterval(timerId);
  timerId = null;
}

function reset() {
  pause();
  secondsLeft = DURATIONS[mode];
  updateDisplay();
}

function setMode(newMode) {
  mode = newMode;
  secondsLeft = DURATIONS[mode];
  pause();
  updateDisplay();

  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

startBtn.addEventListener("click", start);
pauseBtn.addEventListener("click", pause);
resetBtn.addEventListener("click", reset);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

updateDisplay();
