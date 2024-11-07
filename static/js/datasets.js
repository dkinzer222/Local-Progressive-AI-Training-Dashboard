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
            localStorage.setItem('current_api_key', data.api_key);
            localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
            
            bootstrap.Modal.getInstance(document.getElementById('saveModelModal')).hide();
            
            const apiKeyModal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
            document.getElementById('apiKeyDisplay').value = data.api_key;
            apiKeyModal.show();
            
            loadModels();
        } else {
            alert('Error saving model: ' + data.error);
        }
    });
};

function showHuggingFaceImportModal() {
    const modal = new bootstrap.Modal(document.getElementById('huggingFaceImportModal'));
    modal.show();
}

function searchHuggingFaceModels() {
    const query = document.getElementById('huggingFaceSearch').value;
    const resultsContainer = document.getElementById('huggingFaceResults');
    
    resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    fetch(`/api/models/huggingface/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                resultsContainer.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                return;
            }
            
            if (data.models.length === 0) {
                resultsContainer.innerHTML = '<div class="alert alert-info">No models found</div>';
                return;
            }
            
            resultsContainer.innerHTML = data.models.map(model => `
                <div class="list-group-item">
                    <h6 class="mb-1">${model.name}</h6>
                    <p class="mb-1 small">${model.description || 'No description available'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            Downloads: ${model.downloads} | Likes: ${model.likes}
                        </small>
                        <button class="btn btn-sm btn-primary" onclick="importHuggingFaceModel('${model.id}')">Import</button>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            resultsContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        });
}

function importHuggingFaceModel(modelId) {
    const progressBar = document.getElementById('hfImportProgress');
    progressBar.classList.remove('d-none');
    
    const apiKey = localStorage.getItem('current_api_key');
    if (!apiKey) {
        alert('Please generate an API key first');
        return;
    }
    
    fetch('/api/models/huggingface/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({ model_id: modelId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
            return;
        }
        
        localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
        bootstrap.Modal.getInstance(document.getElementById('huggingFaceImportModal')).hide();
        alert('Model imported successfully!');
        loadModels();
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    })
    .finally(() => {
        progressBar.classList.add('d-none');
    });
}

function showGitHubImportModal() {
    const modal = new bootstrap.Modal(document.getElementById('githubImportModal'));
    modal.show();
}

function showGitHubExportModal() {
    const modal = new bootstrap.Modal(document.getElementById('githubExportModal'));
    modal.show();
}

function importFromGitHub() {
    const repoUrl = document.getElementById('githubRepoUrl').value;
    if (!repoUrl) {
        alert('Please enter a GitHub repository URL');
        return;
    }
    
    const progressBar = document.getElementById('githubImportProgress');
    progressBar.classList.remove('d-none');
    
    const apiKey = localStorage.getItem('current_api_key');
    if (!apiKey) {
        alert('Please generate an API key first');
        return;
    }
    
    fetch('/api/models/github/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({ repo_url: repoUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
            return;
        }
        
        localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
        bootstrap.Modal.getInstance(document.getElementById('githubImportModal')).hide();
        alert('Model imported successfully!');
        loadModels();
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    })
    .finally(() => {
        progressBar.classList.add('d-none');
    });
}

function exportToGitHub() {
    const repoUrl = document.getElementById('githubExportRepoUrl').value;
    const commitMessage = document.getElementById('githubCommitMessage').value;
    
    if (!repoUrl) {
        alert('Please enter a GitHub repository URL');
        return;
    }
    
    const progressBar = document.getElementById('githubExportProgress');
    progressBar.classList.remove('d-none');
    
    const apiKey = localStorage.getItem('current_api_key');
    if (!apiKey) {
        alert('Please generate an API key first');
        return;
    }
    
    fetch('/api/models/github/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({
            repo_url: repoUrl,
            commit_message: commitMessage
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
            return;
        }
        
        bootstrap.Modal.getInstance(document.getElementById('githubExportModal')).hide();
        alert('Model exported successfully!');
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    })
    .finally(() => {
        progressBar.classList.add('d-none');
    });
}

function showImportModelModal() {
    const modal = new bootstrap.Modal(document.getElementById('importModelModal'));
    modal.show();
}

function importModel() {
    const fileInput = document.getElementById('modelFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to import');
        return;
    }

    if (!file.name.endsWith('.json')) {
        alert('Please select a valid JSON file');
        return;
    }

    const apiKey = localStorage.getItem('current_api_key');
    if (!apiKey) {
        alert('Please generate an API key first');
        return;
    }

    const formData = new FormData();
    formData.append('model_file', file);

    fetch('/api/models/import', {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
            return;
        }
        
        localStorage.setItem(`model_${data.model_id}_api_key`, data.api_key);
        
        bootstrap.Modal.getInstance(document.getElementById('importModelModal')).hide();
        
        alert('Model imported successfully!');
        
        loadModels();
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    });
}

function downloadModelFile() {
    const currentModelId = document.querySelector('#modelsTable tr[data-selected="true"]')?.dataset.modelId;
    if (!currentModelId) {
        alert('Please select a model to download');
        return;
    }
    
    const apiKey = localStorage.getItem(`model_${currentModelId}_api_key`);
    if (!apiKey) {
        alert('API key not found for this model');
        return;
    }
    
    fetch(`/api/models/${currentModelId}/export`, {
        headers: {
            'X-API-Key': apiKey
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Export failed');
        }
        return response.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model_${currentModelId}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    })
    .catch(error => {
        alert(`Error exporting model: ${error.message}`);
    });
}

document.getElementById('huggingFaceSearch')?.addEventListener('input', (e) => {
    if (e.target.value.length >= 3) {
        searchHuggingFaceModels();
    }
});