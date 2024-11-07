import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from sqlalchemy.orm import DeclarativeBase
from utils.ai_engine import AIEngine

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

from models import TrainingData, AIMemory

# Initialize AI Engine
ai_engine = AIEngine()

@app.route('/')
def index():
    return render_template('index.html')

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
            
            # Train AI Engine
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
            'patterns': {}
        })
        return
    
    try:
        for i, item in enumerate(training_data):
            if not item.get('input') or not item.get('output'):
                continue
                
            # Train the AI
            score, message, patterns = ai_engine.train(item['input'], item['output'])
            progress = ((i + 1) / len(training_data)) * 100
            
            # Store pattern in memory
            memory = AIMemory(
                pattern_type='basic',
                pattern=item['input'],
                confidence=score
            )
            db.session.add(memory)
            db.session.commit()
            
            # Emit progress with visualization data
            emit('training_progress', {
                'progress': progress,
                'level': ai_engine.current_level,
                'message': message,
                'score': score,
                'patterns': patterns
            })
            
    except Exception as e:
        db.session.rollback()
        emit('training_progress', {
            'progress': 100,
            'level': current_level,
            'message': f"Training error: {str(e)}",
            'score': 0,
            'patterns': {}
        })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        user_input = request.json.get('message', '')
        if not user_input:
            return jsonify({"response": "Please provide a message"}), 400
            
        # Get response from AI Engine
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
