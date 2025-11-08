async function loadData() {
  const { timeData } = await chrome.storage.local.get("timeData");
  const summary = document.getElementById("summary");

  if (!timeData || Object.keys(timeData).length === 0) {
    summary.innerHTML = "<p>No data tracked yet.</p>";
    return;
  }

  let html = "<ul>";
  for (const [domain, info] of Object.entries(timeData)) {
    const mins = Math.floor(info.totalTime / 60);
    const secs = info.totalTime % 60;
    html += `<li><strong>${domain}</strong>" ${mins}m ${secs}s</li>`;
  }
  html += "</ul>";
  summary.innerHTML = html;
}

document.getElementById("exportBtn").addEventListener("click", async () => {
  const { timeData } = await chrome.storage.local.get("timeData");
  if (!timeData) return alert("No data to export");

  const json = JSON.stringify(timeData, null, 2);
  const url = "data:application/json;charset=utf-8," + encodeURIComponent(json);

  await chrome.downloads.download({
    url,
    filename: `tab-tracker-${new Date().toISOString().split("T")[0]}.json`,
    saveAs: false,
  });

  alert("Data exported successfully!");
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  const confirmClear = confirm(
    "Are you sure you want to clear all tracked Data?",
  );
  if (!confirmClear) return;
  await chrome.storage.local.set({ timeData: {} });
  loadData();
});

loadData();
