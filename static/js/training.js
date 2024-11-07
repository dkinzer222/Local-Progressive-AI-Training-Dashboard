import { handleError, apiCall } from '/static/js/utilities.js';

let currentLevel = 1;
let trainingData = [];
let socket = io();
let trainingChart = null;
let memoryChart = null;
let trainingScores = [];
let memoryPatterns = new Map();
let trainingStartTime = null;
let currentOperation = '';
let operationStartTime = null;
let trainingStats = {
    successRate: 0,
    patternDiversity: 0,
    iterations: 0
};

// Error handling helper function
function announceError(error, context) {
    const errorMessage = error.message || 'An unexpected error occurred';
    const fullMessage = `Error ${context ? `in ${context}: ` : ': '}${errorMessage}`;
    
    // Create and append error announcement for screen readers
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
    
    // Update UI to show error
    const errorContainer = document.getElementById('errorContainer') || createErrorContainer();
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger alert-dismissible fade show';
    errorElement.setAttribute('role', 'alert');
    errorElement.innerHTML = `
        <strong>Error:</strong> ${errorMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    errorContainer.appendChild(errorElement);
}

function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'error-container mb-3';
    container.setAttribute('aria-label', 'Error messages');
    container.setAttribute('role', 'region');
    
    // Insert at the top of the main content
    const mainContent = document.querySelector('main');
    mainContent.insertBefore(container, mainContent.firstChild);
    return container;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Create error container
        createErrorContainer();
        
        // Initialize components sequentially with proper error handling
        await initializeCharts().catch(error => {
            throw new Error(`Failed to initialize charts: ${error.message}`);
        });
        
        await loadDatasets().catch(error => {
            throw new Error(`Failed to load datasets: ${error.message}`);
        });
        
        await loadModels().catch(error => {
            throw new Error(`Failed to load models: ${error.message}`);
        });
        
        await initAdvancedViz().catch(error => {
            throw new Error(`Failed to initialize advanced visualization: ${error.message}`);
        });
        
        await loadExampleDatasets().catch(error => {
            throw new Error(`Failed to load example datasets: ${error.message}`);
        });
        
        // Announce successful initialization to screen readers
        const successAnnouncement = document.createElement('div');
        successAnnouncement.setAttribute('role', 'status');
        successAnnouncement.setAttribute('aria-live', 'polite');
        successAnnouncement.className = 'sr-only';
        successAnnouncement.textContent = 'Application initialized successfully';
        document.body.appendChild(successAnnouncement);
        setTimeout(() => successAnnouncement.remove(), 1000);
        
    } catch (error) {
        announceError(error, 'DOMContentLoaded initialization');
    }
});

// Rest of the existing code...
[Previous code continues unchanged...]
