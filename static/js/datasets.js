let currentDatasetId = null;

function searchHuggingFaceDatasets() {
    const query = document.getElementById('huggingfaceSearch').value;
    const resultsContainer = document.getElementById('huggingfaceResults');
    
    resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    fetch(`/api/datasets/huggingface/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                resultsContainer.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                return;
            }
            
            if (data.datasets.length === 0) {
                resultsContainer.innerHTML = '<div class="alert alert-info">No datasets found</div>';
                return;
            }
            
            resultsContainer.innerHTML = data.datasets.map(dataset => `
                <div class="card mb-2">
                    <div class="card-body">
                        <h5 class="card-title">${dataset.name}</h5>
                        <p class="card-text">${dataset.description || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-download"></i> ${dataset.downloads} downloads
                                <i class="fas fa-heart ms-2"></i> ${dataset.likes} likes
                            </small>
                            <button class="btn btn-sm btn-primary" onclick="previewDataset('${dataset.id}')">Preview</button>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            resultsContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        });
}

function previewDataset(datasetId) {
    currentDatasetId = datasetId;
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    const modal = new bootstrap.Modal(document.getElementById('datasetPreviewModal'));
    modal.show();
    
    fetch(`/api/datasets/huggingface/preview/${encodeURIComponent(datasetId)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                previewContent.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                return;
            }
            
            let html = '<div class="table-responsive"><table class="table table-sm">';
            html += '<thead><tr>';
            Object.keys(data.features).forEach(feature => {
                html += `<th>${feature}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            data.samples.forEach(sample => {
                html += '<tr>';
                Object.keys(data.features).forEach(feature => {
                    html += `<td>${sample[feature]}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            previewContent.innerHTML = html;
        })
        .catch(error => {
            previewContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        });
}

function importDataset() {
    if (!currentDatasetId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('datasetPreviewModal'));
    modal.hide();
    
    // Get API key from local storage
    const apiKey = localStorage.getItem('current_api_key');
    if (!apiKey) {
        alert('Please generate an API key first');
        return;
    }
    
    fetch('/api/datasets/huggingface/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({
            dataset_id: currentDatasetId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
            return;
        }
        
        alert('Dataset imported successfully!');
        loadDatasets();
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    });
}

function copyApiKey() {
    const apiKeyInput = document.getElementById('apiKeyDisplay');
    apiKeyInput.select();
    document.execCommand('copy');
    
    const copyButton = apiKeyInput.nextElementSibling;
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
        copyButton.textContent = 'Copy';
    }, 2000);
}

// Enhance the existing saveModel function
const originalSaveModel = window.saveModel;
window.saveModel = function() {
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
            // Store API key
            localStorage.setItem('current_api_key', data.api_key);
            localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
            
            // Hide model modal
            bootstrap.Modal.getInstance(document.getElementById('saveModelModal')).hide();
            
            // Show API key modal
            const apiKeyModal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
            document.getElementById('apiKeyDisplay').value = data.api_key;
            apiKeyModal.show();
            
            loadModels();
        } else {
            alert('Error saving model: ' + data.error);
        }
    });
};
