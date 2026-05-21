const desktopIcons = document.getElementById('desktop-icons');
const appList = document.getElementById('appList');
const startBtn = document.getElementById('startBtn');
const startMenu = document.getElementById('startMenu');
const runningApps = document.getElementById('runningApps');
const clock = document.getElementById('clock');
const addProgramsBtn = document.getElementById('addProgramsBtn');
const storeWindow = document.getElementById('storeWindow');
const storeApps = document.getElementById('storeApps');

let zIndexCounter = 100;
let installedApps = [];

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

setInterval(updateClock, 1000);
updateClock();

startBtn.onclick = () => {
  startMenu.classList.toggle('hidden');
};

addProgramsBtn.onclick = () => {
  storeWindow.classList.toggle('hidden');
};

fetch('./programs/installed.json')
  .then(r => r.json())
  .then(apps => {
    installedApps = apps;
    renderApps();
  });

fetch('./programs/store.json')
  .then(r => r.json())
  .then(store => {
    renderStore(store);
  });

function renderApps() {
  desktopIcons.innerHTML = '';
  appList.innerHTML = '';

  installedApps.forEach(app => {
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.innerHTML = `<div class="icon">${app.icon}</div><span>${app.name}</span>`;
    icon.onclick = () => openApp(app);
    desktopIcons.appendChild(icon);

    const btn = document.createElement('button');
    btn.className = 'app-button';
    btn.textContent = `${app.icon} ${app.name}`;
    btn.onclick = () => openApp(app);
    appList.appendChild(btn);
  });
}

function renderStore(store) {
  store.forEach(app => {
    const btn = document.createElement('button');
    btn.className = 'app-button';
    btn.textContent = `Install ${app.icon} ${app.name}`;

    btn.onclick = () => {
      if (!installedApps.find(a => a.id === app.id)) {
        installedApps.push(app);
        renderApps();
        alert(`${app.name} installed!`);
      }
    };

    storeApps.appendChild(btn);
  });
}

function openApp(app) {
  const existing = document.getElementById(`window-${app.id}`);
  if (existing) {
    existing.style.zIndex = ++zIndexCounter;
    return;
  }

  const win = document.createElement('div');
  win.className = 'window';
  win.id = `window-${app.id}`;
  win.style.left = '120px';
  win.style.top = '80px';
  win.style.zIndex = ++zIndexCounter;

  win.innerHTML = `
    <div class="window-header">
      <div>${app.icon} ${app.name}</div>
      <button onclick="document.getElementById('window-${app.id}').remove()">✕</button>
    </div>
    <div class="window-content">
      <iframe src="${app.url}"></iframe>
    </div>
  `;

  document.body.appendChild(win);
}
