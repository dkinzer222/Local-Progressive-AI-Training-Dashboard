import os
from flask import Flask, render_template, jsonify, request, send_file
from flask_socketio import SocketIO, emit
from sqlalchemy.orm import DeclarativeBase
from database import db
from utils.ai_engine import AIEngine
import json, requests
from functools import wraps
from datasets import load_dataset
from huggingface_hub import list_datasets, HfApi, Repository
from huggingface_hub.utils import RepositoryNotFoundError
import time
from werkzeug.utils import secure_filename
import tempfile
from github import Github
import base64

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "dev_key"

socketio = SocketIO(app)
db.init_app(app)

# Import models after db initialization to avoid circular imports
from models import TrainingData, AIMemory, Dataset, AIModel

ai_engine = AIEngine()
hf_api = HfApi()

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({"error": "No API key provided"}), 401
            
        model = AIModel.query.filter_by(api_key_hash=api_key).first()
        if not model or not model.verify_api_key(api_key):
            return jsonify({"error": "Invalid API key"}), 401
            
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    datasets = Dataset.query.all()
    return jsonify({
        "datasets": [dataset.to_dict() for dataset in datasets]
    })

@app.route('/api/datasets', methods=['POST'])
def create_dataset():
    data = request.json
    try:
        dataset = Dataset(
            name=data['name'],
            version=data.get('version', '1.0'),
            description=data.get('description', ''),
            data=data['data']
        )
        db.session.add(dataset)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "dataset_id": dataset.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/datasets/<int:dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify(dataset.to_dict())

@app.route('/api/models', methods=['GET'])
def list_models():
    models = AIModel.query.all()
    return jsonify({
        "models": [model.to_dict() for model in models]
    })

@app.route('/api/models', methods=['POST'])
def create_model():
    data = request.json
    try:
        model = AIModel(
            name=data['name'],
            version=data.get('version', '1.0'),
            configuration=data.get('configuration', {}),
            state={}
        )
        api_key = model.set_api_key()
        db.session.add(model)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "model_id": model.id,
            "api_key": api_key
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/models/<int:model_id>/export', methods=['GET'])
@require_api_key
def export_model(model_id):
    try:
        model = AIModel.query.get_or_404(model_id)
        export_data = model.serialize_state()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
            json.dump(export_data, tmp, indent=2)
            
        response = send_file(
            tmp.name,
            mimetype='application/json',
            as_attachment=True,
            download_name=f"{model.name.lower().replace(' ', '_')}_v{model.version}.json"
        )
        
        @response.call_on_close
        def cleanup():
            os.unlink(tmp.name)
            
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/import', methods=['POST'])
@require_api_key
def import_model():
    try:
        if 'model_file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['model_file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not file.filename.endswith('.json'):
            return jsonify({"error": "Invalid file format. Please upload a JSON file"}), 400
        
        try:
            import_data = json.load(file)
            AIModel.validate_import_data(import_data)
            
            model_info = import_data['model_info']
            model = AIModel.from_dict(model_info)
            api_key = model.set_api_key()
            
            db.session.add(model)
            db.session.commit()
            
            return jsonify({
                "status": "success",
                "message": "Model imported successfully",
                "model_id": model.id,
                "api_key": api_key
            })
            
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON file"}), 400
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/github/import', methods=['POST'])
@require_api_key
def import_github_model():
    data = request.json
    try:
        repo_url = data.get('repo_url')
        if not repo_url:
            return jsonify({"error": "No repository URL provided"}), 400
            
        github_token = os.environ.get('GITHUB_TOKEN')
        if not github_token:
            return jsonify({"error": "GitHub token not configured"}), 500
            
        g = Github(github_token)
        repo = g.get_repo(repo_url.split('github.com/')[-1])
        
        model_files = {}
        for content in repo.get_contents(""):
            if content.path.endswith(('.json', '.h5', '.pt', '.ckpt')):
                model_files[content.path] = base64.b64decode(content.content)
                
        model = AIModel(
            name=f"GitHub: {repo.name}",
            version="1.0",
            configuration={
                "source": "github",
                "repo_url": repo_url,
                "files": list(model_files.keys())
            },
            state=model_files
        )
        
        api_key = model.set_api_key()
        db.session.add(model)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "model_id": model.id,
            "api_key": api_key
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/models/github/export', methods=['POST'])
@require_api_key
def export_github_model():
    data = request.json
    try:
        model_id = data.get('model_id')
        repo_url = data.get('repo_url')
        commit_message = data.get('commit_message', 'Updated model')
        
        if not model_id or not repo_url:
            return jsonify({"error": "Missing required parameters"}), 400
            
        github_token = os.environ.get('GITHUB_TOKEN')
        if not github_token:
            return jsonify({"error": "GitHub token not configured"}), 500
            
        model = AIModel.query.get_or_404(model_id)
        g = Github(github_token)
        repo = g.get_repo(repo_url.split('github.com/')[-1])
        
        # Export model files
        for filename, content in model.state.items():
            if isinstance(content, (str, bytes)):
                try:
                    repo.create_file(
                        filename,
                        commit_message,
                        content if isinstance(content, bytes) else content.encode(),
                        branch="main"
                    )
                except Exception as e:
                    # Update file if it already exists
                    contents = repo.get_contents(filename)
                    repo.update_file(
                        contents.path,
                        commit_message,
                        content if isinstance(content, bytes) else content.encode(),
                        contents.sha,
                        branch="main"
                    )
        
        return jsonify({
            "status": "success",
            "message": "Model exported to GitHub successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
