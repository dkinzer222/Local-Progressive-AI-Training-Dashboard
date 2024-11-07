import os
from flask import Flask, render_template, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from sqlalchemy.orm import DeclarativeBase
from utils.ai_engine import AIEngine
import json
from functools import wraps
from datasets import load_dataset
from huggingface_hub import list_datasets
import time
from werkzeug.utils import secure_filename
import tempfile

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "dev_key"

socketio = SocketIO(app)
db.init_app(app)

from models import TrainingData, AIMemory, Dataset, AIModel

ai_engine = AIEngine()

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
def list_local_datasets():
    datasets = Dataset.query.all()
    return jsonify({
        "datasets": [
            {
                "id": ds.id,
                "name": ds.name,
                "version": ds.version,
                "description": ds.description,
                "created_at": ds.created_at.isoformat()
            } for ds in datasets
        ]
    })

@app.route('/api/datasets/huggingface/search', methods=['GET'])
def search_huggingface_datasets():
    query = request.args.get('query', '')
    try:
        datasets = list_datasets()
        filtered_datasets = [ds for ds in datasets if query.lower() in ds.id.lower()]
        return jsonify({
            "datasets": [
                {
                    "id": ds.id,
                    "name": ds.id.split('/')[-1],
                    "description": ds.description,
                    "downloads": ds.downloads,
                    "likes": ds.likes
                } for ds in filtered_datasets[:10]
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/datasets/huggingface/preview/<path:dataset_id>', methods=['GET'])
def preview_huggingface_dataset(dataset_id):
    try:
        dataset = load_dataset(dataset_id, split='train[:5]')
        return jsonify({
            "samples": dataset[:5],
            "features": dataset.features
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/datasets/huggingface/import', methods=['POST'])
@require_api_key
def import_huggingface_dataset():
    data = request.json
    try:
        dataset_id = data.get('dataset_id')
        if not dataset_id:
            return jsonify({"error": "No dataset ID provided"}), 400

        hf_dataset = load_dataset(dataset_id, split='train[:100]')
        
        dataset = Dataset(
            name=f"HuggingFace: {dataset_id}",
            version="1.0",
            description=f"Imported from HuggingFace: {dataset_id}",
            data=hf_dataset[:100]
        )
        db.session.add(dataset)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "dataset_id": dataset.id,
            "message": f"Successfully imported {dataset_id}"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/models', methods=['GET'])
def list_models():
    models = AIModel.query.all()
    return jsonify({
        "models": [
            {
                "id": model.id,
                "name": model.name,
                "version": model.version,
                "created_at": model.created_at.isoformat()
            } for model in models
        ]
    })

@app.route('/api/models', methods=['POST'])
def create_model():
    data = request.json
    try:
        model = AIModel(
            name=data['name'],
            version=data.get('version', '1.0'),
            configuration=data.get('configuration', {}),
            state=ai_engine.memory
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
        
        export_data = {
            "name": model.name,
            "version": model.version,
            "created_at": model.created_at.isoformat(),
            "configuration": model.configuration,
            "state": model.state,
            "metadata": {
                "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
                "format_version": "1.0"
            }
        }
        
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
            required_fields = ['name', 'version', 'configuration', 'state']
            if not all(field in import_data for field in required_fields):
                return jsonify({"error": "Invalid model file format"}), 400
                
            model = AIModel(
                name=f"{import_data['name']} (Imported)",
                version=import_data['version'],
                configuration=import_data['configuration'],
                state=import_data['state']
            )
            
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
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train():
    data = request.json
    if 'training_data' not in data:
        return jsonify({"status": "error", "message": "No training data provided"}), 400
    
    results = []
    try:
        for item in data['training_data']:
            if not item.get('input') or not item.get('output'):
                continue
                
            training_data = TrainingData(
                input_text=item['input'],
                expected_output=item['output'],
                level=data.get('level', 1)
            )
            db.session.add(training_data)
            
            score, message, patterns = ai_engine.train(item['input'], item['output'])
            training_data.score = score
            results.append({
                "score": score,
                "message": message,
                "patterns": patterns
            })
        
        db.session.commit()
        return jsonify({
            "status": "success",
            "results": results
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Training error: {str(e)}"
        }), 500

@socketio.on('start_training')
def handle_training(data):
    current_level = data.get('current_level', 1)
    training_data = data.get('data', [])
    
    if not training_data:
        emit('training_progress', {
            'progress': 0,
            'level': current_level,
            'message': 'No training data provided',
            'score': 0,
            'patterns': {},
            'operation': 'Idle',
            'iterations': 0
        })
        return
    
    operations = [
        'Analyzing input patterns',
        'Learning letter combinations',
        'Building pattern database',
        'Optimizing neural pathways',
        'Validating learned patterns'
    ]
    
    try:
        total_operations = len(training_data) * len(operations)
        operation_count = 0
        
        for i, item in enumerate(training_data):
            if not item.get('input') or not item.get('output'):
                continue
            
            for op_idx, operation in enumerate(operations):
                operation_count += 1
                overall_progress = (operation_count / total_operations) * 100
                
                time.sleep(0.1)
                
                score, message, patterns = ai_engine.train(item['input'], item['output'])
                
                memory = AIMemory(
                    pattern_type='basic',
                    pattern=item['input'],
                    confidence=score
                )
                db.session.add(memory)
                db.session.commit()
                
                emit('training_progress', {
                    'progress': overall_progress,
                    'level': ai_engine.current_level,
                    'message': f"{operation}: {message}",
                    'score': score,
                    'patterns': patterns,
                    'operation': operation,
                    'iterations': operation_count,
                    'success_rate': score,
                    'pattern_diversity': len(patterns) / max(1, len(training_data))
                })
                
    except Exception as e:
        db.session.rollback()
        emit('training_progress', {
            'progress': 100,
            'level': current_level,
            'message': f"Training error: {str(e)}",
            'score': 0,
            'patterns': {},
            'operation': 'Error',
            'iterations': 0
        })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        user_input = request.json.get('message', '')
        if not user_input:
            return jsonify({"response": "Please provide a message"}), 400
            
        response, confidence = ai_engine.generate_response(user_input)
        
        return jsonify({
            "response": response,
            "confidence": confidence
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Chat error: {str(e)}"
        }), 500

with app.app_context():
    db.create_all()