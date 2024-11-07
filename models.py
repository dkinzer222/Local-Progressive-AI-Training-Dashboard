from database import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import json

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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'data': self.data
        }

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
        api_key = secrets.token_urlsafe(32)
        self.api_key_hash = generate_password_hash(api_key)
        return api_key
    
    def verify_api_key(self, api_key):
        return check_password_hash(self.api_key_hash, api_key)
    
    def __repr__(self):
        return f'<AIModel {self.name} v{self.version}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'created_at': self.created_at.isoformat(),
            'configuration': self.configuration,
            'state': self.state,
            'datasets': [ds.to_dict() for ds in self.datasets]
        }
    
    @staticmethod
    def from_dict(data):
        model = AIModel(
            name=data['name'],
            version=data.get('version', '1.0'),
            configuration=data.get('configuration', {}),
            state=data.get('state', {})
        )
        
        if 'datasets' in data:
            for ds_data in data['datasets']:
                dataset = Dataset(
                    name=ds_data['name'],
                    version=ds_data['version'],
                    description=ds_data.get('description', ''),
                    data=ds_data['data']
                )
                model.datasets.append(dataset)
        
        return model
    
    def serialize_state(self):
        try:
            return {
                'model_info': self.to_dict(),
                'metadata': {
                    'export_date': datetime.utcnow().isoformat(),
                    'format_version': '1.0'
                }
            }
        except Exception as e:
            raise ValueError(f"Error serializing model state: {str(e)}")
    
    @staticmethod
    def validate_import_data(data):
        required_fields = ['model_info', 'metadata']
        if not all(field in data for field in required_fields):
            raise ValueError("Invalid model file format: missing required fields")
            
        model_info = data['model_info']
        required_model_fields = ['name', 'version', 'configuration', 'state']
        if not all(field in model_info for field in required_model_fields):
            raise ValueError("Invalid model info format: missing required fields")
            
        return True
