import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from sqlalchemy.orm import DeclarativeBase

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/train', methods=['POST'])
def train():
    data = request.json
    training_data = TrainingData(
        input_text=data['input'],
        expected_output=data['output']
    )
    db.session.add(training_data)
    db.session.commit()
    return jsonify({"status": "success"})

@socketio.on('start_training')
def handle_training(data):
    # Training progress updates via WebSocket
    for i in range(10):
        socketio.emit('training_progress', {
            'progress': i * 10,
            'level': data['current_level'],
            'message': f'Training level {data["current_level"]}: {i * 10}% complete'
        })

@app.route('/api/chat', methods=['POST'])
def chat():
    user_input = request.json['message']
    # Get response from AI memory
    memories = AIMemory.query.all()
    # Simple response based on trained patterns
    response = "AI Response based on training"
    return jsonify({"response": response})

with app.app_context():
    db.create_all()
