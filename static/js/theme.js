document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');
    
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
        if (theme === 'dark') {
            root.style.setProperty('--primary-bg', '#212529');
            root.style.setProperty('--secondary-bg', '#343a40');
            root.style.setProperty('--text-color', '#f8f9fa');
            root.style.setProperty('--border-color', '#495057');
        } else {
            root.style.setProperty('--primary-bg', '#ffffff');
            root.style.setProperty('--secondary-bg', '#f8f9fa');
            root.style.setProperty('--text-color', '#212529');
            root.style.setProperty('--border-color', '#dee2e6');
        }
    }
});
