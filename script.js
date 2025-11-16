// Basic functionality for the suggestion system
const SUGGESTIONS_KEY = 'muni_suggestions_v1';
const MAX_CHARS = 500;

function readSuggestions() {
  try {
    return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');
  } catch (e) {
    console.error('Failed to parse suggestions', e);
    return [];
  }
}

function saveSuggestions(list) {
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(list));
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSuggestions(list) {
  const container = document.getElementById('suggestionsPreview');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="no-suggestions">
        <i class="fas fa-lightbulb"></i>
        <h3>No Suggestions Yet</h3>
        <p>Be the first to submit a suggestion and help improve our university!</p>
      </div>
    `;
    return;
  }

  // Show only latest 6 suggestions on homepage
  const recentSuggestions = list.slice(0, 6);

  container.innerHTML = recentSuggestions.map(s => {
    const statusClass = `status-${(s.status || 'pending').toString().toLowerCase().replace(/\s+/g,'-')}`;
    const statusLabel = escapeHtml((s.status || 'Pending').toString());
    const adminHTML = s.adminResponse ? `
      <div class="admin-response" aria-live="polite">
        <h4>Response from Admin</h4>
        <div>${escapeHtml(s.adminResponse)}</div>
        <small><strong>Status:</strong> ${statusLabel}</small>
      </div>
    ` : '';
    return `
      <article class="suggestion-card" aria-live="polite" data-id="${s.id}">
        <header class="suggestion-meta">
          <strong class="suggestion-tag">${escapeHtml(s.tag || 'Other')}</strong>
          <span class="suggestion-dept">${escapeHtml(s.department || 'General')}</span>
          <time datetime="${new Date(s.created).toISOString()}">${formatDate(s.created)}</time>
          <span class="suggestion-status ${statusClass}">${statusLabel}</span>
        </header>
        <p class="suggestion-text">${escapeHtml(s.text)}</p>
        ${adminHTML}
      </article>
    `;
  }).join('');
}

function updateStats(list) {
  const totalEl = document.getElementById('totalSuggestionsCount');
  const implementedEl = document.getElementById('resolvedCount');
  const deptEl = document.getElementById('departmentsCount');

  const total = list.length;
  const implemented = list.filter(s => (s.status || '').toLowerCase() === 'implemented' || (s.status || '').toLowerCase() === 'resolved').length;
  const uniqueDepartments = new Set(list.map(s => s.department)).size;

  if (totalEl) totalEl.textContent = total;
  if (implementedEl) implementedEl.textContent = implemented;
  if (deptEl) deptEl.textContent = Math.max(uniqueDepartments, 9);
}

document.addEventListener('DOMContentLoaded', () => {
  // initial render
  const suggestions = readSuggestions();
  renderSuggestions(suggestions);
  updateStats(suggestions);

  // char counter
  const textarea = document.getElementById('suggestion');
  const charCount = document.getElementById('charCount');
  if (textarea && charCount) {
    charCount.textContent = textarea.value.length;
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      if (len > MAX_CHARS) textarea.value = textarea.value.slice(0, MAX_CHARS);
      charCount.textContent = textarea.value.length;
    });
  }

  // submit handler
  const form = document.getElementById('suggestionForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const department = form.department?.value?.trim() || 'Other';
      const tag = form.tag?.value?.trim() || 'Other';
      const text = form.suggestion?.value?.trim();
      if (!text) {
        alert('Please enter a suggestion.');
        return;
      }

      const newSuggestion = {
        id: Date.now(),
        department,
        tag,
        text,
        status: 'Pending',
        adminResponse: '',
        created: Date.now()
      };

      const list = readSuggestions();
      list.unshift(newSuggestion); // newest first
      saveSuggestions(list);

      renderSuggestions(list);
      updateStats(list);

      form.reset();
      if (charCount) charCount.textContent = '0';
      form.department.focus();
      
      // Show success message
      showNotification('Suggestion submitted successfully!', 'success');
    });
  }
});

// FAQ toggle functionality
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const toggle = item.querySelector('.faq-toggle');
    
    if (question && answer && toggle) {
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-toggle').textContent = '+';
                }
            });
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
                toggle.textContent = '-';
            } else {
                item.classList.remove('active');
                toggle.textContent = '+';
            }
        });
    }
});
    
// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // Adjust for fixed header
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
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
                border-left-color: #4cd964;
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

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Export functions for admin dashboard (if needed in global scope)
window.readSuggestions = readSuggestions;
window.saveSuggestions = saveSuggestions;