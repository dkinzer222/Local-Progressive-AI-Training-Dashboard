// Global error handling utilities
export const handleError = (error, context = '') => {
    console.error(`Error${context ? ` in ${context}` : ''}: `, error);
    // You can add UI notification here if needed
    return { error: error.message || 'An unexpected error occurred' };
};

// Global promise rejection handler
window.addEventListener('unhandledrejection', event => {
    event.preventDefault();
    handleError(event.reason, 'Unhandled Promise');
});

// Utility function for making API calls
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        return handleError(error, `API call to ${url}`);
    }
};
