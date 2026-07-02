const ONE_MINUTE = 60 * 1000;
const STORAGE_KEY = "transport-live-board-settings-v2";
const CATALOG_CACHE_KEY = "transport-live-board-catalog-v2";
const CATALOG_MAX_AGE = 24 * 60 * 60 * 1000;

const demoStops = [
  {
    name: "公司樓下",
    operator: "mixed",
    kmbStopId: "",
    ctbStopId: "",
    gmbStopId: "",
    routes: ["1", "6", "101", "970X", "56K"],
  },
];

const demoRows = [
  { type: "eta", route: "1", operator: "九巴", destination: "尖沙咀碼頭", origin: "竹園邨", direction: "outbound", stopName: "公司附近", eta: ["2 分鐘", "11 分鐘", "22 分鐘"] },
  { type: "eta", route: "6", operator: "九巴", destination: "荔枝角", origin: "尖沙咀碼頭", direction: "inbound", stopName: "公司附近", eta: ["即將到站", "9 分鐘", "18 分鐘"] },
  { type: "eta", route: "101", operator: "九巴 / 城巴", destination: "堅尼地城", origin: "觀塘", direction: "outbound", stopName: "公司附近", eta: ["5 分鐘", "16 分鐘", "29 分鐘"] },
  { type: "eta", route: "56K", operator: "綠色小巴", destination: "粉嶺站", origin: "鹿頸", direction: "outbound", stopName: "小巴站", eta: ["資料待接入", "請查看營辦商公告"] },
];

const fallbackCatalog = [
  { operatorKey: "kmb", operator: "九巴", route: "1", origin: "竹園邨", destination: "尖沙咀碼頭", direction: "outbound", serviceType: "1" },
  { operatorKey: "kmb", operator: "九巴", route: "6", origin: "尖沙咀碼頭", destination: "荔枝角", direction: "inbound", serviceType: "1" },
  { operatorKey: "ctb", operator: "城巴", route: "101", origin: "觀塘", destination: "堅尼地城", direction: "outbound", serviceType: "1" },
  { operatorKey: "ctb", operator: "城巴", route: "970X", origin: "長沙灣", destination: "香港仔", direction: "outbound", serviceType: "1" },
  { operatorKey: "gmb", operator: "綠色小巴", route: "56K", origin: "鹿頸", destination: "粉嶺站", direction: "outbound", serviceType: "gmb" },
  { operatorKey: "gmb", operator: "綠色小巴", route: "58", origin: "上水站", destination: "丙崗", direction: "outbound", serviceType: "gmb" },
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
  boardSubtitle: document.querySelector("#boardSubtitle"),
  networkStatus: document.querySelector("#networkStatus"),
  refreshStatus: document.querySelector("#refreshStatus"),
  routeList: document.querySelector("#routeList"),
  displayMode: document.querySelector("#displayMode"),
  directionLabel: document.querySelector("#directionLabel"),
  mainSectionLabel: document.querySelector("#mainSectionLabel"),
  searchLabel: document.querySelector("#searchLabel"),
  sideSectionLabel: document.querySelector("#sideSectionLabel"),
  globalSearch: document.querySelector("#globalSearch"),
  operatorFilter: document.querySelector("#operatorFilter"),
  refreshCatalog: document.querySelector("#refreshCatalog"),
  nearbyStops: document.querySelector("#nearbyStops"),
  weatherTemp: document.querySelector("#weatherTemp"),
  weatherText: document.querySelector("#weatherText"),
  humidityText: document.querySelector("#humidityText"),
  warningText: document.querySelector("#warningText"),
  rideLocationText: document.querySelector("#rideLocationText"),
  rideAvailability: document.querySelector("#rideAvailability"),
  locateRide: document.querySelector("#locateRide"),
  openUber: document.querySelector("#openUber"),
  holidayCountdown: document.querySelector("#holidayCountdown"),
  holidayName: document.querySelector("#holidayName"),
  clockText: document.querySelector("#clockText"),
  lastUpdated: document.querySelector("#lastUpdated"),
  stopSelect: document.querySelector("#stopSelect"),
  stopNameInput: document.querySelector("#stopNameInput"),
  operatorInput: document.querySelector("#operatorInput"),
  kmbStopInput: document.querySelector("#kmbStopInput"),
  ctbStopInput: document.querySelector("#ctbStopInput"),
  gmbStopInput: document.querySelector("#gmbStopInput"),
  routesInput: document.querySelector("#routesInput"),
  saveStop: document.querySelector("#saveStop"),
  addStop: document.querySelector("#addStop"),
  deleteStop: document.querySelector("#deleteStop"),
  refreshNow: document.querySelector("#refreshNow"),
  demoData: document.querySelector("#demoData"),
  toggleSettings: document.querySelector("#toggleSettings"),
  settingsBody: document.querySelector("#settingsBody"),
  modeButtons: [...document.querySelectorAll(".mode-card")],
};

