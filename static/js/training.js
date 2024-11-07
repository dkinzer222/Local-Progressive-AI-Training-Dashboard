import { handleError, apiCall } from './utilities.js';

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

const exampleDatasets = [
    {
        input: "Hello",
        output: "Hi there!"
    },
    {
        input: "What's the weather like?",
        output: "It's sunny and warm today!"
    },
    {
        input: "Can you help me solve this math problem?",
        output: "I'll guide you through the solution step by step."
    },
    {
        input: "Tell me about machine learning",
        output: "Machine learning is a branch of AI that enables systems to learn from data."
    }
];

const LEVEL_OBJECTIVES = {
    1: {
        title: "Letter Pattern Recognition",
        requirements: ["Learn individual letter patterns", "Achieve 70% accuracy", "Process 100 training samples"],
        threshold: { successRate: 0.7, diversity: 0.4, iterations: 100 }
    },
    2: {
        title: "Word Formation",
        requirements: ["Identify common word patterns", "Achieve 75% accuracy", "Learn 200 unique patterns"],
        threshold: { successRate: 0.75, diversity: 0.5, iterations: 200 }
    },
    3: {
        title: "Basic Sentence Structure",
        requirements: ["Form simple sentences", "Achieve 80% accuracy", "Master 300 patterns"],
        threshold: { successRate: 0.8, diversity: 0.6, iterations: 300 }
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await Promise.all([
            initializeCharts(),
            loadDatasets(),
            loadModels(),
            initAdvancedViz(),
            loadExampleDatasets()
        ]);
    } catch (error) {
        handleError(error, 'DOMContentLoaded initialization');
    }
});

