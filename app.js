let workouts = JSON.parse(localStorage.getItem("workouts")) || [];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let chart;

// ⏱️ TIMER
let timer = null;
let timeLeft = 0;

// https://actions.google.com/sounds/v1/alarms/beep_short.ogg
const finalBeep = new Audio("./final_beep.mp3");
const beepAudio = new Audio("./alarm.mp3");
beepAudio.volume = 1.0;
finalBeep.volume = 1.0;

// 🔥 NORMALIZAR
workouts = workouts.map(w => ({
  exercise: w.exercise || "",
  muscle: w.muscle || "Pecho",
  day: w.day || "Lunes",
  date: w.date || new Date().toISOString(),
  sets: Array.isArray(w.sets) ? w.sets : [{ reps: "", weight: "" }]
}));

// 🧠 DB
const exerciseDB = {
  Pecho: ["Press banca","Press inclinado","Press declinado","Aperturas","Aperturas polea","Fondos","Pullover","Press mancuernas","Cruce poleas","Flexiones"],
  Espalda: ["Dominadas","Jalón","Remo barra","Remo mancuerna","Remo máquina","Peso muerto","Pull-over","Face pull","Remo polea","Dominadas asistidas"],
  Hombro: ["Press militar","Laterales","Frontales","Pájaros","Arnold","Encogimientos","Face pull","Polea","Máquina","Posteriores"],
  Bíceps: ["Curl bíceps","Martillo","Inclinado","Barra","Polea","Concentrado","Spider","Inverso","Alterno","Máquina"],
  Tríceps: ["Extensión","Fondos","Press cerrado","Patada","Polea","Rompecráneos","Cuerda","Banco","Francés","Unilateral"],
  Pierna: ["Sentadilla","Prensa","Peso muerto","Zancadas","Extensiones","Femoral","Hip thrust","Gemelos","Gemelos sentado","Búlgara"]
};

// 🧠 RUTINAS
const routines = {
  pecho_triceps: ["Pecho","Tríceps"],
  espalda_biceps_hombro: ["Espalda","Bíceps","Hombro"],
  hombro: ["Hombro"],
  pierna: ["Pierna"]
};

// ⏱️ TIMER FUNCIONES
function updateTimerDisplay() {
  const el = document.getElementById("timerDisplay");
  if (!el) return;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  el.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function startTimer() {
  clearInterval(timer);

  const input = document.getElementById("restTime");
  timeLeft = parseInt(input.value);

  if (isNaN(timeLeft) || timeLeft < 5 || timeLeft > 600) {
    alert("Pon entre 5 y 600 segundos");
    return;
  }

  updateTimerDisplay();

  // desbloquear audio móvil
  finalBeep.play().then(() => {
    finalBeep.pause();
    finalBeep.currentTime = 0;
  }).catch(()=>{});

  beepAudio.play().then(() => {
    beepAudio.pause();
    beepAudio.currentTime = 0;
  }).catch(()=>{});

  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 3) {
      finalBeep.currentTime = 0;
      finalBeep.play();
    }

    if (timeLeft <= 0) {
      clearInterval(timer);

      beepAudio.currentTime = 0;
      beepAudio.play();

      if (navigator.vibrate) navigator.vibrate(300);

      setTimeout(() => alert("Fin del descanso 💪"), 100);
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timer);
  timeLeft = 0;
  updateTimerDisplay();
}

function setRestTime(val) {
  if (!val) return;
  document.getElementById("restTime").value = val;
}

// 🔥 resto de tu código (NO TOCADO excepto INIT)

function updateMuscleFilter(routineKey = null) {
  const select = document.getElementById("muscle");

  let muscles = routineKey && routines[routineKey]
    ? routines[routineKey]
    : Object.keys(exerciseDB);

  // 🔥 reconstruye opciones
  select.innerHTML = muscles
    .map(m => `<option value="${m}">${m}</option>`)
    .join("");

  // 🔥 selecciona el primero automáticamente
  if (muscles.length > 0) {
    select.value = muscles[0];
  }

  updateExerciseSuggestions();
}

function loadRoutine() {
  const val = document.getElementById("routineSelect")?.value;
  updateMuscleFilter(val || null);
}

function updateExerciseSuggestions() {
  const muscle = document.getElementById("muscle").value;
  const auto = document.getElementById("exerciseAuto");

  auto.innerHTML = '<option value="">Sugerencias</option>';

  const history = workouts
    .filter(w => w.muscle === muscle)
    .map(w => w.exercise);

  const list = [...new Set([...history, ...(exerciseDB[muscle] || [])])];

  list.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex;
    opt.textContent = ex;
    auto.appendChild(opt);
  });
}