let settings = loadSettings();
let activeStopIndex = 0;
let latestRows = demoRows;
let routeCatalog = fallbackCatalog;
let minibusCatalog = fallbackCatalog.filter((route) => route.operatorKey === "gmb");
let stopCatalog = { kmb: new Map(), ctb: new Map() };
let routeStopCatalog = { kmb: [], ctb: [] };
let selectedRoute = null;
let selectedRouteStops = [];
let currentRideLocation = null;
let activeMode = "bus";

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.stops?.length) return stored;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { stops: demoStops, mode: "all" };
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
  elements.stopNameInput.value = stop.name || "";
  elements.operatorInput.value = stop.operator || "mixed";
  elements.kmbStopInput.value = stop.kmbStopId || "";
  elements.ctbStopInput.value = stop.ctbStopId || "";
  elements.gmbStopInput.value = stop.gmbStopId || "";
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

function renderRows(rows, label = "公司常用站點") {
  const stop = getActiveStop();
  const favouriteRoutes = new Set((stop.routes || []).map((route) => route.toUpperCase()));
  let visibleRows = rows.filter(routeDirectionMatches);

  if (elements.displayMode.value === "favourites" && favouriteRoutes.size) {
    visibleRows = visibleRows.filter((row) => favouriteRoutes.has(String(row.route).toUpperCase()));
  }

  elements.activeStopName.textContent = label;
  elements.directionLabel.textContent = {
    all: "所有方向",
    outbound: "只顯示去程",
    inbound: "只顯示回程",
    favourites: "公司常用路線",
  }[elements.displayMode.value];

  if (!visibleRows.length) {
    elements.routeList.innerHTML = emptyRow("暫無班次", "請搜尋路線，或檢查公司常用站點設定。");
    return;
  }

  elements.routeList.innerHTML = visibleRows
    .slice(0, 12)
    .map((row) => renderEtaRow(row))
    .join("");
}

function renderEtaRow(row) {
  const eta = row.eta?.length ? row.eta : ["未有資料"];
  const extra = [row.operator, row.stopName, row.direction === "inbound" ? "回程" : "去程"].filter(Boolean).join(" · ");
  return `
    <article class="route-row ${row.operatorKey === "gmb" ? "minibus" : ""}">
      <div class="route-no">${escapeHtml(row.route)}</div>
      <div class="route-dest">
        <strong>${escapeHtml(row.destination || "目的地待更新")}</strong>
        <span>${escapeHtml(extra || "公共交通")} ${row.origin ? `｜${escapeHtml(row.origin)} 開出` : ""}</span>
      </div>
      <div class="eta-list">
        <strong>${escapeHtml(eta[0])}</strong>
        <span>${escapeHtml(eta.slice(1).join(" / ") || "下一班待更新")}</span>
      </div>
    </article>
  `;
}

