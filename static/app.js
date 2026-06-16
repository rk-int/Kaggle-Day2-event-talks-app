document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const resultsCount = document.getElementById('results-count');
    const themeToggle = document.getElementById('theme-toggle');
    const exportBtn = document.getElementById('export-btn');
    
    // Modal DOM Elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetConfirmBtn = document.getElementById('tweet-confirm-btn');
    
    // Constants
    const X_LIMIT = 280;
    const RELEASE_NOTES_URL = "https://cloud.google.com/bigquery/docs/release-notes";
    
    // Initialize
    initTheme();
    fetchReleases();
    
    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().strip();
        renderFeed();
    });
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            renderFeed();
        });
    });
    
    // Modal Event Listeners
    modalClose.addEventListener('click', closeTweetModal);
    modalCancel.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    tweetConfirmBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'width=600,height=400,resizable=yes');
        closeTweetModal();
    });
    
    // Helper to string strip
    if (!String.prototype.strip) {
        String.prototype.strip = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }
    
    // Fetch Data
    async function fetchReleases(force = false) {
        setLoading(true);
        renderSkeletons();
        
        try {
            const url = force ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.status === 'error') throw new Error(data.message);
            
            allUpdates = data.updates || [];
            
            // Render
            updateFilterCounts();
            renderFeed();
            
        } catch (error) {
            console.error('Error fetching release notes:', error);
            renderErrorState(error.message);
        } finally {
            setLoading(false);
        }
    }
    
    // Loading State
    function setLoading(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
    
    // Render Skeletons
    function renderSkeletons() {
        let html = '';
        for (let i = 0; i < 3; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="card-header">
                        <div class="skeleton-line skeleton-badge"></div>
                        <div class="skeleton-line skeleton-date"></div>
                    </div>
                    <div class="skeleton-line skeleton-title"></div>
                    <div class="card-body">
                        <div class="skeleton-line skeleton-para"></div>
                        <div class="skeleton-line skeleton-para"></div>
                        <div class="skeleton-line skeleton-para"></div>
                    </div>
                </div>
            `;
        }
        feedContainer.innerHTML = html;
    }
    
    // Render Error
    function renderErrorState(message) {
        feedContainer.innerHTML = `
            <div class="state-message state-error">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div class="state-title">Failed to load updates</div>
                <div class="state-desc">${message || 'Could not retrieve BigQuery release notes. Please check your network connection and try again.'}</div>
                <button id="retry-btn" class="btn btn-primary">Try Again</button>
            </div>
        `;
        document.getElementById('retry-btn')?.addEventListener('click', () => fetchReleases(true));
    }
    
    // Update Counts in Sidebar
    function updateFilterCounts() {
        const counts = { all: allUpdates.length };
        
        allUpdates.forEach(update => {
            const type = update.type.toLowerCase();
            counts[type] = (counts[type] || 0) + 1;
        });
        
        filterChips.forEach(chip => {
            const filter = chip.getAttribute('data-filter');
            const badge = chip.querySelector('.chip-count');
            if (badge) {
                badge.textContent = counts[filter] || 0;
            }
        });
    }
    
    // Filter and Render Feed
    function renderFeed() {
        if (allUpdates.length === 0) {
            feedContainer.innerHTML = `
                <div class="state-message state-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div class="state-title">No release notes found</div>
                    <div class="state-desc">We couldn't find any release notes. They might be temporarily unavailable.</div>
                </div>
            `;
            resultsCount.textContent = '0 updates';
            return;
        }
        
        // Filter logic
        const filtered = allUpdates.filter(update => {
            const matchesType = activeFilter === 'all' || update.type.toLowerCase() === activeFilter;
            const matchesSearch = !searchQuery || 
                update.text_summary.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });
        
        resultsCount.textContent = `${filtered.length} update${filtered.length === 1 ? '' : 's'}`;
        
        if (filtered.length === 0) {
            feedContainer.innerHTML = `
                <div class="state-message state-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <div class="state-title">No results match your criteria</div>
                    <div class="state-desc">Try clearing your search query or selecting a different category filter.</div>
                </div>
            `;
            return;
        }
        
        // Build HTML
        let html = '';
        filtered.forEach((update, idx) => {
            html += `
                <div class="update-card" data-type="${escapeHtml(update.type)}" style="animation: fadeInUp 0.4s ease forwards; animation-delay: ${idx * 0.05}s;">
                    <div class="card-header">
                        <span class="type-badge">
                            <span class="badge-dot"></span>
                            ${escapeHtml(update.type)}
                        </span>
                        <span class="update-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${escapeHtml(update.date)}
                        </span>
                    </div>
                    <div class="card-body">
                        ${update.content_html}
                    </div>
                    <div class="card-actions">
                        <button class="copy-btn" data-index="${allUpdates.indexOf(update)}" title="Copy summary to clipboard">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                        <button class="tweet-btn" data-index="${allUpdates.indexOf(update)}">
                            <svg viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Share on X
                        </button>
                    </div>
                </div>
            `;
        });
        
        feedContainer.innerHTML = html;
        
        // Attach click handlers to tweet buttons
        document.querySelectorAll('.tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                openTweetModal(allUpdates[idx]);
            });
        });

        // Attach click handlers to copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const update = allUpdates[idx];
                navigator.clipboard.writeText(update.text_summary).then(() => {
                    btn.classList.add('copied');
                    const textSpan = btn.querySelector('span');
                    const originalText = textSpan.textContent;
                    textSpan.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        textSpan.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                });
            });
        });
    }
    
    // Tweet Draft & Modal management
    function openTweetModal(update) {
        // Base Draft Template Structure:
        // New #BigQuery update ({Date}):
        // {Type} - {Summary}
        // Details: {URL}
        
        const prefix = `New #BigQuery update (${update.date}):\n\n${update.type} — `;
        const suffix = `\n\nDetails: ${RELEASE_NOTES_URL}`;
        
        const baseLength = prefix.length + suffix.length;
        const availableSpace = X_LIMIT - baseLength;
        
        let draftSummary = update.text_summary;
        
        // Truncate summary if it exceeds space
        if (draftSummary.length > availableSpace) {
            // Cut at availableSpace - 3 (for ellipsis)
            let truncated = draftSummary.slice(0, availableSpace - 3);
            // Try to truncate at a space boundary so we don't chop words
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > availableSpace / 2) { // only cut if it's reasonable
                truncated = truncated.slice(0, lastSpace);
            }
            draftSummary = truncated + '...';
        }
        
        const tweetText = `${prefix}${draftSummary}${suffix}`;
        
        tweetTextarea.value = tweetText;
        updateCharCounter();
        
        tweetModal.classList.add('active');
        tweetTextarea.focus();
        // Place cursor at the end
        tweetTextarea.setSelectionRange(tweetText.length, tweetText.length);
    }
    
    function closeTweetModal() {
        tweetModal.classList.remove('active');
    }
    
    function updateCharCounter() {
        const text = tweetTextarea.value;
        const currentLength = text.length;
        const remaining = X_LIMIT - currentLength;
        
        charCounter.textContent = remaining;
        
        // Reset classes
        charCounter.className = 'char-counter';
        
        if (remaining < 0) {
            charCounter.classList.add('danger');
            tweetConfirmBtn.disabled = true;
            tweetConfirmBtn.style.opacity = 0.5;
            tweetConfirmBtn.style.cursor = 'not-allowed';
        } else {
            if (remaining <= 20) {
                charCounter.classList.add('warning');
            }
            tweetConfirmBtn.disabled = false;
            tweetConfirmBtn.style.opacity = 1;
            tweetConfirmBtn.style.cursor = 'pointer';
        }
    }
    
    // Utilities
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Theme Switcher Logic
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
    }

    // Export Currently Filtered Updates to CSV
    function exportToCSV() {
        if (allUpdates.length === 0) return;

        // Apply current filters
        const filtered = allUpdates.filter(update => {
            const matchesType = activeFilter === 'all' || update.type.toLowerCase() === activeFilter;
            const matchesSearch = !searchQuery || 
                update.text_summary.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });

        if (filtered.length === 0) {
            alert('No data matches the current filters to export.');
            return;
        }

        const csvRows = [];
        // Header Row
        csvRows.push(['Date', 'Category', 'Update Content'].map(h => `"${h}"`).join(','));

        // Data Rows
        filtered.forEach(item => {
            const dateVal = item.date.replace(/"/g, '""');
            const typeVal = item.type.replace(/"/g, '""');
            const summaryVal = item.text_summary.replace(/"/g, '""');
            csvRows.push(`"${dateVal}","${typeVal}","${summaryVal}"`);
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `BigQuery_Release_Notes_${activeFilter}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
