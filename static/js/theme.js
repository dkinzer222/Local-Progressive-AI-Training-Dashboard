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
        },
        forest: {
            '--primary-bg': '#2c4a2c',
            '--secondary-bg': '#1a2f1a',
            '--text-color': '#e8f5e8',
            '--border-color': '#4a794a',
            '--accent-color': '#8bc34a',
            '--success-color': '#4caf50',
            '--warning-color': '#ffeb3b',
            '--danger-color': '#f44336'
        },
        ocean: {
            '--primary-bg': '#1e3d59',
            '--secondary-bg': '#142d42',
            '--text-color': '#e8f1f8',
            '--border-color': '#3d7ea6',
            '--accent-color': '#00bcd4',
            '--success-color': '#009688',
            '--warning-color': '#ffd700',
            '--danger-color': '#ff5252'
        },
        sunset: {
            '--primary-bg': '#2c1810',
            '--secondary-bg': '#1a0f0a',
            '--text-color': '#fff3e0',
            '--border-color': '#5d4037',
            '--accent-color': '#ff9800',
            '--success-color': '#ff5722',
            '--warning-color': '#ffc107',
            '--danger-color': '#f44336'
        }
    };
    
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    // Add theme selector UI
    const themeSelector = document.createElement('select');
    themeSelector.id = 'themeSelector';
    themeSelector.className = 'form-select form-select-sm ms-2';
    Object.keys(themes).forEach(themeName => {
        const option = document.createElement('option');
        option.value = themeName;
        option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        if (themeName === savedTheme) {
            option.selected = true;
        }
        themeSelector.appendChild(option);
    });
    
    themeToggleBtn.parentElement.appendChild(themeSelector);
    
    themeSelector.addEventListener('change', function(e) {
        const newTheme = e.target.value;
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    themeToggleBtn.style.display = 'none'; // Hide the original toggle since we now have a selector
    
    function setTheme(theme) {
        document.body.setAttribute('data-bs-theme', theme === 'light' ? 'light' : 'dark');
        
        // Update CSS variables based on theme
        const root = document.documentElement;
        Object.entries(themes[theme]).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
        
        // Update charts and visualizations if they exist
        if (typeof updateVisualizationColors === 'function') {
            updateVisualizationColors(themes[theme]);
        }
    }
    
    // Function to customize individual colors
    window.customizeThemeColor = function(colorVar, value, themeName) {
        if (themes[themeName]) {
            themes[themeName][colorVar] = value;
            if (document.body.getAttribute('data-bs-theme') === themeName) {
                setTheme(themeName);
            }
        }
    };
    
    // Function to create a new theme
    window.createCustomTheme = function(themeName, colors) {
        if (!themes[themeName]) {
            themes[themeName] = { ...themes.dark, ...colors };
            const option = document.createElement('option');
            option.value = themeName;
            option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
            themeSelector.appendChild(option);
            return true;
        }
        return false;
    };
});
