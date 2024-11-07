let currentLevel = 1;
let trainingData = [];
let socket = io();

socket.on('training_progress', function(data) {
    updateProgress(data.progress);
    updateLevelIndicator(data.level);
    appendTrainingLog(data.message);
});

function updateProgress(progress) {
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateLevelIndicator(level) {
    document.getElementById('levelIndicator').textContent = `Level ${level}`;
}

function appendTrainingLog(message) {
    const log = document.getElementById('trainingProgress');
    log.innerHTML += `<div>${message}</div>`;
    log.scrollTop = log.scrollHeight;
}

function addDataset() {
    const container = document.getElementById('datasets');
    const datasetId = container.children.length + 1;
    
    const dataset = document.createElement('div');
    dataset.className = 'dataset';
    dataset.innerHTML = `
        <h3>Dataset ${datasetId}</h3>
        <input type="text" id="input-${datasetId}" placeholder="Input text...">
        <input type="text" id="output-${datasetId}" placeholder="Expected output...">
        <button onclick="removeDataset(this)">Remove</button>
    `;
    container.appendChild(dataset);
}

function removeDataset(button) {
    button.parentElement.remove();
}

function startTraining() {
    const datasets = document.querySelectorAll('.dataset');
    trainingData = Array.from(datasets).map(dataset => ({
        input: dataset.querySelector('input[id^="input"]').value,
        output: dataset.querySelector('input[id^="output"]').value
    }));

    if (trainingData.length === 0) {
        alert('Please add at least one dataset!');
        return;
    }

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
