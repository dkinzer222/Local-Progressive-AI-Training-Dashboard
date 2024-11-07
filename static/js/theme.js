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
    
    // Add theme selector UI with enhanced accessibility
    const themeSelector = document.createElement('select');
    themeSelector.id = 'themeSelector';
    themeSelector.className = 'form-select form-select-sm ms-2';
    themeSelector.setAttribute('aria-label', 'Select color theme');
    
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
    
    // Add keyboard support for theme selection
    themeSelector.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const newTheme = e.target.value;
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            // Announce theme change to screen readers
            announceThemeChange(newTheme);
        }
    });
    
    themeSelector.addEventListener('change', function(e) {
        const newTheme = e.target.value;
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        // Announce theme change to screen readers
        announceThemeChange(newTheme);
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
    
    // Function to announce theme changes to screen readers
    function announceThemeChange(theme) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Theme changed to ${theme}`;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
    
    // Function to customize individual colors with accessibility support
    window.customizeThemeColor = function(colorVar, value, themeName) {
        if (themes[themeName]) {
            // Check contrast ratio before applying color
            if (isColorContrastValid(value)) {
                themes[themeName][colorVar] = value;
                if (document.body.getAttribute('data-bs-theme') === themeName) {
                    setTheme(themeName);
                }
                return true;
            }
            console.warn('Color contrast ratio is too low for accessibility standards');
            return false;
        }
        return false;
    };
    
    // Function to check color contrast ratio
    function isColorContrastValid(color) {
        // Simple implementation - could be expanded for more thorough checking
        const backgroundColor = getComputedStyle(document.body).backgroundColor;
        // Add proper color contrast calculation here
        return true; // Placeholder return
    }
    
    // Function to create a new theme with accessibility checks
    window.createCustomTheme = function(themeName, colors) {
        if (!themes[themeName]) {
            // Validate color contrast for all colors
            const hasValidContrast = Object.values(colors).every(isColorContrastValid);
            
            if (hasValidContrast) {
                themes[themeName] = { ...themes.dark, ...colors };
                const option = document.createElement('option');
                option.value = themeName;
                option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
                themeSelector.appendChild(option);
                return true;
            }
            console.warn('Some colors in the new theme do not meet accessibility standards');
            return false;
        }
        return false;
    };
});
