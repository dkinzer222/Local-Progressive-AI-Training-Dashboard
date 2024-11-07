// Global error handling utilities
export const handleError = (error, context = '') => {
    const errorMessage = error.message || 'An unexpected error occurred';
    const fullMessage = `Error${context ? ` in ${context}` : ''}: ${errorMessage}`;
    
    // Create error announcement for screen readers
    const errorAnnouncement = document.createElement('div');
    errorAnnouncement.setAttribute('role', 'alert');
    errorAnnouncement.setAttribute('aria-live', 'assertive');
    errorAnnouncement.className = 'sr-only error-message';
    errorAnnouncement.textContent = fullMessage;
    document.body.appendChild(errorAnnouncement);
    
    // Remove after screen reader has time to announce
    setTimeout(() => errorAnnouncement.remove(), 3000);
    
    // Log error for debugging
    console.error(fullMessage, error);
    
    return {
        error: errorMessage,
        context,
        timestamp: new Date().toISOString(),
        details: error.stack
    };
};

// Global promise rejection handler
window.addEventListener('unhandledrejection', event => {
    event.preventDefault();
    handleError(event.reason, 'Unhandled Promise');
});

// Utility function for making API calls with enhanced error handling
export const apiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Announce success for important operations
        if (options.announceSuccess) {
            const successAnnouncement = document.createElement('div');
            successAnnouncement.setAttribute('role', 'status');
            successAnnouncement.setAttribute('aria-live', 'polite');
            successAnnouncement.className = 'sr-only';
            successAnnouncement.textContent = options.successMessage || 'Operation completed successfully';
            document.body.appendChild(successAnnouncement);
            setTimeout(() => successAnnouncement.remove(), 1000);
        }
        
        return data;
    } catch (error) {
        return handleError(error, `API call to ${url}`);
    }
};
