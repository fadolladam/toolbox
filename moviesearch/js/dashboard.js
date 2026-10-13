// Dashboard navigation & state persistence for Movie & TV Series Browser
document.addEventListener('DOMContentLoaded', function() {
    // Initialize movie & series functionality
    if (typeof window.initMovies === 'function') {
        window.initMovies();
    }
    if (typeof window.initSeries === 'function') {
        window.initSeries();
    }
    
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.content-section');

    function activateTab(targetId) {
        if (!targetId) return;
        const targetSection = document.getElementById(targetId);
        if (!targetSection) return;

        sidebarLinks.forEach(l => {
            if (l.getAttribute('data-target') === targetId) {
                l.classList.add('active');
            } else {
                l.classList.remove('active');
            }
        });

        contentSections.forEach(s => {
            if (s.id === targetId) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        // Persist state in URL hash and LocalStorage
        if (window.location.hash !== `#${targetId}`) {
            history.replaceState(null, '', `#${targetId}`);
        }
        localStorage.setItem('activeTab', targetId);
    }
    window.activateTab = activateTab;

    // Handle sidebar navigation clicks
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            activateTab(targetId);
        });
    });

    // Restore active tab on page refresh or load
    function restoreSavedTab() {
        const hashTab = window.location.hash.replace('#', '').trim();
        const storedTab = localStorage.getItem('activeTab');
        
        if (hashTab && document.getElementById(hashTab)) {
            activateTab(hashTab);
        } else if (storedTab && document.getElementById(storedTab)) {
            activateTab(storedTab);
        } else {
            activateTab('movie-search');
        }
    }

    restoreSavedTab();

    // Listen to hash changes (e.g. browser back/forward buttons)
    window.addEventListener('hashchange', function() {
        const hashTab = window.location.hash.replace('#', '').trim();
        if (hashTab && document.getElementById(hashTab)) {
            activateTab(hashTab);
        }
    });
});
