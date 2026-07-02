const ONE_MINUTE = 60 * 1000;
const STORAGE_KEY = "bus-stop-display-settings";

const demoStops = [
  {
    name: "旺角站",
    operator: "mixed",
    kmbStopId: "",
    ctbStopId: "",
    routes: ["1", "6", "101", "970X"],
  },
];

const demoRows = [
  { route: "1", operator: "九巴", destination: "尖沙咀碼頭", direction: "outbound", eta: ["2 分鐘", "11 分鐘", "22 分鐘"] },
  { route: "6", operator: "九巴", destination: "荔枝角", direction: "inbound", eta: ["即將到站", "9 分鐘", "18 分鐘"] },
  { route: "101", operator: "九巴 / 城巴", destination: "堅尼地城", direction: "outbound", eta: ["5 分鐘", "16 分鐘", "29 分鐘"] },
  { route: "970X", operator: "城巴", destination: "香港仔", direction: "inbound", eta: ["7 分鐘", "21 分鐘", "35 分鐘"] },
];

const holidays = [
  ["2026-07-01", "香港特別行政區成立紀念日"],
  ["2026-09-26", "中秋節翌日"],
  ["2026-10-01", "國慶日"],
  ["2026-10-19", "重陽節"],
  ["2026-12-25", "聖誕節"],
  ["2026-12-26", "聖誕節後第一個周日"],
  ["2027-01-01", "元旦"],
  ["2027-02-06", "農曆年初一"],
  ["2027-02-07", "農曆年初二"],
  ["2027-02-08", "農曆年初三"],
];

const elements = {
  activeStopName: document.querySelector("#activeStopName"),
  networkStatus: document.querySelector("#networkStatus"),
  refreshStatus: document.querySelector("#refreshStatus"),
  routeList: document.querySelector("#routeList"),
  displayMode: document.querySelector("#displayMode"),
  directionLabel: document.querySelector("#directionLabel"),
  weatherTemp: document.querySelector("#weatherTemp"),
  weatherText: document.querySelector("#weatherText"),
  humidityText: document.querySelector("#humidityText"),
  warningText: document.querySelector("#warningText"),
  holidayCountdown: document.querySelector("#holidayCountdown"),
  holidayName: document.querySelector("#holidayName"),
  clockText: document.querySelector("#clockText"),
  lastUpdated: document.querySelector("#lastUpdated"),
  adCopy: document.querySelector("#adCopy"),
  stopSelect: document.querySelector("#stopSelect"),
  stopNameInput: document.querySelector("#stopNameInput"),
  operatorInput: document.querySelector("#operatorInput"),
  kmbStopInput: document.querySelector("#kmbStopInput"),
  ctbStopInput: document.querySelector("#ctbStopInput"),
  routesInput: document.querySelector("#routesInput"),
  saveStop: document.querySelector("#saveStop"),
  addStop: document.querySelector("#addStop"),
  deleteStop: document.querySelector("#deleteStop"),
  refreshNow: document.querySelector("#refreshNow"),
  demoData: document.querySelector("#demoData"),
  toggleSettings: document.querySelector("#toggleSettings"),
  settingsBody: document.querySelector("#settingsBody"),
};

let settings = loadSettings();
let activeStopIndex = 0;
let latestRows = demoRows;

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.stops?.length) {
      return stored;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    stops: demoStops,
    mode: "all",
  };
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function renderStopOptions() {
  elements.stopSelect.innerHTML = settings.stops
    .map((stop, index) => `<option value="${index}">${escapeHtml(stop.name || `站點 ${index + 1}`)}</option>`)
    .join("");
  elements.stopSelect.value = String(activeStopIndex);
}

function fillStopForm() {
  const stop = getActiveStop();
  elements.activeStopName.textContent = stop.name || "未命名站點";
  elements.stopNameInput.value = stop.name || "";
  elements.operatorInput.value = stop.operator || "kmb";
  elements.kmbStopInput.value = stop.kmbStopId || "";
  elements.ctbStopInput.value = stop.ctbStopId || "";
  elements.routesInput.value = (stop.routes || []).join(", ");
}

function getActiveStop() {
  return settings.stops[activeStopIndex] || settings.stops[0] || demoStops[0];
}

function routeDirectionMatches(row) {
  const mode = elements.displayMode.value;
  if (mode === "all" || mode === "favourites") return true;
  return row.direction === mode;
}

