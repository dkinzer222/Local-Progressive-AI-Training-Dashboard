let currentLevel = 1;
let trainingData = [];
let socket = io();
let trainingChart = null;
let memoryChart = null;
let trainingScores = [];
let memoryPatterns = new Map();

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadDatasets();
    loadModels();
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

function loadDatasets() {
    fetch('/api/datasets')
        .then(response => response.json())
        .then(data => {
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
        });
}

function showSaveDatasetModal() {
    const modal = new bootstrap.Modal(document.getElementById('saveDatasetModal'));
    modal.show();
}

function saveDataset() {
    const name = document.getElementById('datasetName').value;
    const version = document.getElementById('datasetVersion').value;
    const description = document.getElementById('datasetDescription').value;
    
    if (!name) {
        alert('Please provide a dataset name');
        return;
    }
    
    fetch('/api/datasets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            version,
            description,
            data: trainingData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('saveDatasetModal')).hide();
            loadDatasets();
        } else {
            alert('Error saving dataset: ' + data.error);
        }
    });
}

function loadDataset(id) {
    fetch(`/api/datasets/${id}`)
        .then(response => response.json())
        .then(dataset => {
            trainingData = dataset.data;
            updateDatasetDisplay();
        });
}

function loadModels() {
    fetch('/api/models')
        .then(response => response.json())
        .then(data => {
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
        });
}

function showSaveModelModal() {
    const modal = new bootstrap.Modal(document.getElementById('saveModelModal'));
    modal.show();
}

function saveModel() {
    const name = document.getElementById('modelName').value;
    const version = document.getElementById('modelVersion').value;
    
    if (!name) {
        alert('Please provide a model name');
        return;
    }
    
    fetch('/api/models', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            version,
            configuration: {
                current_level: currentLevel,
                training_scores: trainingScores
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
            bootstrap.Modal.getInstance(document.getElementById('saveModelModal')).hide();
            loadModels();
            alert('Model saved successfully! API Key: ' + data.api_key);
        } else {
            alert('Error saving model: ' + data.error);
        }
    });
}

function exportModel(id) {
    const apiKey = localStorage.getItem(`model_${id}_api_key`);
    if (!apiKey) {
        alert('API key not found for this model');
        return;
    }
    
    fetch(`/api/models/${id}/export`, {
        headers: {
            'X-API-Key': apiKey
        }
    })
    .then(response => response.json())
    .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model_${id}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    document.querySelector('#trainButton').disabled = true;
    
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