# JAST (Just Another Search Tool)

A lightweight, single-page web app to batch-search Google Custom Search across a list of domains/URLs loaded from an Excel file, preview the top snippets, and export results back to Excel.

## What it does

- Import an Excel file (.xlsx/.xls)
- Choose the sheet and column that contains URLs/domains
- Optionally, the app normalizes each URL to its FQDN (e.g., https://www.example.com -> example.com)
- Enter a search query
- Run Google Custom Search per URL with basic rate limiting
- See number of results and top snippets per URL
- Click on the snippets to open the result in a new tab
- Export the full table to an Excel file

## Features

- Excel import/export powered by SheetJS (XLSX)
- Google Custom Search JSON API integration
- Simple Settings modal to store API key, CSE ID, and snippets count
- Local persistence via localStorage (no back end)
- Progress indicator and error box with messages
- Small rate limit (600 ms per request) to avoid API throttle

## Requirements

- A Google Cloud project with the "Custom Search API" enabled
- A Google Custom Search Engine (CSE) ID (cx)
- API Key and CSE ID configured in the app Settings

## Project structure

```
jast2/
├─ index.html     # Main HTML page (links the CSS and JS)
├─ jast.css       # All styles
├─ jast.js        # All application logic
└─ README.md      # This file
```

## How to run

- Easiest: open `index.html` in your browser.
- If your browser blocks some features on the `file://` protocol, use a simple local server (optional):


## Usage

1. Open the app (index.html)
2. Click the gear icon (⚙) to open Settings and paste:
   - Google API Key
   - Custom Search Engine (CSE) ID
3. Choose your Excel file (.xlsx or .xls) where one column should have a list of URLs
4. Select the target sheet and column containing URLs/domains
   - The app will list the URLs as the first column in the table
5. Enter your search term and click "Search"
6. Click "Export to Excel" to download `jast_results.xlsx`

## Settings persistence

- The API Key, CSE ID, and snippet count are saved to `localStorage` in your browser.
- No data is sent to a server by this app (other than requests to Google APIs during search).

## Notes & limits

- Rate limiting: The app waits ~600 ms between requests (~100/min).
- The free API key from Google, will let you do 100 requests per day. So if your Excel has 50 URLs, you will be able to only do 2 searches.
- Google APIs may require proper billing setup to allow a sufficient quota.

## Troubleshooting

- No results showing:
  - Confirm API key & CSE ID in Settings
  - Ensure your CSE is configured to search the web or the domains you need
- 429 Too Many Requests:
  - Wait and try again, reduce the URL list size, or increase rate limiting
- Export not downloading:
  - Ensure the browser allows downloads; try another browser if needed

## License

This is a simple personal project template. Use at your own discretion.
