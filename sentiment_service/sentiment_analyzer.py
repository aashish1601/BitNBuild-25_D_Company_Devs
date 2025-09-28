#!/usr/bin/env python3
"""
Advanced Sentiment Analysis Service for Social Shopping Agent
Uses Hugging Face transformers for accurate sentiment classification
"""

import json
import sys
from typing import List, Dict, Any
from transformers import pipeline
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    def __init__(self):
        """Initialize the sentiment analysis pipeline"""
        try:
            # Load pre-trained sentiment analysis model
            # Using a model that supports positive, negative, and neutral classification
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis", 
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                return_all_scores=True
            )
            logger.info("Sentiment analysis model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentiment model: {e}")
            # Fallback to a simpler model
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english"
            )
            logger.info("Fallback sentiment model loaded")

    def classify_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Classify the sentiment of a single text
        
        Args:
            text: The input text to analyze
            
        Returns:
            Dictionary with sentiment classification results
        """
        try:
            if not text or len(text.strip()) < 3:
                return {
                    "sentiment": "neutral",
                    "confidence": 0.5,
                    "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
                }
            
            # Clean the text
            clean_text = text.strip()
            
            # Get sentiment analysis results
            results = self.sentiment_pipeline(clean_text)
            
            # Handle different model output formats
            if isinstance(results, list) and len(results) > 0:
                if isinstance(results[0], list):
                    # Multiple scores format
                    scores = {item['label'].lower(): item['score'] for item in results[0]}
                    best_sentiment = max(scores.items(), key=lambda x: x[1])
                else:
                    # Single result format
                    scores = {item['label'].lower(): item['score'] for item in results}
                    best_sentiment = max(scores.items(), key=lambda x: x[1])
            else:
                # Fallback
                return {
                    "sentiment": "neutral",
                    "confidence": 0.5,
                    "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
                }
            
            # Normalize sentiment labels
            sentiment = best_sentiment[0].lower()
            confidence = best_sentiment[1]
            
            # Map to standard labels
            if sentiment in ['positive', 'pos']:
                sentiment = 'positive'
            elif sentiment in ['negative', 'neg']:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
            
            # Ensure we have all three scores
            normalized_scores = {
                "positive": scores.get('positive', scores.get('pos', 0.33)),
                "negative": scores.get('negative', scores.get('neg', 0.33)),
                "neutral": scores.get('neutral', 0.34)
            }
            
            # Normalize scores to sum to 1
            total = sum(normalized_scores.values())
            if total > 0:
                normalized_scores = {k: v/total for k, v in normalized_scores.items()}
            
            return {
                "sentiment": sentiment,
                "confidence": confidence,
                "scores": normalized_scores
            }
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return {
                "sentiment": "neutral",
                "confidence": 0.5,
                "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
            }

    def analyze_reviews(self, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze a list of reviews and provide comprehensive sentiment analysis
        
        Args:
            reviews: List of review dictionaries with 'text' and 'rating' keys
            
        Returns:
            Comprehensive analysis results
        """
        try:
            if not reviews:
                return {
                    "total_reviews": 0,
                    "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
                    "average_confidence": 0,
                    "top_positive": [],
                    "top_negative": [],
                    "sentiment_summary": "No reviews to analyze"
                }
            
            # Analyze each review
            analyzed_reviews = []
            sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
            total_confidence = 0
            
            for review in reviews:
                text = review.get('text', '')
                rating = review.get('rating', 0)
                
                # Get sentiment analysis
                sentiment_result = self.classify_sentiment(text)
                
                # Create enhanced review object
                enhanced_review = {
                    **review,
                    "sentiment": sentiment_result["sentiment"],
                    "confidence": sentiment_result["confidence"],
                    "sentiment_scores": sentiment_result["scores"]
                }
                
                analyzed_reviews.append(enhanced_review)
                sentiment_counts[sentiment_result["sentiment"]] += 1
                total_confidence += sentiment_result["confidence"]
            
            # Calculate statistics
            total_reviews = len(analyzed_reviews)
            average_confidence = total_confidence / total_reviews if total_reviews > 0 else 0
            
            # Find top positive and negative reviews
            positive_reviews = [r for r in analyzed_reviews if r["sentiment"] == "positive"]
            negative_reviews = [r for r in analyzed_reviews if r["sentiment"] == "negative"]
            
            # Sort by confidence and take top 3
            top_positive = sorted(positive_reviews, key=lambda x: x["confidence"], reverse=True)[:3]
            top_negative = sorted(negative_reviews, key=lambda x: x["confidence"], reverse=True)[:3]
            
            # Generate sentiment summary
            sentiment_summary = self.generate_sentiment_summary(sentiment_counts, total_reviews, average_confidence)
            
            return {
                "total_reviews": total_reviews,
                "sentiment_distribution": sentiment_counts,
                "average_confidence": average_confidence,
                "top_positive": top_positive,
                "top_negative": top_negative,
                "sentiment_summary": sentiment_summary,
                "all_reviews": analyzed_reviews
            }
            
        except Exception as e:
            logger.error(f"Error in review analysis: {e}")
            return {
                "total_reviews": 0,
                "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
                "average_confidence": 0,
                "top_positive": [],
                "top_negative": [],
                "sentiment_summary": f"Analysis failed: {str(e)}"
            }

    def generate_sentiment_summary(self, sentiment_counts: Dict, total_reviews: int, avg_confidence: float) -> str:
        """Generate a human-readable sentiment summary"""
        try:
            if total_reviews == 0:
                return "No reviews available for analysis"
            
            positive_pct = (sentiment_counts["positive"] / total_reviews) * 100
            negative_pct = (sentiment_counts["negative"] / total_reviews) * 100
            neutral_pct = (sentiment_counts["neutral"] / total_reviews) * 100
            
            # Determine overall sentiment
            if positive_pct > 60:
                overall = "overwhelmingly positive"
            elif positive_pct > 40:
                overall = "generally positive"
            elif negative_pct > 60:
                overall = "overwhelmingly negative"
            elif negative_pct > 40:
                overall = "generally negative"
            else:
                overall = "mixed"
            
            confidence_level = "high" if avg_confidence > 0.8 else "medium" if avg_confidence > 0.6 else "low"
            
            summary = f"""Sentiment Analysis Summary:
• Overall sentiment: {overall}
• Positive reviews: {sentiment_counts['positive']} ({positive_pct:.1f}%)
• Negative reviews: {sentiment_counts['negative']} ({negative_pct:.1f}%)
• Neutral reviews: {sentiment_counts['neutral']} ({neutral_pct:.1f}%)
• Analysis confidence: {confidence_level} ({avg_confidence:.2f})"""
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Unable to generate sentiment summary"

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python sentiment_analyzer.py <text_to_analyze>")
        sys.exit(1)
    
    text = sys.argv[1]
    analyzer = SentimentAnalyzer()
    result = analyzer.classify_sentiment(text)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
