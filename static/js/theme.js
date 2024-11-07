document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');
    
    // Theme configurations
    const themes = {
        dark: {
            '--primary-bg': '#212529',
            '--secondary-bg': '#343a40',
            '--text-color': '#f8f9fa',
            '--border-color': '#495057',
            '--accent-color': '#0d6efd',
            '--success-color': '#198754',
            '--warning-color': '#ffc107',
            '--danger-color': '#dc3545'
        },
        light: {
            '--primary-bg': '#ffffff',
            '--secondary-bg': '#f8f9fa',
            '--text-color': '#212529',
            '--border-color': '#dee2e6',
            '--accent-color': '#0d6efd',
            '--success-color': '#198754',
            '--warning-color': '#ffc107',
            '--danger-color': '#dc3545'
        }
    };
    
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.body.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    function setTheme(theme) {
        document.body.setAttribute('data-bs-theme', theme);
        if (theme === 'dark') {
            lightIcon.style.display = 'inline-block';
            darkIcon.style.display = 'none';
        } else {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'inline-block';
        }
        
        // Update CSS variables based on theme
        const root = document.documentElement;
        Object.entries(themes[theme]).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
    
    // Add theme color customization
    window.customizeThemeColor = function(colorVar, value, theme = 'both') {
        if (theme === 'both' || theme === 'dark') {
            themes.dark[colorVar] = value;
        }
        if (theme === 'both' || theme === 'light') {
            themes.light[colorVar] = value;
        }
        setTheme(document.body.getAttribute('data-bs-theme'));
    };
});