function renderRouteResults(query = "") {
  if (activeMode === "minibus") {
    renderMinibusResults(query);
    return;
  }

  if (activeMode === "taxi") {
    renderTaxiPanel();
    return;
  }

  const normalizedQuery = normalize(query);
  const operatorFilter = elements.operatorFilter.value;
  let results = routeCatalog.filter((route) => operatorFilter === "all" || route.operatorKey === operatorFilter);

  selectedRoute = null;
  selectedRouteStops = [];
  renderNearbyStops([], "先搜尋路線，然後選擇一條路線查看站點。");

  if (normalizedQuery) {
    results = results.filter((route) => {
      const searchText = normalize(`${route.route} ${route.operator} ${route.origin} ${route.destination}`);
      return searchText.includes(normalizedQuery);
    });
  } else {
    elements.activeStopName.textContent = "巴士路線搜尋";
    elements.directionLabel.textContent = "請先輸入路線";
    elements.boardSubtitle.textContent = "包括九巴、龍運及城巴全港路線；輸入路線號碼、目的地或地區即可搜尋。";
    elements.routeList.innerHTML = emptyRow("請先搜尋巴士", "例如 270A、101、尖沙咀、觀塘。");
    return;
  }

  elements.activeStopName.textContent = query ? `搜尋：${query}` : "公司常用路線";
  elements.directionLabel.textContent = `${results.length} 個結果`;
  elements.boardSubtitle.textContent = "點選一條路線後，系統會列出站點；再點選站點即可查到站時間。";

  if (!results.length) {
    elements.routeList.innerHTML = emptyRow("找不到巴士路線", "請檢查路線號碼、目的地或營辦商篩選。");
    return;
  }

  elements.routeList.innerHTML = results
    .slice(0, 60)
    .map((route, index) => `
      <button class="route-result ${route.operatorKey === "gmb" ? "minibus" : ""}" type="button" data-result-index="${index}">
        <span class="route-no">${escapeHtml(route.route)}</span>
        <span class="route-result-main">
          <strong>${escapeHtml(route.destination || "目的地待更新")}</strong>
          <small>${escapeHtml(route.operator)} · ${escapeHtml(route.origin || "起點待更新")} → ${escapeHtml(route.destination || "終點待更新")}</small>
        </span>
        <span class="route-action">查看站點</span>
      </button>
    `)
    .join("");

  [...elements.routeList.querySelectorAll("[data-result-index]")].forEach((button) => {
    button.addEventListener("click", () => {
      const result = results[Number(button.dataset.resultIndex)];
      openRouteStops(result);
    });
  });
}

function renderMinibusResults(query = "") {
  const normalizedQuery = normalize(query);
  selectedRoute = null;
  selectedRouteStops = [];
  renderNearbyStops([], "小巴模式會顯示綠色小巴路線及方向資訊。");

  let results = minibusCatalog;
  if (normalizedQuery) {
    results = results.filter((route) => {
      const searchText = normalize(`${route.route} ${route.regionLabel} ${route.origin || ""} ${route.destination || ""}`);
      return searchText.includes(normalizedQuery);
    });
  } else {
    elements.activeStopName.textContent = "綠色小巴搜尋";
    elements.directionLabel.textContent = "請先輸入小巴路線";
    elements.boardSubtitle.textContent = "小巴已獨立成一區；輸入 56K、1、58 或地區代碼搜尋。";
    elements.routeList.innerHTML = emptyRow("請先搜尋小巴", "例如 56K、1、58。");
    return;
  }

  elements.activeStopName.textContent = `小巴搜尋：${query}`;
  elements.directionLabel.textContent = `${results.length} 個小巴結果`;
  elements.boardSubtitle.textContent = "選擇小巴路線後，顯示方向及班次資訊。";

  if (!results.length) {
    elements.routeList.innerHTML = emptyRow("找不到小巴路線", "請輸入小巴路線號碼，例如 56K、1、58。");
    return;
  }

  elements.routeList.innerHTML = results
    .slice(0, 80)
    .map((route, index) => `
      <button class="route-result minibus" type="button" data-minibus-index="${index}">
        <span class="route-no">${escapeHtml(route.route)}</span>
        <span class="route-result-main">
          <strong>${escapeHtml(route.regionLabel || "綠色小巴")}</strong>
          <small>${escapeHtml(route.operator)} · ${escapeHtml(route.region || "")}</small>
        </span>
        <span class="route-action">查看班次</span>
      </button>
    `)
    .join("");

  [...elements.routeList.querySelectorAll("[data-minibus-index]")].forEach((button) => {
    button.addEventListener("click", () => {
      const result = results[Number(button.dataset.minibusIndex)];
      openMinibusRoute(result);
    });
  });
}

async function openMinibusRoute(route) {
  elements.activeStopName.textContent = `綠色小巴 ${route.route}`;
  elements.directionLabel.textContent = route.regionLabel || "綠色小巴";
  elements.boardSubtitle.textContent = "顯示綠色小巴方向、起點、終點及班次資訊。";
  elements.routeList.innerHTML = emptyRow("載入小巴資料中", "正在讀取綠色小巴公開資料。");

  try {
    const payload = await fetchJson(`https://data.etagmb.gov.hk/route/${encodeURIComponent(route.region)}/${encodeURIComponent(route.route)}`);
    const variants = payload.data || [];
    if (!variants.length) {
      elements.routeList.innerHTML = emptyRow("未有小巴詳情", "公開資料暫時沒有這條小巴路線的詳細班次。");
      return;
    }

    const rows = variants.flatMap((variant) => (variant.directions || []).map((direction) => ({
      route: variant.route_code,
      region: variant.region,
      description: variant.description_tc || variant.description_en || "正常班次",
      origin: direction.orig_tc || direction.orig_en || "起點待更新",
      destination: direction.dest_tc || direction.dest_en || "終點待更新",
      remarks: direction.remarks_tc || direction.remarks_en || "",
      headway: summarizeHeadway(direction.headways || []),
    })));

    elements.routeList.innerHTML = rows.map((row) => `
      <article class="minibus-detail">
        <span class="route-no">${escapeHtml(row.route)}</span>
        <span class="route-result-main">
          <strong>${escapeHtml(row.destination)}</strong>
          <small>${escapeHtml(row.origin)} → ${escapeHtml(row.destination)}${row.remarks ? ` · ${escapeHtml(row.remarks)}` : ""}</small>
        </span>
        <span class="eta-list">
          <strong>${escapeHtml(row.headway)}</strong>
          <span>${escapeHtml(row.description)}</span>
        </span>
      </article>
    `).join("");
  } catch {
    elements.routeList.innerHTML = emptyRow("小巴資料載入失敗", "請稍後再試，或檢查網絡連線。");
  }
}