function selectAutoExercise() {
  const val = document.getElementById("exerciseAuto").value;
  if (val) document.getElementById("exercise").value = val;
}

function addWorkout() {
  let exercise = document.getElementById("exercise").value.trim();
  if (!exercise) exercise = document.getElementById("exerciseAuto").value;

  const reps = Number(document.getElementById("reps").value);
  const weight = Number(document.getElementById("weight").value);
  const series = parseInt(document.getElementById("series").value) || 1;

  if (!exercise) return alert("Introduce ejercicio");
  if (reps < 0 || weight < 0) return alert("Valores inválidos");

  const day = document.getElementById("day").value;
  const muscle = document.getElementById("muscle").value;

  const sets = Array.from({ length: series }, () => ({
    reps: reps || "",
    weight: weight || ""
  }));

  workouts.push({ exercise, muscle, day, date: new Date().toISOString(), sets });

  saveAndRender();
}

function addSet(i) {
  workouts[i].sets.push({ reps: "", weight: "" });
  saveAndRender();
}

function deleteSet(wi, si) {
  workouts[wi].sets.splice(si, 1);
  saveAndRender();
}

function updateSet(wi, si, field, value) {
  workouts[wi].sets[si][field] = value;
  localStorage.setItem("workouts", JSON.stringify(workouts));
  renderChart();
}

function render() {
  const list = document.getElementById("list");
  const day = document.getElementById("day").value;

  list.innerHTML = "";

  workouts
    .map((w, i) => ({ ...w, i }))
    .filter(w => w.day === day)
    .forEach(w => {
      const li = document.createElement("li");

      li.innerHTML = `
        <strong>${w.exercise} (${w.muscle})</strong>

        ${w.sets.map((s,j)=>`
          <div>
            <input type="number" value="${s.reps}"
              onchange="updateSet(${w.i},${j},'reps',this.value)">
            <input type="number" value="${s.weight}"
              onchange="updateSet(${w.i},${j},'weight',this.value)">
            <button onclick="deleteSet(${w.i},${j})">❌</button>
          </div>
        `).join("")}

        <button onclick="addSet(${w.i})">➕ Serie</button>
      `;

      list.appendChild(li);
    });

  fillExerciseFilter();
  renderStats();
  renderChart();
}

function fillExerciseFilter() {
  const select = document.getElementById("exerciseFilter");
  if (!select) return;

  const exs = [...new Set(workouts.map(w => w.exercise))];
  select.innerHTML = exs.map(e => `<option value="${e}">${e}</option>`).join("");
}

function renderStats() {
  const selected = document.getElementById("exerciseFilter")?.value;
  if (!selected) return;

  const sets = workouts.filter(w => w.exercise === selected).flatMap(w => w.sets);
  const weights = sets.map(s => Number(s.weight)).filter(w => w > 0);

  const avg = weights.length
    ? (weights.reduce((a,b)=>a+b,0) / weights.length).toFixed(1)
    : "-";

  document.getElementById("avgWeight").innerText = avg;
  document.getElementById("totalWorkouts").innerText = sets.length;
}

function renderChart() {
  const canvas = document.getElementById("chart");
  const selected = document.getElementById("exerciseFilter")?.value;

  if (!canvas || !selected) return;

  const data = workouts
    .filter(w => w.exercise === selected)
    .flatMap(w => w.sets.map(s => ({
      date: w.date,
      weight: Number(s.weight) || 0
    })));

  if (chart) chart.destroy();

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [{
        label: selected,
        data: data.map(d => d.weight),
        borderColor: "#22c55e"
      }]
    }
  });
}

function saveAndRender() {
  localStorage.setItem("workouts", JSON.stringify(workouts));
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  updateMuscleFilter();
  updateTimerDisplay();
  render();

  document.getElementById("muscle")
    ?.addEventListener("change", updateExerciseSuggestions);

  // 🔥 ESTO TE FALTABA
  document.getElementById("routineSelect")
    ?.addEventListener("change", loadRoutine);
});

function exportData() {
  try {
    const dataStr = JSON.stringify({ workouts, favorites }, null, 2);

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ironGraph_backup.json";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 500);

  } catch (err) {
    alert("Error al exportar datos");
    console.error(err);
  }
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);

      workouts = data.workouts || [];
      favorites = data.favorites || [];

      saveAndRender();
      alert("Importado correctamente");

    } catch {
      alert("Archivo inválido");
    }
  };

  reader.readAsText(file);
}

document.getElementById("exerciseFilter").addEventListener("change", (event) => {
  renderStats();
  renderChart();
});

document.getElementById("day").addEventListener("change", (event) => {
  render();
});