let activeTabId = null;
let activeDomain = null;
let startTime = null;
let isWindowFocused = true;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

async function recordTimeSpent() {
  if (!activeDomain || !startTime) return;

  const duration = Math.floor((Date.now() - startTime) / 1000);

  if (duration < 1) return;

  const data = (await chrome.storage.local.get("timeData")).timeData || {};

  if (!data[activeDomain]) data[activeDomain] = { totalTime: 0, visits: [] };

  data[activeDomain].totalTime += duration;
  data[activeDomain].visits.push({
    start: startTime,
    end: Date.now(),
    duration,
  });

  await chrome.storage.local.set({ timeData: data });
  console.log("Active domain:", activeDomain, "duration:", duration);
}

async function handleTabChange(tabId) {
  await recordTimeSpent();

  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.url || tab.incognito) {
    activeDomain = null;
    startTime = null;
    return;
  }

  activeTabId = tabId;
  activeDomain = getDomain(tab.url);
  startTime = Date.now();
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!isWindowFocused) return;
  await handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url && isWindowFocused) {
    handleTabChange(tabId);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    isWindowFocused = false;
    await recordTimeSpent();
  } else {
    isWindowFocused = true;
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) await handleTabChange(tab.id);
  }
});

setInterval(async () => {
  await recordTimeSpent();
  startTime = Date.now();
}, 60 * 1000);

setInterval(
  async () => {
    await exportData();
  },
  30 * 60 * 1000,
);

async function exportData() {
  const { timeData } = await chrome.storage.local.get("timeData");
  if (!timeData) return;

  const json = JSON.stringify(timeData, null, 2);

  const url = "data:application/json;charset=utf-8," + encodeURIComponent(json);

  chrome.downloads.download({
    url,
    filename: `tab-tracker-${new Date().toISOString().split("T")[0]}.json`,
    saveAs: false,
  });
}

chrome.runtime.onSuspend.addListener(async () => {
  await recordTimeSpent();
});