function renderRows(rows) {
  const stop = getActiveStop();
  const favouriteRoutes = new Set((stop.routes || []).map((route) => route.toUpperCase()));
  let visibleRows = rows.filter(routeDirectionMatches);

  if (elements.displayMode.value === "favourites" && favouriteRoutes.size) {
    visibleRows = visibleRows.filter((row) => favouriteRoutes.has(row.route.toUpperCase()));
  }

  elements.directionLabel.textContent = {
    all: "全部方向",
    outbound: "只顯示去程",
    inbound: "只顯示回程",
    favourites: "只顯示已選路線",
  }[elements.displayMode.value];

  if (!visibleRows.length) {
    elements.routeList.innerHTML = `<div class="route-row"><div class="route-no">--</div><div class="route-dest"><strong>暫無班次</strong><span>請檢查站點 ID 或顯示模式</span></div><div class="eta-list"><strong>--</strong><span>--</span></div></div>`;
    return;
  }

  elements.routeList.innerHTML = visibleRows
    .slice(0, 10)
    .map((row) => {
      const eta = row.eta?.length ? row.eta : ["未有資料"];
      return `
        <article class="route-row">
          <div class="route-no">${escapeHtml(row.route)}</div>
          <div class="route-dest">
            <strong>${escapeHtml(row.destination || "目的地待更新")}</strong>
            <span>${escapeHtml(row.operator || "巴士")} · ${row.direction === "inbound" ? "回程" : "去程"}</span>
          </div>
          <div class="eta-list">
            <strong>${escapeHtml(eta[0])}</strong>
            <span>${escapeHtml(eta.slice(1).join(" / ") || "下一班待更新")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function updateAll() {
  elements.refreshStatus.textContent = "更新中";
  const stop = getActiveStop();

  const [rows] = await Promise.all([
    fetchDepartures(stop),
    fetchWeather(),
  ]);

  latestRows = rows.length ? rows : demoRows;
  renderRows(latestRows);
  elements.lastUpdated.textContent = `最後更新：${new Date().toLocaleTimeString("zh-HK", { hour12: false })}`;
  elements.refreshStatus.textContent = "每 1 分鐘更新";
}

async function fetchDepartures(stop) {
  const routeList = (stop.routes || []).map((route) => route.trim()).filter(Boolean);
  if (!stop.kmbStopId && !stop.ctbStopId) {
    setNetworkState(false, "使用示範資料");
    return demoRows;
  }

  const requests = [];

  if ((stop.operator === "kmb" || stop.operator === "mixed") && stop.kmbStopId) {
    if (routeList.length) {
      routeList.forEach((route) => requests.push(fetchKmbEta(stop.kmbStopId, route)));
    } else {
      requests.push(fetchKmbStopEta(stop.kmbStopId));
    }
  }

  if ((stop.operator === "ctb" || stop.operator === "mixed") && stop.ctbStopId) {
    if (routeList.length) {
      routeList.forEach((route) => requests.push(fetchCitybusEta(stop.ctbStopId, route)));
    } else {
      requests.push(fetchCitybusStopEta(stop.ctbStopId));
    }
  }

  const settled = await Promise.allSettled(requests);
  const rows = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  setNetworkState(rows.length > 0, rows.length ? "WiFi 已連線" : "未能取得班次");
  return rows;
}

async function fetchKmbEta(stopId, route) {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}/1`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("KMB ETA failed");
  const payload = await response.json();
  const groups = groupEta(payload.data || [], "九巴", route);
  return groups;
}

async function fetchKmbStopEta(stopId) {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${encodeURIComponent(stopId)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("KMB stop ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "九巴", "");
}

async function fetchCitybusEta(stopId, route) {
  const url = `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Citybus ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "城巴", route);
}

async function fetchCitybusStopEta(stopId) {
  const url = `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${encodeURIComponent(stopId)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Citybus stop ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "城巴", "");
}

function groupEta(items, operator, fallbackRoute) {
  const grouped = new Map();

  items.forEach((item) => {
    const route = item.route || fallbackRoute;
    const destination = item.dest_tc || item.dest || "目的地待更新";
    const direction = inferDirection(item.dir);
    const key = `${operator}-${route}-${destination}-${direction}`;
    const etaText = formatEta(item.eta);

    if (!etaText) return;
    if (!grouped.has(key)) {
      grouped.set(key, { route, operator, destination, direction, eta: [] });
    }
    grouped.get(key).eta.push(etaText);
  });

  return [...grouped.values()].map((row) => ({
    ...row,
    eta: row.eta.slice(0, 3),
  }));
}

function inferDirection(value) {
  const normalized = String(value || "").toUpperCase();
  return normalized === "I" || normalized === "INBOUND" ? "inbound" : "outbound";
}

function formatEta(value) {
  if (!value) return "";
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (Number.isNaN(minutes)) return "";
  if (minutes <= 0) return "即將到站";
  if (minutes === 1) return "1 分鐘";
  return `${minutes} 分鐘`;
}

async function fetchWeather() {
  try {
    const [weatherResponse, warningResponse] = await Promise.all([
      fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc", { cache: "no-store" }),
      fetch("https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc", { cache: "no-store" }),
    ]);

    const weather = await weatherResponse.json();
    const warnings = await warningResponse.json();
    const temperature = weather.temperature?.data?.[0]?.value;
    const humidity = weather.humidity?.data?.[0]?.value;
    const warningNames = Object.values(warnings || {}).map((warning) => warning.name).filter(Boolean);

    elements.weatherTemp.textContent = temperature ? `${temperature}°C` : "--°C";
    elements.weatherText.textContent = weather.icon?.length ? "現時天氣已更新" : "天文台資料已連線";
    elements.humidityText.textContent = humidity ? `濕度 ${humidity}%` : "濕度 --%";
    elements.warningText.textContent = warningNames.length ? `警告：${warningNames.join(" / ")}` : "警告：暫無";
  } catch {
    elements.weatherTemp.textContent = "28°C";
    elements.weatherText.textContent = "示範天氣資料";
    elements.humidityText.textContent = "濕度 78%";
    elements.warningText.textContent = "警告：暫無";
  }
}

function setNetworkState(isOnline, text) {
  elements.networkStatus.textContent = text;
  elements.networkStatus.classList.toggle("online", isOnline);
}

function updateClock() {
  elements.clockText.textContent = new Date().toLocaleTimeString("zh-HK", { hour12: false });
}

function updateHolidayCountdown() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextHoliday = holidays
    .map(([date, name]) => ({ date: new Date(`${date}T00:00:00`), name }))
    .find((holiday) => holiday.date >= today);

  if (!nextHoliday) return;
  const days = Math.ceil((nextHoliday.date - today) / 86400000);
  elements.holidayCountdown.textContent = `${days} 日`;
  elements.holidayName.textContent = nextHoliday.name;
}

function readFormStop() {
  return {
    name: elements.stopNameInput.value.trim() || `站點 ${activeStopIndex + 1}`,
    operator: elements.operatorInput.value,
    kmbStopId: elements.kmbStopInput.value.trim(),
    ctbStopId: elements.ctbStopInput.value.trim(),
    routes: elements.routesInput.value.split(",").map((route) => route.trim()).filter(Boolean),
  };
}

function wireEvents() {
  elements.stopSelect.addEventListener("change", () => {
    activeStopIndex = Number(elements.stopSelect.value);
    fillStopForm();
    updateAll();
  });

  elements.displayMode.addEventListener("change", () => {
    settings.mode = elements.displayMode.value;
    saveSettings();
    renderRows(latestRows);
  });

  elements.saveStop.addEventListener("click", () => {
    settings.stops[activeStopIndex] = readFormStop();
    saveSettings();
    renderStopOptions();
    fillStopForm();
    updateAll();
  });

  elements.addStop.addEventListener("click", () => {
    if (settings.stops.length >= 10) {
      elements.refreshStatus.textContent = "最多十個站點";
      return;
    }
    settings.stops.push({ name: `新站點 ${settings.stops.length + 1}`, operator: "kmb", kmbStopId: "", ctbStopId: "", routes: [] });
    activeStopIndex = settings.stops.length - 1;
    saveSettings();
    renderStopOptions();
    fillStopForm();
  });

  elements.deleteStop.addEventListener("click", () => {
    if (settings.stops.length === 1) return;
    settings.stops.splice(activeStopIndex, 1);
    activeStopIndex = Math.max(0, activeStopIndex - 1);
    saveSettings();
    renderStopOptions();
    fillStopForm();
    updateAll();
  });

  elements.refreshNow.addEventListener("click", updateAll);
  elements.demoData.addEventListener("click", () => {
    latestRows = demoRows;
    renderRows(latestRows);
    setNetworkState(false, "示範模式");
  });

  elements.toggleSettings.addEventListener("click", () => {
    elements.settingsBody.classList.toggle("is-collapsed");
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function init() {
  elements.displayMode.value = settings.mode || "all";
  renderStopOptions();
  fillStopForm();
  wireEvents();
  renderRows(latestRows);
  updateClock();
  updateHolidayCountdown();
  updateAll();
  setInterval(updateClock, 1000);
  setInterval(updateAll, ONE_MINUTE);
}

init();
