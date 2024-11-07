let currentLevel = 1;
let trainingData = [];
let socket = io();

socket.on('training_progress', function(data) {
    updateProgress(data.progress);
    updateLevelIndicator(data.level);
    appendTrainingLog(data.message);
    
    if (data.progress >= 100) {
        document.querySelector('#trainButton').disabled = false;
        document.querySelector('.chat-interface').style.display = 'block';
    }
});

function updateProgress(progress) {
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressFill').setAttribute('aria-valuenow', progress);
}

function updateLevelIndicator(level) {
    const levelElement = document.getElementById('levelIndicator');
    levelElement.textContent = `Level ${level}`;
    if (level > currentLevel) {
        levelElement.classList.add('alert-success');
        setTimeout(() => levelElement.classList.remove('alert-success'), 1000);
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

function addDataset() {
    const container = document.getElementById('datasets');
    const datasetId = container.children.length + 1;
    
    const dataset = document.createElement('div');
    dataset.className = 'dataset card p-3 mb-3';
    dataset.innerHTML = `
        <h3 class="h5">Dataset ${datasetId}</h3>
        <div class="mb-3">
            <input type="text" class="form-control mb-2" id="input-${datasetId}" placeholder="Input text...">
            <input type="text" class="form-control" id="output-${datasetId}" placeholder="Expected output...">
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
    trainingData = Array.from(datasets).map(dataset => ({
        input: dataset.querySelector('input[id^="input"]').value,
        output: dataset.querySelector('input[id^="output"]').value
    })).filter(data => data.input && data.output);

    if (trainingData.length === 0) {
        alert('Please add at least one dataset with both input and output!');
        return;
    }

    // Disable train button during training
    document.querySelector('#trainButton').disabled = true;
    
    // Clear previous training log
    document.getElementById('trainingProgress').innerHTML = '<h3>Training Progress:</h3>';
    
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
