from app import db
from datetime import datetime

class TrainingData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    input_text = db.Column(db.Text, nullable=False)
    expected_output = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    score = db.Column(db.Float, default=0.0)
    level = db.Column(db.Integer, default=1)

class AIMemory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pattern_type = db.Column(db.String(50), nullable=False)
    pattern = db.Column(db.Text, nullable=False)
    confidence = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
