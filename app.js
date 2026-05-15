const storage = {
  subjects: 'grind-subjects',
  sessions: 'grind-sessions',
  goals: 'grind-goals',
  pomodoro: 'grind-pomodoro',
};

const elements = {
  subjectForm: document.getElementById('subject-form'),
  subjectName: document.getElementById('subject-name'),
  subjectList: document.getElementById('subject-list'),
  sessionSubject: document.getElementById('session-subject'),
  startSession: document.getElementById('start-session'),
  endSession: document.getElementById('end-session'),
  activeStatus: document.getElementById('active-session-status'),
  activeTime: document.getElementById('active-session-time'),
  goalForm: document.getElementById('goal-form'),
  goalTitle: document.getElementById('goal-title'),
  goalHours: document.getElementById('goal-hours'),
  goalList: document.getElementById('goal-list'),
  pomodoroLabel: document.getElementById('pomodoro-label'),
  pomodoroTime: document.getElementById('pomodoro-time'),
  pomodoroStart: document.getElementById('pomodoro-start'),
  pomodoroReset: document.getElementById('pomodoro-reset'),
  subjectChart: document.getElementById('subject-chart'),
  kpiTotalHours: document.getElementById('kpi-total-hours'),
  kpiBestSubject: document.getElementById('kpi-best-subject'),
  kpiStreak: document.getElementById('kpi-streak'),
  analyticsTotal: document.getElementById('analytics-total'),
  analyticsBest: document.getElementById('analytics-best'),
  analyticsStreak: document.getElementById('analytics-streak'),
};

let subjects = [];
let sessions = [];
let goals = [];
let activeSession = null;
let pomodoro = { mode: 'work', remaining: 1500, running: false, timerId: null };

function loadState() {
  subjects = JSON.parse(localStorage.getItem(storage.subjects) || '[]');
  sessions = JSON.parse(localStorage.getItem(storage.sessions) || '[]');
  goals = JSON.parse(localStorage.getItem(storage.goals) || '[]');
  const savedPomodoro = JSON.parse(localStorage.getItem(storage.pomodoro) || 'null');
  if (savedPomodoro) pomodoro = savedPomodoro;
}

