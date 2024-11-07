import random
from typing import List, Dict, Tuple, Optional
import math

class AIEngine:
    def __init__(self):
        self.memory = {
            'patterns': {},
            'responses': {},
            'confidence_scores': {},
            'level_stats': {
                'training_count': 0,
                'success_rate': 0.0,
                'pattern_diversity': 0.0
            }
        }
        self.current_level = 1
        self.max_level = 10
        self.min_confidence_threshold = 0.6
        
    def train(self, input_text: str, expected_output: str) -> Tuple[float, str, Dict]:
        """Train the AI with input-output pairs and return score, message, and patterns"""
        try:
            # Validate input
            if not self._validate_input(input_text, expected_output):
                return 0.1, "Invalid input or output format", {}
            
            # Training logic for different levels
            if self.current_level <= 3:
                score = self._train_basic_patterns(input_text, expected_output)
            elif self.current_level <= 6:
                score = self._train_intermediate_patterns(input_text, expected_output)
            else:
                score = self._train_advanced_patterns(input_text, expected_output)
                
            # Update level statistics
            self._update_level_stats(score)
            
            # Get current patterns for visualization
            patterns = self._get_current_patterns()
            
            return score, f"Training completed for level {self.current_level}", patterns
            
        except Exception as e:
            print(f"Training error: {str(e)}")
            return 0.0, f"Training error: {str(e)}", {}
    
    def _validate_input(self, input_text: str, expected_output: str) -> bool:
        """Validate input and output text"""
        if not input_text or not expected_output:
            return False
        if len(input_text) < 2 or len(expected_output) < 2:
            return False
        return True
    
    def _train_basic_patterns(self, input_text: str, expected_output: str) -> float:
        """Train basic pattern recognition"""
        words = input_text.lower().split()
        pattern_key = ' '.join(words)
        
        if pattern_key not in self.memory['patterns']:
            self.memory['patterns'][pattern_key] = []
        
        self.memory['patterns'][pattern_key].append(expected_output)
        
        # Calculate pattern similarity score
        similarity = self._calculate_similarity(input_text, expected_output)
        self.memory['confidence_scores'][pattern_key] = max(
            similarity,
            self.memory['confidence_scores'].get(pattern_key, 0)
        )
        
        return similarity
    
    def _train_intermediate_patterns(self, input_text: str, expected_output: str) -> float:
        """Train intermediate pattern recognition with context awareness"""
        basic_score = self._train_basic_patterns(input_text, expected_output)
        context_score = self._analyze_context(input_text, expected_output)
        return (basic_score + context_score) / 2
    
    def _train_advanced_patterns(self, input_text: str, expected_output: str) -> float:
        """Train advanced pattern recognition with semantic understanding"""
        intermediate_score = self._train_intermediate_patterns(input_text, expected_output)
        semantic_score = self._analyze_semantics(input_text, expected_output)
        return (intermediate_score + semantic_score) / 2
    
    def _analyze_context(self, text1: str, text2: str) -> float:
        """Analyze contextual similarity between texts"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        common_words = words1.intersection(words2)
        total_words = words1.union(words2)
        
        if not total_words:
            return 0.0
            
        return len(common_words) / len(total_words)
    
    def _analyze_semantics(self, text1: str, text2: str) -> float:
        """Analyze semantic similarity between texts"""
        # Simple semantic analysis based on word length and pattern matching
        score = self._analyze_context(text1, text2)
        
        # Add bonus for similar sentence structure
        if abs(len(text1.split()) - len(text2.split())) <= 2:
            score += 0.1
            
        return min(1.0, score)
    
    def _update_level_stats(self, score: float):
        """Update level statistics based on training results"""
        stats = self.memory['level_stats']
        stats['training_count'] += 1
        stats['success_rate'] = (
            (stats['success_rate'] * (stats['training_count'] - 1) + score) / 
            stats['training_count']
        )
        
        # Update pattern diversity
        unique_patterns = len(self.memory['patterns'])
        total_patterns = sum(len(patterns) for patterns in self.memory['patterns'].values())
        stats['pattern_diversity'] = unique_patterns / max(1, total_patterns)
        
        # Check for level progression
        if (stats['success_rate'] > 0.8 and 
            stats['pattern_diversity'] > 0.6 and 
            stats['training_count'] >= 5):
            self._try_level_up()
    
    def _try_level_up(self):
        """Attempt to progress to the next level"""
        if self.current_level < self.max_level:
            self.current_level += 1
            self.memory['level_stats'] = {
                'training_count': 0,
                'success_rate': 0.0,
                'pattern_diversity': 0.0
            }
    
    def _get_current_patterns(self) -> Dict[str, float]:
        """Get current patterns and their confidence scores for visualization"""
        return {
            pattern: self.memory['confidence_scores'].get(pattern, 0.0)
            for pattern in self.memory['patterns']
        }
    
    def generate_response(self, input_text: str) -> Tuple[str, float]:
        """Generate response based on trained patterns"""
        if not self.memory['patterns']:
            return "I haven't learned enough patterns yet.", 0.1
            
        best_match = None
        best_score = 0
        
        # Find best matching pattern
        for pattern in self.memory['patterns']:
            similarity = self._calculate_similarity(input_text, pattern)
            confidence = self.memory['confidence_scores'].get(pattern, 0)
            combined_score = similarity * confidence
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = pattern
                
        if best_match and best_score > self.min_confidence_threshold:
            responses = self.memory['patterns'][best_match]
            return random.choice(responses), best_score
            
        return "I'm not sure how to respond to that.", max(0.3, best_score)
        
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0
