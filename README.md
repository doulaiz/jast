# JAST (Just Another Search Tool)

A lightweight, single-page web app to batch-search on Google across a list of domains/URLs loaded from an Excel file, preview the top snippets, and export results back to Excel.

## Try it here:
https://doulaiz.github.io/jast/

## Prerequisite 

- User must create an Excel file (.xlsx/.xls) with a list of URLs/domains

## Usage

1. Open the app
2. Click the gear icon (⚙) to open Settings and paste:
   - Google API Key
   - Custom Search Engine (CSE) ID - There is a default value that should work for standard needs, but you can create your own
3. Choose your Excel file (.xlsx or .xls) where one column should have a list of URLs
4. Select the target sheet and column containing URLs/domains
   - The app will list the URLs as the first column in the table
5. Enter your search term and click "Search"
6. Click "Export to Excel" to download in Excel format
7. In the Export menu, you can include original colums copied from the input file to be collated to the exported one  

## Requirements

- A Google Cloud project with the "Custom Search API" enabled
- API Key and CSE ID configured in the app Settings
- Optionally: A Google Custom Search Engine (CSE) ID (cx) - There is a default value that should work for standard needs

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