function saveState() {
  localStorage.setItem(storage.subjects, JSON.stringify(subjects));
  localStorage.setItem(storage.sessions, JSON.stringify(sessions));
  localStorage.setItem(storage.goals, JSON.stringify(goals));
  localStorage.setItem(storage.pomodoro, JSON.stringify(pomodoro));
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatMinutes(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function calculateStreak() {
  if (!sessions.length) return 0;
  const days = [...new Set(sessions.map((session) => session.start.slice(0, 10)))].sort();
  let streak = 0;
  const today = getTodayDate();
  let currentDate = new Date(today);

  while (true) {
    const dateKey = currentDate.toISOString().slice(0, 10);
    if (days.includes(dateKey)) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getSubjectSummary() {
  return subjects.map((subject) => {
    const totalSeconds = sessions
      .filter((session) => session.subjectId === subject.id)
      .reduce((sum, session) => sum + session.duration, 0);
    return { ...subject, totalSeconds };
  });
}

function updateAnalytics() {
  const totalSeconds = sessions.reduce((sum, session) => sum + session.duration, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const summary = getSubjectSummary().filter((item) => item.totalSeconds > 0);
  const best = summary.sort((a, b) => b.totalSeconds - a.totalSeconds)[0];
  const streak = calculateStreak();

  elements.kpiTotalHours.textContent = `${totalHours}h`;
  elements.kpiBestSubject.textContent = best ? best.name : '—';
  elements.kpiStreak.textContent = streak;
  elements.analyticsTotal.textContent = totalSeconds ? `You have studied for ${totalHours} hours.` : 'Start your first study session to see your analytics.';
  elements.analyticsBest.textContent = best ? `${best.name} with ${(best.totalSeconds / 3600).toFixed(1)} hours.` : 'No sessions tracked yet.';
  elements.analyticsStreak.textContent = streak ? `${streak} day${streak > 1 ? 's' : ''} in a row.` : 'No streak yet.';

  renderSubjectChart(summary, totalSeconds);
  renderGoalList(totalHours);
}

function renderSubjectChart(summary, totalSeconds) {
  elements.subjectChart.innerHTML = '';
  if (!summary.length || totalSeconds === 0) {
    elements.subjectChart.innerHTML = '<p class="muted">Add sessions to see subject progress.</p>';
    return;
  }
  summary.sort((a, b) => b.totalSeconds - a.totalSeconds).forEach((item) => {
    const percentage = Math.round((item.totalSeconds / totalSeconds) * 100);
    const row = document.createElement('div');
    row.className = 'bar';
    row.innerHTML = `
      <div class="bar-label"><span>${item.name}</span><span>${percentage}%</span></div>
      <div class="progress"><div class="progress-inner" style="width:${percentage}%"></div></div>
    `;
    elements.subjectChart.appendChild(row);
  });
}

function renderSubjects() {
  elements.subjectList.innerHTML = '';
  elements.sessionSubject.innerHTML = '<option value="">Select subject</option>';
  subjects.forEach((subject) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const label = document.createElement('strong');
    label.textContent = subject.name;
    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.className = 'secondary';
    remove.addEventListener('click', () => deleteSubject(subject.id));
    item.appendChild(label);
    item.appendChild(remove);
    elements.subjectList.appendChild(item);

    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.name;
    elements.sessionSubject.appendChild(option);
  });
}

function renderGoalList(totalHours = null) {
  elements.goalList.innerHTML = '';
  goals.forEach((goal) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = goal.title;
    const progress = Math.min(100, Math.round(((totalHours || sessions.reduce((sum, session) => sum + session.duration, 0) / 3600) / goal.targetHours) * 100));
    const label = document.createElement('p');
    label.textContent = `${progress}% toward ${goal.targetHours}h target`;
    details.appendChild(title);
    details.appendChild(label);

    const remove = document.createElement('button');
    remove.textContent = 'Delete';
    remove.className = 'secondary';
    remove.addEventListener('click', () => deleteGoal(goal.id));

    const meter = document.createElement('div');
    meter.className = 'progress';
    meter.innerHTML = `<div class="progress-inner" style="width:${progress}%"></div>`;

    item.appendChild(details);
    item.appendChild(remove);
    elements.goalList.appendChild(item);
    elements.goalList.appendChild(meter);
  });
  if (!goals.length) {
    elements.goalList.innerHTML = '<p class="muted">Create goals to track your progress.</p>';
  }
}

function updateActiveSessionDisplay() {
  if (!activeSession) {
    elements.activeStatus.textContent = 'None';
    elements.activeTime.textContent = '00:00:00';
    elements.endSession.disabled = true;
    elements.startSession.disabled = false;
    return;
  }
  elements.activeStatus.textContent = `${activeSession.subjectName}`;
  const elapsedSeconds = Math.floor((Date.now() - new Date(activeSession.start).getTime()) / 1000);
  elements.activeTime.textContent = formatDuration(elapsedSeconds);
  elements.endSession.disabled = false;
  elements.startSession.disabled = true;
}

function deleteSubject(id) {
  subjects = subjects.filter((subject) => subject.id !== id);
  sessions = sessions.filter((session) => session.subjectId !== id);
  saveState();
  renderSubjects();
  updateAnalytics();
}

function deleteGoal(id) {
  goals = goals.filter((goal) => goal.id !== id);
  saveState();
  renderGoalList();
}

function startStudySession(event) {
  event.preventDefault();
  const subjectId = elements.sessionSubject.value;
  if (!subjectId) return alert('Choose a subject before starting your session.');
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) return;
  activeSession = { id: crypto.randomUUID(), subjectId, subjectName: subject.name, start: new Date().toISOString() };
  saveState();
  updateActiveSessionDisplay();
  sessionTimer = setInterval(updateActiveSessionDisplay, 1000);
}

function endStudySession() {
  if (!activeSession) return;
  const endTime = new Date().toISOString();
  const duration = Math.floor((new Date(endTime).getTime() - new Date(activeSession.start).getTime()) / 1000);
  sessions.push({ ...activeSession, end: endTime, duration });
  activeSession = null;
  saveState();
  updateAnalytics();
  updateActiveSessionDisplay();
  if (typeof sessionTimer !== 'undefined') {
    clearInterval(sessionTimer);
  }
}

function addSubject(event) {
  event.preventDefault();
  const name = elements.subjectName.value.trim();
  if (!name) return;
  subjects.push({ id: crypto.randomUUID(), name });
  elements.subjectName.value = '';
  saveState();
  renderSubjects();
}

function addGoal(event) {
  event.preventDefault();
  const title = elements.goalTitle.value.trim();
  const targetHours = Number(elements.goalHours.value);
  if (!title || !targetHours || targetHours <= 0) return;
  goals.push({ id: crypto.randomUUID(), title, targetHours });
  elements.goalTitle.value = '';
  elements.goalHours.value = '';
  saveState();
  renderGoalList((sessions.reduce((sum, session) => sum + session.duration, 0) / 3600).toFixed(1));
}

function updatePomodoroDisplay() {
  elements.pomodoroLabel.textContent = pomodoro.mode === 'work' ? 'Work time' : 'Break time';
  elements.pomodoroTime.textContent = formatMinutes(pomodoro.remaining);
  elements.pomodoroStart.textContent = pomodoro.running ? 'Pause' : pomodoro.mode === 'work' ? 'Start Work' : 'Start Break';
}

function resetPomodoro() {
  clearInterval(pomodoro.timerId);
  pomodoro.mode = 'work';
  pomodoro.remaining = 1500;
  pomodoro.running = false;
  pomodoro.timerId = null;
  saveState();
  updatePomodoroDisplay();
}

function togglePomodoro() {
  if (pomodoro.running) {
    clearInterval(pomodoro.timerId);
    pomodoro.running = false;
    saveState();
    updatePomodoroDisplay();
    return;
  }

  pomodoro.running = true;
  pomodoro.timerId = setInterval(() => {
    if (pomodoro.remaining <= 0) {
      clearInterval(pomodoro.timerId);
      pomodoro.mode = pomodoro.mode === 'work' ? 'break' : 'work';
      pomodoro.remaining = pomodoro.mode === 'work' ? 1500 : 300;
      pomodoro.running = false;
      saveState();
      updatePomodoroDisplay();
      return;
    }
    pomodoro.remaining -= 1;
    updatePomodoroDisplay();
  }, 1000);
  saveState();
  updatePomodoroDisplay();
}

function init() {
  loadState();
  renderSubjects();
  updateAnalytics();
  renderGoalList((sessions.reduce((sum, session) => sum + session.duration, 0) / 3600).toFixed(1));
  updatePomodoroDisplay();

  elements.subjectForm.addEventListener('submit', addSubject);
  elements.goalForm.addEventListener('submit', addGoal);
  elements.startSession.addEventListener('click', startStudySession);
  elements.endSession.addEventListener('click', endStudySession);
  elements.pomodoroStart.addEventListener('click', togglePomodoro);
  elements.pomodoroReset.addEventListener('click', resetPomodoro);
}

window.addEventListener('DOMContentLoaded', init);
