// Admin Dashboard Functionality
const SUGGESTIONS_KEY = 'muni_suggestions_v1';
let currentSuggestionId = null;

// Check admin authentication
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const loginTime = parseInt(localStorage.getItem('adminLoginTime'));
    const currentTime = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!isLoggedIn || currentTime - loginTime > twentyFourHours) {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

// Read suggestions from localStorage
function readSuggestions() {
    try {
        const raw = localStorage.getItem(SUGGESTIONS_KEY);
        if (raw) {
            return JSON.parse(raw);
        }

        // Fallback: scan for legacy keys containing "suggestion" and migrate first valid array
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (/suggestion/i.test(key) && key !== SUGGESTIONS_KEY) {
                try {
                    const candidate = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(candidate)) {
                        console.warn(`Migrating suggestions from "${key}" to "${SUGGESTIONS_KEY}"`);
                        saveSuggestions(candidate);
                        return candidate;
                    }
                } catch (err) {
                    // ignore parse errors
                }
            }
        }

        return [];
    } catch (e) {
        console.error('Failed to read suggestions', e);
        return [];
    }
}

// Save suggestions to localStorage
function saveSuggestions(list) {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list));
}

// Format date for display
function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString();
}

// Escape HTML to prevent XSS
function escapeHtml(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Load and display suggestions
function loadSuggestions() {
    const suggestions = readSuggestions() || [];
    const grid = document.getElementById('suggestionsGrid');
    if (!grid) return;

    console.log('Loading suggestions:', suggestions);

    if (!suggestions || suggestions.length === 0) {
        grid.innerHTML = `
            <div class="no-suggestions">
                <i class="fas fa-lightbulb"></i>
                <h3>No Suggestions</h3>
                <p>There are no suggestions yet.</p>
                <div style="margin-top:10px;">
                    <button type="button" class="btn-primary" onclick="addSampleSuggestions()">Add Test Data</button>
                </div>
            </div>
        `;
        return;
    }

    // Sort newest first
    const sorted = suggestions.slice().sort((a, b) => (b.created || 0) - (a.created || 0));

    grid.innerHTML = sorted.map(suggestion => {
        const statusClass = (suggestion.status || 'Pending').toString().toLowerCase().replace(/\s+/g, '-'); // produces "in-review", "implemented", etc.
        const hasResponse = suggestion.adminResponse && suggestion.adminResponse.trim() !== '';

        return `
            <div class="suggestion-card-admin" data-id="${suggestion.id}">
                <div class="suggestion-header-admin">
                    <div class="suggestion-meta-admin">
                        <span class="department-badge">${escapeHtml(suggestion.department || 'General')}</span>
                        <span class="suggestion-date">${formatDate(suggestion.created)}</span>
                    </div>
                    <div class="status-badge ${statusClass}">${escapeHtml(suggestion.status || 'Pending')}</div>
                </div>

                <div class="suggestion-content">
                    <p class="suggestion-text">${escapeHtml(suggestion.text)}</p>
                </div>

                <div class="suggestion-actions">
                    <button type="button" class="btn-sm" onclick="openResponseModal(${suggestion.id})">
                        <i class="fas fa-reply"></i> Respond
                    </button>
                    <button type="button" class="btn-sm btn-danger" onclick="openDeleteModal(${suggestion.id})">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>

                ${hasResponse ? `<div class="admin-response-snippet"><strong>Admin:</strong> ${escapeHtml(suggestion.adminResponse)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Open response modal
function openResponseModal(suggestionId) {
    const suggestions = readSuggestions();
    const suggestion = suggestions.find(s => s.id == suggestionId);
    
    if (!suggestion) {
        showNotification('Suggestion not found!', 'error');
        return;
    }
    
    currentSuggestionId = suggestionId;
    
    // Populate modal with suggestion data
    document.getElementById('previewDepartment').textContent = suggestion.department || 'General';
    document.getElementById('previewText').textContent = suggestion.text;
    document.getElementById('adminResponse').value = suggestion.adminResponse || '';
    document.getElementById('responseStatus').value = suggestion.status || 'Pending';
    
    // Show modal
    document.getElementById('responseModal').style.display = 'block';
}

// Close response modal
function closeResponseModal() {
    document.getElementById('responseModal').style.display = 'none';
    currentSuggestionId = null;
}

// Submit response
function submitResponse() {
    const responseText = document.getElementById('adminResponse').value.trim();
    const newStatus = document.getElementById('responseStatus').value;
    
    if (!responseText) {
        alert('Please enter a response.');
        return;
    }

    const suggestions = readSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id == currentSuggestionId);
    
    if (suggestionIndex !== -1) {
        suggestions[suggestionIndex].adminResponse = responseText;
        suggestions[suggestionIndex].status = newStatus;
        saveSuggestions(suggestions);
        
        // Reload suggestions
        loadSuggestions();
        
        // Close modal
        closeResponseModal();
        
        // Show success message
        showNotification('Response submitted successfully!', 'success');
    } else {
        showNotification('Suggestion not found!', 'error');
    }
}

// Update suggestion status
function updateStatus(suggestionId, newStatus) {
    const suggestions = readSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id == suggestionId);
    
    if (suggestionIndex !== -1) {
        suggestions[suggestionIndex].status = newStatus;
        saveSuggestions(suggestions);
        loadSuggestions();
        
        showNotification(`Suggestion marked as ${newStatus}`, 'success');
    } else {
        showNotification('Suggestion not found!', 'error');
    }
}

// Open delete confirmation modal
function openDeleteModal(suggestionId) {
    const suggestions = readSuggestions();
    const suggestion = suggestions.find(s => s.id == suggestionId);
    
    if (!suggestion) {
        showNotification('Suggestion not found!', 'error');
        return;
    }
    
    currentSuggestionId = suggestionId;
    
    // Populate delete modal
    document.getElementById('deletePreviewDepartment').textContent = suggestion.department || 'General';
    document.getElementById('deletePreviewText').textContent = suggestion.text;
    
    // Show modal
    document.getElementById('deleteModal').style.display = 'block';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    currentSuggestionId = null;
}

// Confirm and delete suggestion
function confirmDelete() {
    const suggestions = readSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id == currentSuggestionId);
    
    if (suggestionIndex !== -1) {
        // Remove the suggestion
        suggestions.splice(suggestionIndex, 1);
        saveSuggestions(suggestions);
        
        // Reload suggestions
        loadSuggestions();
        
        // Close modal
        closeDeleteModal();
        
        // Show success message
        showNotification('Suggestion deleted successfully!', 'success');
    } else {
        showNotification('Suggestion not found!', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `admin-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add notification styles if not already added
    if (!document.querySelector('#admin-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'admin-notification-styles';
        styles.textContent = `
            .admin-notification {
                position: fixed;
                top: 100px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #800000;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 1rem;
                max-width: 400px;
                animation: slideInRight 0.3s ease;
            }
            .notification-success {
                border-left-color: #28a745;
            }
            .notification-error {
                border-left-color: #dc3545;
            }
            .notification-info {
                border-left-color: #17a2b8;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 1;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #666;
                padding: 0.25rem;
            }
            .notification-close:hover {
                color: #333;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Get appropriate icon for notification type
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info':
        default: return 'fa-info-circle';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    window.location.href = 'admin-login.html';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const responseModal = document.getElementById('responseModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (event.target === responseModal) {
        closeResponseModal();
    }
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
}

// Test function to add sample data (for debugging)
function addSampleSuggestions() {
    const sampleSuggestions = [
        {
            id: Date.now() - 1000,
            department: "Faculty of Technoscience",
            tag: "Infrastructure",
            text: "The labs are too small for the number of students we have. We need larger lab spaces or additional lab sessions.",
            status: "Implemented",
            adminResponse: "Thank you for your suggestion. We have allocated additional lab space and extended lab hours starting next semester.",
            created: Date.now() - 86400000 // 1 day ago
        },
        {
            id: Date.now() - 2000,
            department: "Faculty of Science",
            tag: "Academic",
            text: "We need more research materials in the library for advanced physics courses.",
            status: "In Review",
            adminResponse: "",
            created: Date.now() - 172800000 // 2 days ago
        },
        {
            id: Date.now() - 3000,
            department: "Library",
            tag: "Student Welfare",
            text: "Extend library hours during exam periods to accommodate students who prefer late-night studying.",
            status: "Pending",
            adminResponse: "",
            created: Date.now() - 259200000 // 3 days ago
        }
    ];

    saveSuggestions(sampleSuggestions);
    loadSuggestions();
    showNotification('Sample suggestions added for testing!', 'info');
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!checkAdminAuth()) return;

    // Load suggestions
    loadSuggestions();

    // Add debug button if no suggestions exist (for testing)
    const suggestions = readSuggestions();
    if (suggestions.length === 0 && typeof addSampleSuggestions === 'function') {
        // leave UI button in place via loadSuggestions; no extra action required
    }

    // Auto-logout after 24 hours
    setInterval(() => {
        if (!checkAdminAuth()) {
            // if auth expired, redirect handled by checkAdminAuth
        }
    }, 60 * 60 * 1000); // Check every hour
});