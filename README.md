# BigQuery Release Notes Dashboard & X Share

A premium, glassmorphism dark-theme web dashboard built using **Python Flask**, **HTML5**, **Vanilla CSS**, and **Vanilla JavaScript**. This application parses, structures, and presents the official Google Cloud BigQuery Release Notes, allowing you to instantly select and draft customized tweets about specific updates within X (Twitter)'s 280-character limit.

---

## 🌟 Key Features

*   **Granular Parsing**: Google's official feed groups multiple release notes under a single day's feed entry. The backend splits these daily digests into separate cards (by category: *Features*, *Issues*, *Changed*, etc.) so you can read and share individual updates.
*   **Performance Caching**: Employs an in-memory cache system (5-minute TTL) to prevent rate limits and ensure lightning-fast page loading.
*   **Manual Refreshes**: A refresh button with an active SVG spinner allows you to force a cache bypass (`?refresh=true`) and fetch the latest updates on-demand.
*   **Smart Tweet Truncation**: Select any update to tweet. The client-side logic automatically measures characters and truncates the update text summary at a word boundary to fit X's 280-character limit, prepending hashtags and appending the release notes link.
*   **Premium Dark UI**: Built with a sleek HSL-tailored dark color palette, subtle category glow outlines, keyboard search filtering, and skeleton screen animations.

---

## 📂 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask backend (caching, routing, and BeautifulSoup RSS parsing)
├── requirements.txt        # Python dependencies
├── .gitignore              # Git ignored files
├── templates/
│   └── index.html          # Semantic HTML5 dashboard skeleton and X share modal
└── static/
    ├── app.js              # State manager, timeline filters, and X intent composer
    └── style.css           # Glassmorphism dark styling rules & card design systems
```

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Python 3.10+** installed on your machine.

### 2. Setup Virtual Environment
Clone this project and initialize a Python virtual environment:
```bash
# Initialize venv
python3 -m venv .venv

# Activate venv
source .venv/bin/activate
```

### 3. Install Dependencies
Install Flask, requests, and beautifulsoup4:
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```
The application will start, binding to all network interfaces:
*   Local access: **[http://localhost:5001](http://localhost:5001)**
*   Network access: `http://<your-local-ip>:5001`

---

## 🛠️ API Documentation

### `GET /api/releases`
Fetches the release notes feed and returns parsed JSON.

*   **Query Parameters**:
    *   `refresh` (boolean, optional): If set to `true`, invalidates the in-memory cache and pulls fresh data from Google's XML feed.
*   **Sample Response**:
    ```json
    {
      "cached": true,
      "status": "success",
      "timestamp": 1781606589.880085,
      "updates": [
        {
          "date": "June 15, 2026",
          "timestamp": "2026-06-15T00:00:00-07:00",
          "type": "Feature",
          "content_html": "<p>Use Gemini Cloud Assist to analyze your SQL queries...</p>",
          "text_summary": "Use Gemini Cloud Assist to analyze your SQL queries and receive recommendations..."
        }
      ]
    }
    ```