function renderTaxiPanel() {
  selectedRoute = null;
  selectedRouteStops = [];
  elements.activeStopName.textContent = "的士 / Uber";
  elements.directionLabel.textContent = "定位後叫車";
  elements.boardSubtitle.textContent = "取得目前位置後，可直接開 Uber 或電召的士。";
  renderNearbyStops([], "叫車模式不需要選巴士站；按定位建立上車點。");
  elements.routeList.innerHTML = `
    <article class="route-row">
      <span class="route-no">GPS</span>
      <span class="route-dest">
        <strong>定位目前位置</strong>
        <span>${escapeHtml(elements.rideLocationText.textContent || "按定位後建立上車點")}</span>
      </span>
      <span class="eta-list">
        <strong>上車點</strong>
        <span>Uber / 的士</span>
      </span>
    </article>
    <article class="route-row">
      <span class="route-no">UBER</span>
      <span class="route-dest">
        <strong>開啟 Uber</strong>
        <span>用目前位置作上車點；未定位時可在 Uber 內選擇。</span>
      </span>
      <span class="eta-list">
        <strong>即時</strong>
        <span>外部 app</span>
      </span>
    </article>
    <article class="route-row">
      <span class="route-no">TAXI</span>
      <span class="route-dest">
        <strong>電召的士</strong>
        <span>按右邊「電召的士」直接撥號。</span>
      </span>
      <span class="eta-list">
        <strong>電話</strong>
        <span>call taxi</span>
      </span>
    </article>
  `;
}

function summarizeHeadway(headways) {
  const item = headways.find((headway) => headway.frequency || headway.headway_seq === 1) || headways[0];
  if (!item) return "班次待定";
  if (item.frequency) return `${item.frequency} 分鐘`;
  if (item.start_time && item.end_time) return `${item.start_time}-${item.end_time}`;
  return "班次資訊";
}

async function openRouteStops(route) {
  selectedRoute = route;
  elements.activeStopName.textContent = `${route.operator} ${route.route}`;
  elements.directionLabel.textContent = `${route.origin || "起點"} → ${route.destination || "終點"}`;
  elements.boardSubtitle.textContent = "選擇站點後會顯示該站實時到站時間。";
  elements.routeList.innerHTML = emptyRow("載入站點中", "正在讀取路線站點資料。");

  if (route.operatorKey === "gmb") {
    selectedRouteStops = [];
    renderNearbyStops([], "綠色小巴暫時未有完整站點距離資料。");
    elements.routeList.innerHTML = `
      ${renderEtaRow({
        route: route.route,
        operator: route.operator,
        operatorKey: "gmb",
        destination: route.destination,
        origin: route.origin,
        direction: route.direction,
        stopName: "綠色小巴",
        eta: ["小巴 ETA 待接入", "先顯示路線資料"],
      })}
      <p class="inline-note">綠色小巴路線已納入搜尋。實時 ETA 需要按可用公開 API 或營辦商資料逐步接入。</p>
    `;
    return;
  }

  try {
    const stops = await fetchRouteStops(route);
    selectedRouteStops = orderStopsByLocation(stops);
    if (!stops.length) {
      elements.routeList.innerHTML = emptyRow("未有站點資料", "請嘗試另一方向或另一條路線。");
      return;
    }

    renderNearbyStops(selectedRouteStops, currentRideLocation ? "已按目前位置排序。" : "按定位後可把最近站排前。");

    elements.routeList.innerHTML = selectedRouteStops
      .map((stop) => `
        <button class="stop-result" type="button" data-stop-id="${escapeHtml(stop.stopId)}">
          <span class="stop-seq">${escapeHtml(stop.seq)}</span>
          <span>
            <strong>${escapeHtml(stop.name || stop.stopId)}</strong>
            <small>${escapeHtml(route.route)} · ${escapeHtml(route.operator)}${stop.distanceText ? ` · ${escapeHtml(stop.distanceText)}` : ""}</small>
          </span>
          <span class="route-action">查 ETA</span>
        </button>
      `)
      .join("");

    [...elements.routeList.querySelectorAll("[data-stop-id]")].forEach((button) => {
      button.addEventListener("click", async () => {
        const stopId = button.dataset.stopId;
        const stop = selectedRouteStops.find((item) => item.stopId === stopId);
        await showRouteStopEta(route, stop);
      });
    });
  } catch {
    elements.routeList.innerHTML = emptyRow("站點載入失敗", "網絡或公開資料暫時未能回應。");
  }
}

