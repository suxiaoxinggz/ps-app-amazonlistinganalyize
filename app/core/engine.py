import chromadb
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
from sklearn.feature_extraction.text import CountVectorizer
import os
import pandas as pd
from typing import List, Dict, Any, Tuple
import re

class HybridMatcher:
    def __init__(self, collection_name: str = "amazon_keywords"):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        self.sentiment_model_name = os.getenv("SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english")
        self.normalize_embeddings = os.getenv("EMBEDDING_NORMALIZE", "true").lower() in {"1", "true", "yes", "on"}

        # 1. Text Embedding Model. BGE-small is still lightweight (384 dimensions)
        # but generally stronger than all-MiniLM-L6-v2 for semantic matching.
        self.embedding_model = SentenceTransformer(self.embedding_model_name)
        # 2. Sentiment Analysis Model (optional gateway feature). Keep the small
        # SST-2 model by default and allow replacement via SENTIMENT_MODEL.
        try:
            self.sentiment_analyzer = pipeline("sentiment-analysis", model=self.sentiment_model_name)
        except Exception as e:
            print(f"Warning: Could not load sentiment model {self.sentiment_model_name}: {e}")
            self.sentiment_analyzer = None

        self.collection = self.client.get_or_create_collection(name=collection_name)

    def _encode(self, texts, **kwargs):
        return self.embedding_model.encode(
            texts,
            normalize_embeddings=self.normalize_embeddings,
            **kwargs,
        )

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Gateway Method: Returns raw embeddings for a list of texts.
        """
        if not texts:
            return []
        embeddings = self._encode(texts).tolist()
        return embeddings

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Gateway Method: Calculates cosine similarity between two texts.
        """
        emb1 = self._encode(text1, convert_to_tensor=True)
        emb2 = self._encode(text2, convert_to_tensor=True)
        score = util.cos_sim(emb1, emb2)
        return float(score[0][0])
        
    def analyze_sentiment(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Gateway Method: Returns sentiment labels and scores.
        """
        if not self.sentiment_analyzer:
            return [{"label": "ERROR", "score": 0.0}] * len(texts)
        # Truncate to 512 tokens to secure against crashes
        return self.sentiment_analyzer(texts, truncation=True, max_length=512)

    def extract_keywords(self, text: str, top_n: int = 5) -> List[str]:
        """
        Gateway Method: KeyBERT-Lite implementation.
        Extracts keywords based on semantic similarity to the document.
        """
        # 1. Extract candidates (n-grams)
        n_gram_range = (1, 1)
        stop_words = "english"
        
        try:
            count = CountVectorizer(ngram_range=n_gram_range, stop_words=stop_words).fit([text])
            candidates = count.get_feature_names_out()
        except Exception:
            return []

        doc_embedding = self._encode([text])
        candidate_embeddings = self._encode(candidates)

        # 2. Calculate distances
        distances = util.cos_sim(doc_embedding, candidate_embeddings)
        
        # 3. Get top N
        keywords = [candidates[index] for index in distances.argsort()[0][-top_n:]]
        return list(reversed(keywords))
        
    def index_keywords(self, keywords_data: List[Dict[str, Any]]):
        """
        Indexes keywords into ChromaDB.
        keywords_data: List of dicts, must contain 'keyword' key.
        """
        # Reset collection to avoid ID conflicts and stale data
        collection_name = self.collection.name
        try:
            self.client.delete_collection(collection_name)
        except Exception:
            pass
        self.collection = self.client.create_collection(name=collection_name)

        documents = []
        metadatas = []
        ids = []
        
        for idx, item in enumerate(keywords_data):
            kw = item.get('keyword')
            if not kw:
                continue
                
            documents.append(kw)
            # Store all other fields as metadata
            # ChromaDB metadata values must be str, int, float, or bool
            meta = {}
            for k, v in item.items():
                if k != 'keyword':
                    meta[k] = str(v)
            metadatas.append(meta)
            ids.append(f"kw_{idx}")
            
        if documents:
            # Generate embeddings
            embeddings = self._encode(documents).tolist()
            
            # Batch add to avoid ChromaDB batch size limits
            batch_size = 5000
            for i in range(0, len(documents), batch_size):
                end = min(i + batch_size, len(documents))
                self.collection.add(
                    documents=documents[i:end],
                    embeddings=embeddings[i:end],
                    metadatas=metadatas[i:end],
                    ids=ids[i:end]
                )
            
    def text_match(self, listing_text: str, keywords: List[str]) -> List[str]:
        """
        Performs exact/phrase matching (A9 simulation).
        Returns keywords that are present in the listing text.
        """
        listing_lower = listing_text.lower()
        matches = []
        
        for kw in keywords:
            # Simple inclusion check. 
            # For more complex A9 sim, we might check for exact phrase vs broad.
            if kw.lower() in listing_lower:
                matches.append(kw)
                
        return matches

    def vector_search(self, query_text: str, n_results: int = 10) -> List[Dict[str, Any]]:
        """
        Performs semantic search using vector embeddings.
        """
        query_embedding = self._encode([query_text]).tolist()
        
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results
        )
        
        # Parse results
        parsed_results = []
        if results['documents']:
            for i in range(len(results['documents'][0])):
                parsed_results.append({
                    'keyword': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if results['distances'] else None
                })
                
        return parsed_results

    def analyze_listing(self, listing_text: str, all_keywords: List[str]) -> Dict[str, Any]:
        """
        Analyzes a listing against the indexed keywords.
        Returns coverage stats and matches.
        """
        # 1. Text Match (Exact/Phrase)
        text_matches = self.text_match(listing_text, all_keywords)
        
        # 2. Vector Match (Semantic gaps)
        # We search for the listing text itself to find semantically related keywords
        # that might be missing from the text.
        vector_matches = self.vector_search(listing_text, n_results=20)
        
        return {
            'text_matches': text_matches,
            'vector_suggestions': vector_matches,
            'coverage_count': len(text_matches),
            'total_keywords': len(all_keywords),
            'coverage_percentage': (len(text_matches) / len(all_keywords)) * 100 if all_keywords else 0
        }
