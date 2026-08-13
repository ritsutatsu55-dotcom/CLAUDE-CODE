const STORAGE_KEY = "simple-alarm-clock.alarms";

const currentTimeEl = document.getElementById("current-time");
const currentDateEl = document.getElementById("current-date");
const timeInput = document.getElementById("alarm-time-input");
const labelInput = document.getElementById("alarm-label-input");
const addBtn = document.getElementById("add-alarm-btn");
const listEl = document.getElementById("alarm-list");
const emptyMessageEl = document.getElementById("empty-message");
const ringingOverlay = document.getElementById("ringing-overlay");
const ringingTimeEl = document.getElementById("ringing-time");
const ringingLabelEl = document.getElementById("ringing-label");
const stopAlarmBtn = document.getElementById("stop-alarm-btn");

let alarms = loadAlarms();
let ringingAlarmId = null;
let audioCtx = null;
let beepIntervalId = null;
let lastCheckedMinute = null;

function loadAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderClock() {
  const now = new Date();
  currentTimeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  currentDateEl.textContent = now.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function renderAlarms() {
  listEl.innerHTML = "";
  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));

  emptyMessageEl.style.display = sorted.length === 0 ? "block" : "none";

  for (const alarm of sorted) {
    const li = document.createElement("li");
    li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

    const timeEl = document.createElement("div");
    timeEl.className = "alarm-time";
    timeEl.textContent = alarm.time;

    const infoEl = document.createElement("div");
    infoEl.className = "alarm-info";
    const labelEl = document.createElement("div");
    labelEl.className = "alarm-label";
    labelEl.textContent = alarm.label || "";
    infoEl.appendChild(labelEl);

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alarm.enabled;
    checkbox.addEventListener("change", () => {
      alarm.enabled = checkbox.checked;
      saveAlarms();
      renderAlarms();
    });
    const track = document.createElement("span");
    track.className = "switch-track";
    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(track);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => {
      alarms = alarms.filter((a) => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    li.appendChild(timeEl);
    li.appendChild(infoEl);
    li.appendChild(switchLabel);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  }
}

function addAlarm() {
  const time = timeInput.value;
  if (!time) return;

  alarms.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time,
    label: labelInput.value.trim(),
    enabled: true,
  });

  saveAlarms();
  renderAlarms();
  timeInput.value = "";
  labelInput.value = "";
}

function checkAlarms() {
  const now = new Date();
  const currentMinuteKey = `${now.getHours()}:${now.getMinutes()}`;
  if (currentMinuteKey === lastCheckedMinute) return;
  lastCheckedMinute = currentMinuteKey;

  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const match = alarms.find((a) => a.enabled && a.time === hhmm);
  if (match) {
    ringAlarm(match);
  }
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep() {
  const ctx = ensureAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.4);
}

function ringAlarm(alarm) {
  ringingAlarmId = alarm.id;
  ringingTimeEl.textContent = alarm.time;
  ringingLabelEl.textContent = alarm.label || "";
  ringingOverlay.classList.remove("hidden");

  playBeep();
  beepIntervalId = setInterval(playBeep, 700);
}

function stopAlarm() {
  ringingOverlay.classList.add("hidden");
  ringingAlarmId = null;
  if (beepIntervalId) {
    clearInterval(beepIntervalId);
    beepIntervalId = null;
  }
}

addBtn.addEventListener("click", addAlarm);
timeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAlarm();
});
labelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addAlarm();
});
stopAlarmBtn.addEventListener("click", stopAlarm);

renderClock();
renderAlarms();
setInterval(renderClock, 1000);
setInterval(checkAlarms, 1000);
