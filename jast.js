// Clear file input on page reload
document.addEventListener("DOMContentLoaded", function () {
  const excelInput = document.getElementById("excelFile");
  if (excelInput) excelInput.value = "";
});

// Show/hide sheet/column selects based on Excel file loaded
const sheetSelect = document.getElementById("sheetSelect");
const columnSelect = document.getElementById("columnSelect");
document.getElementById("excelFile")?.addEventListener("change", function () {
  if (this.files.length) {
    sheetSelect.style.display = "";
    columnSelect.style.display = "";
  } else {
    sheetSelect.style.display = "none";
    columnSelect.style.display = "none";
  }
});

const infoBtn = document.getElementById("infoBtn");
const infoModal = document.getElementById("infoModal");
const closeInfoBtn = document.getElementById("closeInfoBtn");
infoBtn.onclick = () => {
  infoModal.style.display = "block";
};
closeInfoBtn.onclick = () => {
  infoModal.style.display = "none";
};
window.addEventListener("click", function (event) {
  if (event.target == infoModal) infoModal.style.display = "none";
});

// ESC key closes modals
window.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.getElementById("settingsModal").style.display = "none";
    document.getElementById("infoModal").style.display = "none";
  }
});

let workbook;
let urls = [];

// Load saved settings
let apiKey = localStorage.getItem("googleApiKey") || "";
let cx = localStorage.getItem("googleCx") || "";
let snippetCount = parseInt(localStorage.getItem("snippetCount") || "5", 10);

// Settings modal logic
const modal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

settingsBtn.onclick = () => {
  document.getElementById("apiKeyInput").value = apiKey;
  document.getElementById("cxInput").value = cx;
  document.getElementById("snippetCountInput").value = snippetCount;
  modal.style.display = "block";
};

saveSettingsBtn.onclick = () => {
  apiKey = document.getElementById("apiKeyInput").value.trim();
  cx = document.getElementById("cxInput").value.trim();
  snippetCount =
    parseInt(document.getElementById("snippetCountInput").value.trim(), 10) ||
    5;

  localStorage.setItem("googleApiKey", apiKey);
  localStorage.setItem("googleCx", cx);
  localStorage.setItem("snippetCount", snippetCount);

  modal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// Excel file change
const excelFileEl = document.getElementById("excelFile");
excelFileEl.onchange = function () {
  const fileInput = excelFileEl;
  if (!fileInput.files.length) {
    alert("Please select an Excel file first.");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    workbook = XLSX.read(data, { type: "array" });
    const sheetSelect = document.getElementById("sheetSelect");
    sheetSelect.innerHTML = "";
    workbook.SheetNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sheetSelect.appendChild(opt);
    });
    loadColumns();
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
};

document.getElementById("sheetSelect").onchange = loadColumns;

function loadColumns() {
  const sheetName = document.getElementById("sheetSelect").value;
  if (!sheetName) return;
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const firstRow = json[0];
  const colSelect = document.getElementById("columnSelect");
  colSelect.innerHTML = "";
  firstRow.forEach((colName, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = colName || `Column ${idx + 1}`;
    colSelect.appendChild(opt);
  });
  extractUrls();
}

document.getElementById("columnSelect").onchange = extractUrls;

function extractUrls() {
  const sheetName = document.getElementById("sheetSelect").value;
  const colIndex = parseInt(document.getElementById("columnSelect").value);
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Helper to extract FQDN from a URL
  function getFQDN(url) {
    try {
      let hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  urls = json
    .slice(1)
    .map((row) => row[colIndex])
    .filter((u) => !!u)
    .map(getFQDN);
  console.log("Extracted URLs:", urls);

  // Create table with only the first column (URLs)
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  const theadRow = document.getElementById("resultsHeader");
  theadRow.innerHTML = `<th>URL Used</th>`;
  tbody.innerHTML = "";
  urls.forEach((url) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${url}</td>`;
    tbody.appendChild(row);
  });
  table.style.display = "table";
}

// Search button
const searchBtn = document.getElementById("searchBtn");
searchBtn.onclick = async function (event) {
  event.preventDefault();
  const query = document.getElementById("searchQuery").value.trim();
  if (!query) {
    alert("Please enter a search term.");
    return;
  }
  if (!urls.length) {
    alert("No URLs loaded from Excel.");
    return;
  }
  if (!apiKey || !cx) {
    alert("Please set your API Key and Custom Search Engine ID in Settings.");
    return;
  }

  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  const theadRow = document.getElementById("resultsHeader");

  // Build header dynamically
  theadRow.innerHTML = `<th>URL Used</th><th># of Results</th>`;
  for (let i = 1; i <= snippetCount; i++) {
    theadRow.innerHTML += `<th> </th>`;
  }

  tbody.innerHTML = "";
  table.style.display = "table";

  const spinnerContainer = document.getElementById("spinnerContainer");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  spinnerContainer.style.display = "flex";
  progressText.textContent = `0 / ${urls.length}`;
  progressFill.style.width = "0%";

  let completed = 0;

  for (const url of urls) {
    // Rate limit: max 100 requests per minute (1 request every 600ms)
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(
      query
    )}&siteSearch=${encodeURIComponent(url)}`;

    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const res = await fetch(searchUrl);
      if (res.status === 429) {
        showError(
          "Google says: Too many requests (error 429). Please check your API billing or try again later."
        );
        throw new Error("Rate limit exceeded");
      }
      const data = await res.json();

      const numResults = data.searchInformation?.totalResults || 0;
      const snippets = data.items
        ? data.items.slice(0, snippetCount).map((i) => ({
            html: i.htmlSnippet,
            link: i.link,
          }))
        : [];

      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${url}</td>
            <td>${numResults}</td>
            ${Array.from({ length: snippetCount }, (_, i) =>
              snippets[i]
                ? `<td class="clickable-snippet" onclick="window.open('${snippets[i].link}', '_blank')">
                    <div>${snippets[i].html}</div>
                    <div class="snippet-link">
                     <a href="${snippets[i].link}" target="_blank" >${snippets[i].link}</a>
                    </div>
                  </td>`
                : `<td></td>`
            ).join("")}
          `;
      tbody.appendChild(row);
    } catch (err) {
      console.error("Error fetching for URL:", url, err);
      const row = document.createElement("tr");
      row.innerHTML = `<td>${url}</td><td colspan="${
        snippetCount + 1
      }">Error fetching results</td>`;
      tbody.appendChild(row);
    }
    completed++;
    progressText.textContent = `${completed} / ${urls.length}`;
    progressFill.style.width = `${(completed / urls.length) * 100}%`;
  }

  spinnerContainer.style.display = "none";
  document.getElementById("exportBtn").style.display = "inline-block";
};

// Export table to Excel
const exportBtn = document.getElementById("exportBtn");
exportBtn.onclick = function () {
  event.preventDefault();
  const table = document.getElementById("resultsTable");
  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "jast_results.xlsx");
};

// Error box helper
function showError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.style.display = "block";
  setTimeout(() => {
    errorBox.style.display = "none";
  }, 6000);
}
