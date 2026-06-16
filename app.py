import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration
CACHE_DURATION = 300  # 5 minutes
cache = {
    'updates': [],
    'timestamp': 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    all_updates = []
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        updated_timestamp = updated.text.strip() if updated is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        if content_html:
            # Parse the content HTML into individual updates
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = None
            current_content_parts = []
            
            # Helper to commit a parsed update
            def add_current_update():
                if current_type and current_content_parts:
                    content_str = "".join(str(e) for e in current_content_parts).strip()
                    # Clean text summary for Tweeting
                    text_summary = BeautifulSoup(content_str, 'html.parser').get_text().strip()
                    # Standardize spaces and clean up
                    text_summary = " ".join(text_summary.split())
                    
                    all_updates.append({
                        'date': date_str,
                        'timestamp': updated_timestamp,
                        'type': current_type,
                        'content_html': content_str,
                        'text_summary': text_summary
                    })

            for element in soup.contents:
                if element.name == 'h3':
                    add_current_update()
                    current_type = element.get_text().strip()
                    current_content_parts = []
                elif element.name is not None:
                    if current_type:
                        current_content_parts.append(element)
                    else:
                        # Default to General if content appears before h3
                        current_type = "General"
                        current_content_parts.append(element)
            
            # Commit the last update
            add_current_update()
            
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache['updates'] or (now - cache['timestamp'] > CACHE_DURATION):
        try:
            updates = fetch_and_parse_feed()
            cache['updates'] = updates
            cache['timestamp'] = now
            cached = False
        except Exception as e:
            # If fetch fails and we have cached data, fall back to it
            if cache['updates']:
                return jsonify({
                    'status': 'warning',
                    'message': f"Failed to fetch fresh data ({str(e)}). Serving cached data.",
                    'updates': cache['updates'],
                    'timestamp': cache['timestamp']
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': f"Failed to fetch release notes: {str(e)}"
                }), 500
    else:
        cached = True
        
    return jsonify({
        'status': 'success',
        'updates': cache['updates'],
        'timestamp': cache['timestamp'],
        'cached': cached
    })

if __name__ == '__main__':
    # Bind to all interfaces (useful for local testing)
    app.run(host='0.0.0.0', port=5001, debug=True)
