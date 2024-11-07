from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

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

class Dataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.JSON, nullable=False)
    model_id = db.Column(db.Integer, db.ForeignKey('ai_model.id'))
    
    def __repr__(self):
        return f'<Dataset {self.name} v{self.version}>'

class AIModel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    api_key_hash = db.Column(db.String(256))
    configuration = db.Column(db.JSON)
    state = db.Column(db.JSON)
    datasets = db.relationship('Dataset', backref='model', lazy=True)
    
    def set_api_key(self):
        """Generate a new API key and store its hash"""
        api_key = secrets.token_urlsafe(32)
        self.api_key_hash = generate_password_hash(api_key)
        return api_key
    
    def verify_api_key(self, api_key):
        """Verify the provided API key"""
        return check_password_hash(self.api_key_hash, api_key)
    
    def __repr__(self):
        return f'<AIModel {self.name} v{self.version}>'