async function showRouteStopEta(route, stop) {
  elements.routeList.innerHTML = emptyRow("更新 ETA 中", `${route.route} · ${stop.name}`);
  const rows = route.operatorKey === "kmb"
    ? await fetchKmbEta(stop.stopId, route.route)
    : await fetchCitybusEta(stop.stopId, route.route);
  const enriched = rows.map((row) => ({ ...row, stopName: stop.name, origin: route.origin, destination: row.destination || route.destination }));
  latestRows = enriched.length ? enriched : [{
    route: route.route,
    operator: route.operator,
    operatorKey: route.operatorKey,
    origin: route.origin,
    destination: route.destination,
    stopName: stop.name,
    direction: route.direction,
    eta: ["未有班次", "請稍後再試"],
  }];
  renderRows(latestRows, `${route.route} · ${stop.name}`);
  elements.lastUpdated.textContent = `最後更新：${new Date().toLocaleTimeString("zh-HK", { hour12: false })}`;
}

function emptyRow(title, body) {
  return `<div class="route-row"><div class="route-no">--</div><div class="route-dest"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div><div class="eta-list"><strong>--</strong><span>--</span></div></div>`;
}

async function updateAll() {
  elements.refreshStatus.textContent = "更新中";
  const stop = getActiveStop();
  const [rows] = await Promise.all([fetchDepartures(stop), fetchWeather()]);
  latestRows = rows.length ? rows : demoRows;
  renderRows(latestRows, stop.name || "公司常用站點");
  elements.lastUpdated.textContent = `最後更新：${new Date().toLocaleTimeString("zh-HK", { hour12: false })}`;
  elements.refreshStatus.textContent = "每 1 分鐘更新";
}

async function fetchDepartures(stop) {
  const routeList = (stop.routes || []).map((route) => route.trim()).filter(Boolean);
  if (!stop.kmbStopId && !stop.ctbStopId) {
    setNetworkState(false, "示範 / 搜尋模式");
    return demoRows;
  }

  const requests = [];
  if ((stop.operator === "kmb" || stop.operator === "mixed") && stop.kmbStopId) {
    if (routeList.length) routeList.forEach((route) => requests.push(fetchKmbEta(stop.kmbStopId, route)));
    else requests.push(fetchKmbStopEta(stop.kmbStopId));
  }

  if ((stop.operator === "ctb" || stop.operator === "mixed") && stop.ctbStopId) {
    if (routeList.length) routeList.forEach((route) => requests.push(fetchCitybusEta(stop.ctbStopId, route)));
    else requests.push(fetchCitybusStopEta(stop.ctbStopId));
  }

  const settled = await Promise.allSettled(requests);
  const rows = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  setNetworkState(rows.length > 0, rows.length ? "即時資料已連線" : "未能取得 ETA");
  return rows;
}

async function fetchKmbEta(stopId, route) {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}/1`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("KMB ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "九巴", "kmb", route);
}

async function fetchKmbStopEta(stopId) {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${encodeURIComponent(stopId)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("KMB stop ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "九巴", "kmb", "");
}

async function fetchCitybusEta(stopId, route) {
  const url = `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Citybus ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "城巴", "ctb", route);
}

