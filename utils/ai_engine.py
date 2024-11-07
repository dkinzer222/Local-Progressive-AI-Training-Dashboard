import random
from typing import List, Dict, Tuple

class AIEngine:
    def __init__(self):
        self.memory = {
            'patterns': {},
            'responses': {},
            'confidence_scores': {}
        }
        self.current_level = 1
        self.max_level = 10
        
    def train(self, input_text: str, expected_output: str) -> Tuple[float, str]:
        # Training logic for different levels
        if self.current_level <= 3:
            # Basic pattern recognition
            score = self._train_basic_patterns(input_text, expected_output)
        elif self.current_level <= 6:
            # Intermediate pattern recognition
            score = self._train_intermediate_patterns(input_text, expected_output)
        else:
            # Advanced pattern recognition
            score = self._train_advanced_patterns(input_text, expected_output)
            
        return score, f"Training completed for level {self.current_level}"
    
    def _train_basic_patterns(self, input_text: str, expected_output: str) -> float:
        words = input_text.lower().split()
        pattern_key = ' '.join(words)
        
        if pattern_key not in self.memory['patterns']:
            self.memory['patterns'][pattern_key] = []
        
        self.memory['patterns'][pattern_key].append(expected_output)
        self.memory['confidence_scores'][pattern_key] = 0.7
        
        return 0.7
    
    def _train_intermediate_patterns(self, input_text: str, expected_output: str) -> float:
        # More sophisticated pattern recognition
        score = random.uniform(0.6, 0.9)
        return score
    
    def _train_advanced_patterns(self, input_text: str, expected_output: str) -> float:
        # Complex pattern recognition
        score = random.uniform(0.7, 1.0)
        return score
    
    def generate_response(self, input_text: str) -> Tuple[str, float]:
        if not self.memory['patterns']:
            return "I haven't learned enough patterns yet.", 0.1
            
        best_match = None
        best_score = 0
        
        for pattern in self.memory['patterns']:
            similarity = self._calculate_similarity(input_text, pattern)
            if similarity > best_score:
                best_score = similarity
                best_match = pattern
                
        if best_match:
            responses = self.memory['patterns'][best_match]
            return random.choice(responses), best_score
            
        return "I'm not sure how to respond to that.", 0.3
        
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0
