// Clear file input on page reload
document.addEventListener("DOMContentLoaded", function () {
   const excelInput = document.getElementById("excelFile");
   if (excelInput) excelInput.value = "";
   // Populate search history datalist on load
   populateSearchHistory();
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

// Modal helpers to keep only one open at a time
function getAllModals() {
   const ids = ["settingsModal", "infoModal", "exportModal"];
   return ids
      .map((id) => document.getElementById(id))
      .filter((el) => !!el);
}

function closeAllModals() {
   getAllModals().forEach((m) => (m.style.display = "none"));
}

function openModal(modalEl) {
   closeAllModals();
   modalEl.style.display = "block";
}

infoBtn.onclick = () => openModal(infoModal);
closeInfoBtn.onclick = () => {
   infoModal.style.display = "none";
};
// Close on backdrop click (generic)
window.addEventListener("click", function (event) {
   const isBackdrop = getAllModals().some((m) => event.target === m);
   if (isBackdrop) closeAllModals();
});

// ESC key closes modals
window.addEventListener("keydown", function (event) {
   if (event.key === "Escape") {
      closeAllModals();
   }
});

let workbook;
let urls = [];
let originalSheetJson = null; // cache of original Excel sheet (rows as arrays)

// ----- Search history (localStorage) -----
const HISTORY_KEY = "searchHistory";
const HISTORY_LIMIT = 15;

function getSearchHistory() {
   try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
   } catch {
      return [];
   }
}

function saveSearchHistory(list) {
   try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
   } catch {
      // ignore quota errors
   }
}

function addToSearchHistory(query) {
   const q = (query || "").trim();
   if (!q) return;
   let history = getSearchHistory();
   // remove if exists then unshift to keep most-recent first
   history = history.filter((item) => item.toLowerCase() !== q.toLowerCase());
   history.unshift(q);
   if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT);
   saveSearchHistory(history);
}

function populateSearchHistory() {
   const dataList = document.getElementById("searchHistoryList");
   if (!dataList) return;
   dataList.innerHTML = "";
   const history = getSearchHistory();
   history.forEach((q) => {
      const opt = document.createElement("option");
      opt.value = q;
      dataList.appendChild(opt);
   });
}

// Load saved settings
let apiKey = localStorage.getItem("googleApiKey") || "";
let cx = localStorage.getItem("googleCx") || "4aee28d38fc98c487"; // Default value of a working Cx
let snippetCount = parseInt(localStorage.getItem("snippetCount") || "5", 10);

// Settings modal logic
const modal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