async function fetchCitybusStopEta(stopId) {
  const url = `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${encodeURIComponent(stopId)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Citybus stop ETA failed");
  const payload = await response.json();
  return groupEta(payload.data || [], "城巴", "ctb", "");
}

function groupEta(items, operator, operatorKey, fallbackRoute) {
  const grouped = new Map();
  items.forEach((item) => {
    const route = item.route || fallbackRoute;
    const destination = item.dest_tc || item.dest || "目的地待更新";
    const direction = inferDirection(item.dir);
    const key = `${operator}-${route}-${destination}-${direction}-${item.stop || ""}`;
    const etaText = formatEta(item.eta);
    if (!etaText) return;
    if (!grouped.has(key)) {
      grouped.set(key, { route, operator, operatorKey, destination, direction, eta: [] });
    }
    grouped.get(key).eta.push(etaText);
  });
  return [...grouped.values()].map((row) => ({ ...row, eta: row.eta.slice(0, 3) }));
}

async function loadCatalog(force = false) {
  elements.refreshStatus.textContent = "載入路線庫";
  elements.routeList.innerHTML = emptyRow("載入路線庫中", "請稍候，正在更新九巴及城巴路線資料。");
  const cached = getCatalogCache();
  if (!force && cached) {
    applyCatalog(cached);
    setNetworkState(true, "路線庫已載入");
    elements.refreshStatus.textContent = "路線庫已載入";
    renderRouteResults(elements.globalSearch.value);
    return;
  }

  try {
    const [kmbRoutes, kmbStops, kmbRouteStops, ctbRoutes, ctbStops, ctbRouteStops, gmbRoutes] = await Promise.all([
      fetchJson("https://data.etabus.gov.hk/v1/transport/kmb/route/"),
      fetchJson("https://data.etabus.gov.hk/v1/transport/kmb/stop"),
      fetchJson("https://data.etabus.gov.hk/v1/transport/kmb/route-stop"),
      fetchJson("https://rt.data.gov.hk/v2/transport/citybus/route/CTB"),
      fetchJson("https://rt.data.gov.hk/v2/transport/citybus/stop/CTB"),
      Promise.resolve({ data: [] }),
      fetchJson("https://data.etagmb.gov.hk/route"),
    ].map((request) => request.catch(() => ({ data: [] }))));

    const catalog = {
      routes: [
        ...normalizeKmbRoutes(kmbRoutes.data || []),
        ...normalizeCitybusRoutes(ctbRoutes.data || []),
      ],
      minibuses: normalizeMinibusRoutes(gmbRoutes.data?.routes || {}),
      stops: {
        kmb: kmbStops.data || [],
        ctb: ctbStops.data || [],
      },
      routeStops: {
        kmb: kmbRouteStops.data || [],
        ctb: ctbRouteStops.data || [],
      },
      cachedAt: Date.now(),
    };
    if (!catalog.routes.length) throw new Error("No route catalog");
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog));
    applyCatalog(catalog);
    setNetworkState(true, "全港路線庫已更新");
  } catch {
    applyCatalog({ routes: fallbackCatalog, stops: { kmb: [], ctb: [] }, routeStops: { kmb: [], ctb: [] } });
    setNetworkState(false, "使用離線路線示範");
  }

  renderRouteResults(elements.globalSearch.value);
  elements.refreshStatus.textContent = "每 1 分鐘更新";
}

function getCatalogCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY));
    if (cached?.routes?.length && Date.now() - cached.cachedAt < CATALOG_MAX_AGE) return cached;
  } catch {
    localStorage.removeItem(CATALOG_CACHE_KEY);
  }
  return null;
}

function applyCatalog(catalog) {
  routeCatalog = catalog.routes?.length ? catalog.routes : fallbackCatalog.filter((route) => route.operatorKey !== "gmb");
  minibusCatalog = catalog.minibuses?.length ? catalog.minibuses : fallbackCatalog.filter((route) => route.operatorKey === "gmb");
  stopCatalog = {
    kmb: new Map((catalog.stops?.kmb || []).map((stop) => [stop.stop, stop])),
    ctb: new Map((catalog.stops?.ctb || []).map((stop) => [stop.stop, stop])),
  };
  routeStopCatalog = {
    kmb: catalog.routeStops?.kmb || [],
    ctb: catalog.routeStops?.ctb || [],
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json();
}

function normalizeKmbRoutes(routes) {
  return routes.map((route) => ({
    operatorKey: "kmb",
    operator: route.co === "LWB" ? "龍運" : "九巴",
    route: route.route,
    origin: route.orig_tc || route.orig_en || "",
    destination: route.dest_tc || route.dest_en || "",
    direction: inferDirection(route.bound),
    bound: route.bound,
    serviceType: route.service_type || "1",
  }));
}

function normalizeCitybusRoutes(routes) {
  return routes.flatMap((route) => {
    const origin = route.orig_tc || route.orig_en || "";
    const destination = route.dest_tc || route.dest_en || "";
    return [
      {
        operatorKey: "ctb",
        operator: "城巴",
        route: route.route,
        origin,
        destination,
        direction: "outbound",
        bound: "outbound",
        serviceType: "1",
      },
      {
        operatorKey: "ctb",
        operator: "城巴",
        route: route.route,
        origin: destination,
        destination: origin,
        direction: "inbound",
        bound: "inbound",
        serviceType: "1",
      },
    ];
  });
}

function normalizeMinibusRoutes(routesByRegion) {
  const labels = {
    HKI: "港島小巴",
    KLN: "九龍小巴",
    NT: "新界小巴",
  };
  return Object.entries(routesByRegion).flatMap(([region, routes]) => (
    (routes || []).map((route) => ({
      operatorKey: "gmb",
      operator: "綠色小巴",
      region,
      regionLabel: labels[region] || region,
      route,
      direction: "outbound",
      serviceType: "gmb",
    }))
  ));
}

async function fetchRouteStops(route) {
  let source = route.operatorKey === "kmb" ? routeStopCatalog.kmb : routeStopCatalog.ctb;

  if (route.operatorKey === "ctb") {
    const payload = await fetchJson(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${encodeURIComponent(route.route)}/${encodeURIComponent(route.bound)}`);
    source = payload.data || [];
  }

  const routeStops = source
    .filter((item) => item.route === route.route && routeStopDirectionMatches(item, route))
    .sort((a, b) => Number(a.seq) - Number(b.seq));

  return routeStops.map((item) => {
    const stop = stopCatalog[route.operatorKey].get(item.stop) || {};
    const latitude = Number(stop.lat || stop.latitude);
    const longitude = Number(stop.long || stop.lng || stop.longitude);
    return {
      seq: item.seq,
      stopId: item.stop,
      name: stop.name_tc || stop.name_en || item.stop,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  });
}

