let currentLevel = 1;
let trainingData = [];
let socket = io();
let trainingChart = null;
let memoryChart = null;
let trainingScores = [];
let memoryPatterns = new Map();

// Initialize charts when document is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
});

function initializeCharts() {
    const trainingCtx = document.getElementById('trainingChart').getContext('2d');
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');

    trainingChart = new Chart(trainingCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Training Score',
                data: [],
                borderColor: '#0f0',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    memoryChart = new Chart(memoryCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Pattern Confidence',
                data: [],
                backgroundColor: '#0f0'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1
                }
            }
        }
    });
}

socket.on('training_progress', function(data) {
    updateProgress(data.progress);
    updateLevelIndicator(data.level);
    appendTrainingLog(data.message);
    updateTrainingChart(data.score);
    updateMemoryPatterns(data.patterns);
    
    if (data.progress >= 100) {
        document.querySelector('#trainButton').disabled = false;
        document.querySelector('.chat-interface').style.display = 'block';
    }
});

function updateTrainingChart(score) {
    if (!trainingChart) return;
    
    trainingScores.push(score);
    trainingChart.data.labels.push(trainingScores.length);
    trainingChart.data.datasets[0].data.push(score * 100);
    
    if (trainingScores.length > 20) {
        trainingChart.data.labels.shift();
        trainingChart.data.datasets[0].data.shift();
    }
    
    trainingChart.update();
}

function updateMemoryPatterns(patterns) {
    if (!memoryChart || !patterns) return;
    
    Object.entries(patterns).forEach(([pattern, confidence]) => {
        memoryPatterns.set(pattern, confidence);
    });
    
    const sortedPatterns = Array.from(memoryPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    memoryChart.data.labels = sortedPatterns.map(([pattern]) => pattern);
    memoryChart.data.datasets[0].data = sortedPatterns.map(([_, confidence]) => confidence);
    memoryChart.update();
}

function updateProgress(progress) {
    const progressBar = document.getElementById('progressFill');
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

function updateLevelIndicator(level) {
    const levelElement = document.getElementById('levelIndicator');
    levelElement.textContent = `Level ${level}`;
    if (level > currentLevel) {
        levelElement.classList.remove('alert-info');
        levelElement.classList.add('alert-success');
        setTimeout(() => {
            levelElement.classList.remove('alert-success');
            levelElement.classList.add('alert-info');
        }, 1000);
        currentLevel = level;
    }
}

function appendTrainingLog(message) {
    const log = document.getElementById('trainingProgress');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<small class="text-muted">${new Date().toLocaleTimeString()}</small> ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function validateDataset(input, output) {
    if (!input || !output) {
        return {
            valid: false,
            message: 'Both input and output must be provided'
        };
    }
    if (input.length < 2 || output.length < 2) {
        return {
            valid: false,
            message: 'Input and output must be at least 2 characters long'
        };
    }
    return { valid: true };
}

function addDataset() {
    const container = document.getElementById('datasets');
    const datasetId = container.children.length + 1;
    
    const dataset = document.createElement('div');
    dataset.className = 'dataset card p-3 mb-3';
    dataset.innerHTML = `
        <h3 class="h5">Dataset ${datasetId}</h3>
        <div class="mb-3">
            <input type="text" class="form-control mb-2" id="input-${datasetId}" placeholder="Input text...">
            <div class="invalid-feedback" id="input-error-${datasetId}"></div>
            <input type="text" class="form-control" id="output-${datasetId}" placeholder="Expected output...">
            <div class="invalid-feedback" id="output-error-${datasetId}"></div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeDataset(this)">Remove</button>
    `;
    container.appendChild(dataset);
}

function removeDataset(button) {
    button.closest('.dataset').remove();
}

function startTraining() {
    const datasets = document.querySelectorAll('.dataset');
    let hasErrors = false;
    trainingData = [];
    
    datasets.forEach(dataset => {
        const input = dataset.querySelector('input[id^="input"]');
        const output = dataset.querySelector('input[id^="output"]');
        const validation = validateDataset(input.value, output.value);
        
        if (!validation.valid) {
            input.classList.add('is-invalid');
            output.classList.add('is-invalid');
            dataset.querySelector('[id^="input-error"]').textContent = validation.message;
            hasErrors = true;
            return;
        }
        
        input.classList.remove('is-invalid');
        output.classList.remove('is-invalid');
        trainingData.push({
            input: input.value,
            output: output.value
        });
    });

    if (hasErrors || trainingData.length === 0) {
        alert('Please fix the errors in your datasets before training');
        return;
    }

    // Disable train button during training
    document.querySelector('#trainButton').disabled = true;
    
    // Clear previous training log and charts
    document.getElementById('trainingProgress').innerHTML = '<h3>Training Progress:</h3>';
    trainingScores = [];
    memoryPatterns.clear();
    if (trainingChart) trainingChart.data.datasets[0].data = [];
    if (memoryChart) memoryChart.data.datasets[0].data = [];
    
    // Reset progress bar
    updateProgress(0);
    
    // Start training via WebSocket
    socket.emit('start_training', {
        current_level: currentLevel,
        data: trainingData
    });

    // Send training data to server
    fetch('/api/train', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            training_data: trainingData,
            level: currentLevel
        })
    });
}