settingsBtn.onclick = () => {
   document.getElementById("apiKeyInput").value = apiKey;
   document.getElementById("cxInput").value = cx;
   document.getElementById("snippetCountInput").value = snippetCount;
   openModal(modal);
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
   originalSheetJson = json;
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
   // Remember query in history
   addToSearchHistory(query);
   populateSearchHistory();
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
               ? `<td>
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
         row.innerHTML = `<td>${url}</td><td colspan="${snippetCount + 1
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

// Export flow with modal options
const exportBtn = document.getElementById("exportBtn");
const exportModal = document.getElementById("exportModal");
const exportFilenameInput = document.getElementById("exportFilename");
const exportColumnsContainer = document.getElementById("exportColumnsContainer");
const cancelExportBtn = document.getElementById("cancelExportBtn");
const confirmExportBtn = document.getElementById("confirmExportBtn");

exportBtn.onclick = function (event) {
   event.preventDefault();
   if (!document.getElementById("resultsTable")?.rows?.length) {
      showError("No results to export yet.");
      return;
   }
   // Populate filename default
   const query = document.getElementById("searchQuery").value.trim().replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
   const now = new Date();
   const pad = (n) => n.toString().padStart(2, "0");
   const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
   exportFilenameInput.value = `Jast_Result_${dateStr}_${query}.xlsx`;

   // Populate columns from original Excel
   exportColumnsContainer.innerHTML = "";
   try {
      const header = originalSheetJson && originalSheetJson[0] ? originalSheetJson[0] : [];
      if (!header.length) {
         const note = document.createElement("div");
         note.textContent = "No original Excel loaded or header is empty.";
         exportColumnsContainer.appendChild(note);
      } else {
         header.forEach((name, idx) => {
            const id = `exp_col_${idx}`;
            const wrapper = document.createElement("div");
            wrapper.className = "export-column-option";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.id = id;
            cb.value = idx;
            cb.checked = false;
            cb.className = "export-column-checkbox";
            const label = document.createElement("label");
            label.htmlFor = id;
            label.textContent = name || `Column ${idx + 1}`;
            label.className = "export-column-label";
            wrapper.appendChild(label);
            wrapper.appendChild(cb);
            exportColumnsContainer.appendChild(wrapper);
         });
      }
   } catch (e) {
      exportColumnsContainer.textContent = "Unable to load columns.";
   }
   openModal(exportModal);
};

cancelExportBtn.onclick = () => closeAllModals();

confirmExportBtn.onclick = function () {
   const filenameRaw = (exportFilenameInput.value || "Jast_Results.xlsx").trim();
   const filename = filenameRaw.endsWith(".xlsx") ? filenameRaw : `${filenameRaw}.xlsx`;

   const table = document.getElementById("resultsTable");

   // Convert table to array of arrays (object array of arrays)
   const rows = Array.from(table.querySelectorAll("tr"));
   const tableData = rows.map(row =>
      Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent.replace(/\s+/g, " ").trim())
   );

   console.log("table data", tableData);

   const searchedText = document.getElementById("searchQuery").value.trim();

   tableData.unshift(["Searched terms:", searchedText]);


   // Insert the Extra columns
   const selectedIdx = Array.from(exportColumnsContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map((cb) => parseInt(cb.value, 10))
      .filter((n) => !Number.isNaN(n));
   const extraColSize = selectedIdx.length;

   if (selectedIdx.length && Array.isArray(originalSheetJson) && originalSheetJson.length) {
      const filtered = originalSheetJson.map((row) => selectedIdx.map((i) => row?.[i]));
      const header = selectedIdx.map((i) => (originalSheetJson[0]?.[i] || `Column ${i + 1}`));
      if (filtered.length) filtered[0] = header;

      for (let i = 0; i < filtered.length; i++) {
         const resultRow = tableData[i + 1] ? tableData[i + 1].slice() : [];
         const newRow = [
            ...filtered[i],
            " ",
            ...resultRow
         ];
         tableData[i + 1] = newRow;
      }
   }

   // Format the document
   const resultsSheet = XLSX.utils.aoa_to_sheet(tableData);
   // Make the second row (index 1) bold
   if (tableData.length > 1) {
      const secondRow = tableData[1];
      for (let c = 0; c < secondRow.length; c++) {
         const cellRef = XLSX.utils.encode_cell({ r: 1, c });
         if (!resultsSheet[cellRef]) continue;
         if (!resultsSheet[cellRef].s) resultsSheet[cellRef].s = {};
         resultsSheet[cellRef].s.font = { bold: true };
      }
   }

   if (!resultsSheet["!cols"]) resultsSheet["!cols"] = [];
   for (let i = 0; i < extraColSize; i++) {
      resultsSheet["!cols"][i] = { wch: 10 };
   }
   resultsSheet["!cols"][extraColSize] = { wch: 3 };
   resultsSheet["!cols"][extraColSize + 1] = { wch: 15 };
   resultsSheet["!cols"][extraColSize + 2] = { wch: 15 };
   if (tableData.length > 1 && !isNaN(snippetCount)) {
      for (let i = 0; i < snippetCount; i++) {
         resultsSheet["!cols"][i + 3 + extraColSize] = { wch: 50 };
      }
   }

   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, resultsSheet, "Results");

   XLSX.writeFile(wb, filename);
   closeAllModals();
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

document.getElementById('wbaLink').onclick = function () {
   window.open('https://www.worldbenchmarkingalliance.org/', '_blank');
};

document.getElementById('googleApiSite').onclick = function () {
   window.open('https://developers.google.com/custom-search/v1/overview#prerequisites', '_blank');
};