function orderStopsByLocation(stops) {
  if (!currentRideLocation) return stops;
  return stops
    .map((stop) => {
      if (stop.latitude == null || stop.longitude == null) return stop;
      const distance = distanceInMeters(currentRideLocation.latitude, currentRideLocation.longitude, stop.latitude, stop.longitude);
      return {
        ...stop,
        distance,
        distanceText: distance < 1000 ? `${Math.round(distance)} 米` : `${(distance / 1000).toFixed(1)} 公里`,
      };
    })
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

function renderNearbyStops(stops, message) {
  if (!elements.nearbyStops) return;
  if (!stops.length) {
    elements.nearbyStops.innerHTML = `<p class="hint">${escapeHtml(message)}</p>`;
    return;
  }

  elements.nearbyStops.innerHTML = `
    <p class="hint">${escapeHtml(message)}</p>
    <div class="nearby-list">
      ${stops.slice(0, 6).map((stop) => `
        <button class="nearby-stop" type="button" data-nearby-stop-id="${escapeHtml(stop.stopId)}">
          <strong>${escapeHtml(stop.name || stop.stopId)}</strong>
          <span>${escapeHtml(selectedRoute?.route || "")}${stop.distanceText ? ` · ${escapeHtml(stop.distanceText)}` : ""}</span>
        </button>
      `).join("")}
    </div>
  `;

  [...elements.nearbyStops.querySelectorAll("[data-nearby-stop-id]")].forEach((button) => {
    button.addEventListener("click", async () => {
      const stop = selectedRouteStops.find((item) => item.stopId === button.dataset.nearbyStopId);
      if (selectedRoute && stop) await showRouteStopEta(selectedRoute, stop);
    });
  });
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeStopDirectionMatches(item, route) {
  if (route.operatorKey === "kmb") {
    return String(item.bound || "").toUpperCase() === String(route.bound || "").toUpperCase()
      && String(item.service_type || "1") === String(route.serviceType || "1");
  }
  return inferDirection(item.dir || route.bound) === route.direction;
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

function locateForRide() {
  if (!navigator.geolocation) {
    elements.rideLocationText.textContent = "此瀏覽器不支援定位。";
    return;
  }

  elements.rideLocationText.textContent = "正在取得目前位置...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentRideLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const pickup = encodeURIComponent(JSON.stringify({
        latitude: currentRideLocation.latitude,
        longitude: currentRideLocation.longitude,
        addressLine1: "目前位置",
        addressLine2: "由公司交通顯示器提供",
      }));
      elements.openUber.href = `https://m.uber.com/looking?pickup=${pickup}`;
      elements.openUber.classList.remove("disabled");
      elements.rideLocationText.textContent = `上車點已定位：${currentRideLocation.latitude.toFixed(5)}, ${currentRideLocation.longitude.toFixed(5)}`;
      elements.rideAvailability.textContent = "已準備叫車連結。即時車輛位置需 Uber/的士平台授權後才可顯示。";
      if (activeMode === "taxi") {
        renderTaxiPanel();
      }
      if (selectedRoute) {
        openRouteStops(selectedRoute);
      }
    },
    () => {
      elements.rideLocationText.textContent = "未能取得位置，請允許瀏覽器定位或在 Uber 內手動選擇上車點。";
      elements.rideAvailability.textContent = "定位被拒或暫時不可用。";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function readFormStop() {
  return {
    name: elements.stopNameInput.value.trim() || `站點 ${activeStopIndex + 1}`,
    operator: elements.operatorInput.value,
    kmbStopId: elements.kmbStopInput.value.trim(),
    ctbStopId: elements.ctbStopInput.value.trim(),
    gmbStopId: elements.gmbStopInput.value.trim(),
    routes: elements.routesInput.value.split(",").map((route) => route.trim()).filter(Boolean),
  };
}

function setMode(mode) {
  activeMode = mode;
  selectedRoute = null;
  selectedRouteStops = [];

  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  if (mode === "bus") {
    elements.mainSectionLabel.textContent = "巴士搜尋";
    elements.searchLabel.textContent = "搜尋巴士路線";
    elements.sideSectionLabel.textContent = "附近巴士站";
    elements.globalSearch.placeholder = "輸入 270A、101、尖沙咀、觀塘...";
    elements.operatorFilter.innerHTML = `
      <option value="all">全部巴士</option>
      <option value="kmb">九巴 / 龍運</option>
      <option value="ctb">城巴</option>
    `;
    elements.displayMode.disabled = false;
  }

  if (mode === "minibus") {
    elements.mainSectionLabel.textContent = "小巴搜尋";
    elements.searchLabel.textContent = "搜尋綠色小巴";
    elements.sideSectionLabel.textContent = "小巴資訊";
    elements.globalSearch.placeholder = "輸入 56K、1、58...";
    elements.operatorFilter.innerHTML = `<option value="gmb">綠色小巴</option>`;
    elements.displayMode.disabled = true;
  }

  if (mode === "taxi") {
    elements.mainSectionLabel.textContent = "叫車";
    elements.searchLabel.textContent = "叫車不需要搜尋";
    elements.sideSectionLabel.textContent = "上車點";
    elements.globalSearch.placeholder = "按定位建立上車點";
    elements.operatorFilter.innerHTML = `<option value="taxi">的士 / Uber</option>`;
    elements.displayMode.disabled = true;
  }

  elements.globalSearch.value = "";
  renderRouteResults("");
}

function wireEvents() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  elements.globalSearch.addEventListener("input", () => renderRouteResults(elements.globalSearch.value));
  elements.operatorFilter.addEventListener("change", () => renderRouteResults(elements.globalSearch.value));
  elements.refreshCatalog.addEventListener("click", () => loadCatalog(true));
  elements.locateRide.addEventListener("click", locateForRide);

  elements.stopSelect.addEventListener("change", () => {
    activeStopIndex = Number(elements.stopSelect.value);
    fillStopForm();
    renderRouteResults(elements.globalSearch.value);
  });

  elements.displayMode.addEventListener("change", () => {
    settings.mode = elements.displayMode.value;
    saveSettings();
    if (selectedRoute) openRouteStops(selectedRoute);
    else renderRows(latestRows, getActiveStop().name || "公司常用站點");
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
    settings.stops.push({ name: `新站點 ${settings.stops.length + 1}`, operator: "mixed", kmbStopId: "", ctbStopId: "", gmbStopId: "", routes: [] });
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
    selectedRoute = null;
    latestRows = demoRows;
    renderRows(latestRows, "示範資料");
    setNetworkState(false, "示範模式");
  });

  elements.toggleSettings.addEventListener("click", () => {
    elements.settingsBody.classList.toggle("is-collapsed");
  });
}

function normalize(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
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
  setMode("bus");
  updateClock();
  updateHolidayCountdown();
  loadCatalog();
  fetchWeather();
  setInterval(updateClock, 1000);
  setInterval(() => {
    if (selectedRoute) return;
    updateAll();
  }, ONE_MINUTE);
}

init();