window.addEventListener('beforeunload', function() {
    try {
        cleanupViz();
    } catch (error) {
        handleError(error, 'beforeunload cleanup');
    }
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

async function loadDatasets() {
    try {
        const data = await apiCall('/api/datasets');
        const tbody = document.getElementById('datasetsTable');
        tbody.innerHTML = '';
        
        data.datasets.forEach(dataset => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dataset.name}</td>
                <td>${dataset.version}</td>
                <td>${dataset.description}</td>
                <td>${new Date(dataset.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="loadDataset(${dataset.id})">Load</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDataset(${dataset.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        handleError(error, 'loadDatasets');
    }
}

function loadExampleDatasets() {
    const container = document.getElementById('datasets');
    container.innerHTML = '';
    
    exampleDatasets.forEach((dataset, index) => {
        const datasetId = index + 1;
        const datasetDiv = document.createElement('div');
        datasetDiv.className = 'dataset card p-3 mb-3';
        datasetDiv.innerHTML = `
            <h3 class="h5">Dataset ${datasetId}</h3>
            <div class="mb-3">
                <input type="text" class="form-control mb-2" id="input-${datasetId}" value="${dataset.input}" placeholder="Input text...">
                <div class="invalid-feedback" id="input-error-${datasetId}"></div>
                <input type="text" class="form-control" id="output-${datasetId}" value="${dataset.output}" placeholder="Expected output...">
                <div class="invalid-feedback" id="output-error-${datasetId}"></div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeDataset(this)">Remove</button>
        `;
        container.appendChild(datasetDiv);
    });
}

function showSaveDatasetModal() {
    const modal = new bootstrap.Modal(document.getElementById('saveDatasetModal'));
    modal.show();
}

async function saveDataset() {
    try {
        const name = document.getElementById('datasetName').value;
        const version = document.getElementById('datasetVersion').value;
        const description = document.getElementById('datasetDescription').value;
        
        if (!name) {
            throw new Error('Please provide a dataset name');
        }
        
        const response = await apiCall('/api/datasets', {
            method: 'POST',
            body: JSON.stringify({
                name,
                version,
                description,
                data: trainingData
            })
        });

        if (response.status === 'success') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('saveDatasetModal'));
            modal.hide();
            await loadDatasets();
        }
    } catch (error) {
        handleError(error, 'saveDataset');
    }
}

async function loadDataset(id) {
    try {
        const dataset = await apiCall(`/api/datasets/${id}`);
        trainingData = dataset.data;
        updateDatasetDisplay();
    } catch (error) {
        handleError(error, 'loadDataset');
    }
}

async function loadModels() {
    try {
        const data = await apiCall('/api/models');
        const tbody = document.getElementById('modelsTable');
        tbody.innerHTML = '';
        
        data.models.forEach(model => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${model.name}</td>
                <td>${model.version}</td>
                <td>${new Date(model.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="exportModel(${model.id})">Export</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteModel(${model.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        handleError(error, 'loadModels');
    }
}

function showSaveModelModal() {
    const modal = new bootstrap.Modal(document.getElementById('saveModelModal'));
    modal.show();
}

async function saveModel() {
    try {
        const name = document.getElementById('modelName').value;
        const version = document.getElementById('modelVersion').value;
        
        if (!name) {
            throw new Error('Please provide a model name');
        }
        
        const response = await apiCall('/api/models', {
            method: 'POST',
            body: JSON.stringify({
                name,
                version,
                configuration: {
                    current_level: currentLevel,
                    training_scores: trainingScores
                }
            })
        });

        if (response.status === 'success') {
            localStorage.setItem(`model_${response.model_id}_api_key`, response.api_key);
            const modal = bootstrap.Modal.getInstance(document.getElementById('saveModelModal'));
            modal.hide();
            await loadModels();
            alert('Model saved successfully! API Key: ' + response.api_key);
        }
    } catch (error) {
        handleError(error, 'saveModel');
    }
}

async function exportModel(id) {
    try {
        const apiKey = localStorage.getItem(`model_${id}_api_key`);
        if (!apiKey) {
            throw new Error('API key not found for this model');
        }
        
        const response = await apiCall(`/api/models/${id}/export`, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model_${id}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        handleError(error, 'exportModel');
    }
}

function updateTrainingStatus(operation, progress) {
    document.getElementById('currentOperation').textContent = operation;
    document.getElementById('operationProgress').textContent = `${Math.round(progress)}%`;
    
    if (operation !== currentOperation) {
        currentOperation = operation;
        operationStartTime = Date.now();
    }
    
    if (progress > 0) {
        const elapsed = Date.now() - operationStartTime;
        const totalTime = elapsed / (progress / 100);
        const remainingTime = totalTime - elapsed;
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        document.getElementById('operationETA').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateLevelProgress(stats) {
    const level = LEVEL_OBJECTIVES[currentLevel];
    if (!level) return;
    
    const thresholds = level.threshold;
    
    document.getElementById('successRateProgress').style.width = 
        `${(stats.successRate / thresholds.successRate) * 100}%`;
    document.getElementById('diversityProgress').style.width = 
        `${(stats.patternDiversity / thresholds.diversity) * 100}%`;
    document.getElementById('iterationsProgress').style.width = 
        `${(stats.iterations / thresholds.iterations) * 100}%`;
    
    document.getElementById('levelObjectives').innerHTML = `
        <h6>Current Level: ${level.title}</h6>
        <ul>
            ${level.requirements.map(req => `<li>${req}</li>`).join('')}
        </ul>
    `;
}

function updateTimeline() {
    const timeline = document.getElementById('levelTimeline');
    timeline.innerHTML = '';
    
    for (let i = 1; i <= Math.max(currentLevel, 3); i++) {
        const level = LEVEL_OBJECTIVES[i];
        if (!level) continue;
        
        const timelineItem = document.createElement('div');
        timelineItem.className = `timeline-item ${i === currentLevel ? 'current' : ''}`;
        timelineItem.innerHTML = `
            <div class="timeline-content">
                <h6>Level ${i}: ${level.title}</h6>
                <div class="timeline-progress">
                    ${i < currentLevel ? '✓ Completed' : 
                      i === currentLevel ? 'In Progress' : 'Locked'}
                </div>
            </div>
        `;
        timeline.appendChild(timelineItem);
    }
}

function appendActivityLog(message, type = 'info') {
    const log = document.querySelector('.log-entries');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <small class="text-muted">${new Date().toLocaleTimeString()}</small>
        ${message}
    `;
    log.insertBefore(entry, log.firstChild);
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
    if (!patterns) return;
    
    Object.entries(patterns).forEach(([pattern, confidence]) => {
        memoryPatterns.set(pattern, confidence);
    });
    
    const sortedPatterns = Array.from(memoryPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    memoryChart.data.labels = sortedPatterns.map(([pattern]) => pattern);
    memoryChart.data.datasets[0].data = sortedPatterns.map(([_, confidence]) => confidence);
    memoryChart.update();
    
    updatePatternGraph(memoryPatterns);
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

async function startTraining() {
    try {
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
            throw new Error('Please fix the errors in your datasets before training');
        }

        const trainButton = document.querySelector('#trainButton');
        trainButton.disabled = true;
        
        document.getElementById('trainingProgress').innerHTML = '<h3>Training Progress:</h3>';
        trainingScores = [];
        memoryPatterns.clear();
        if (trainingChart) trainingChart.data.datasets[0].data = [];
        if (memoryChart) memoryChart.data.datasets[0].data = [];
        
        updateProgress(0);
        
        socket.emit('start_training', {
            current_level: currentLevel,
            data: trainingData
        });

        await apiCall('/api/train', {
            method: 'POST',
            body: JSON.stringify({
                training_data: trainingData,
                level: currentLevel
            })
        });
    } catch (error) {
        handleError(error, 'startTraining');
        const trainButton = document.querySelector('#trainButton');
        trainButton.disabled = false;
    }
}

socket.on('training_progress', function(data) {
    if (!trainingStartTime) {
        trainingStartTime = Date.now();
        appendActivityLog('Training started', 'info');
    }
    
    updateTrainingStatus(data.operation || 'Processing', data.progress);
    updateProgress(data.progress);
    
    trainingStats = {
        successRate: data.score || 0,
        patternDiversity: Object.keys(data.patterns || {}).length / 100,
        iterations: data.iterations || 0
    };
    updateLevelProgress(trainingStats);
    
    if (data.level !== currentLevel) {
        const levelIndicator = document.getElementById('levelIndicator');
        levelIndicator.classList.add('level-transition');
        setTimeout(() => levelIndicator.classList.remove('level-transition'), 1000);
        
        appendActivityLog(`Advanced to Level ${data.level}!`, 'success');
        currentLevel = data.level;
        updateTimeline();
    }
    
    updateLevelIndicator(data.level);
    updateTrainingChart(data.score);
    updateMemoryPatterns(data.patterns);
    
    appendActivityLog(data.message);
    
    if (data.progress >= 100) {
        trainingStartTime = null;
        document.querySelector('#trainButton').disabled = false;
        document.querySelector('.chat-interface').style.display = 'block';
        appendActivityLog('Training completed!', 'success');
    }
});