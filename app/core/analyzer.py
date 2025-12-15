from typing import List, Dict, Any
from app.core.engine import HybridMatcher
from app.core.data_processor import DataProcessor
import pandas as pd

import json
import os
import math

class ListingAnalyzer:
    def __init__(self):
        self.matcher = HybridMatcher()
        self.processor = DataProcessor()
        self.cached_keywords = []
        self.cache_file = "keywords_cache.json"
        self._load_from_cache()

    def _load_from_cache(self):
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self.cached_keywords = json.load(f)
                print(f"Loaded {len(self.cached_keywords)} keywords from cache.")
            except Exception as e:
                print(f"Failed to load cache: {e}")

    def _save_to_cache(self):
        try:
            # Clean data for JSON (handle NaN)
            clean_data = []
            for k in self.cached_keywords:
                clean_item = {}
                for key, val in k.items():
                    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                        clean_item[key] = None
                    else:
                        clean_item[key] = val
                clean_data.append(clean_item)
                
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(clean_data, f, ensure_ascii=False)
        except Exception as e:
            print(f"Failed to save cache: {e}")

    def load_and_index_data(self, file_path: str):
        """
        Loads Excel data and indexes it into the vector database.
        """
        df = self.processor.load_excel(file_path)
        self.cached_keywords = self.processor.extract_metrics(df)
        
        # Apply Segmentation Logic
        self._apply_segmentation()
        
        # Save to cache
        self._save_to_cache()
        
        # Index into ChromaDB
        # Note: In a real app, we might want to check if already indexed to avoid re-embedding
        self.matcher.index_keywords(self.cached_keywords)
        
        return len(self.cached_keywords)

    def _apply_segmentation(self):
        """
        Tags keywords as Core, Mid-tail, or Long-tail based on search volume.
        """
        # Extract valid volumes
        volumes = [k['search_volume'] for k in self.cached_keywords if isinstance(k['search_volume'], (int, float)) and k['search_volume'] > 0]
        
        if not volumes:
            return

        # Calculate stats
        series = pd.Series(volumes)
        mean_val = series.mean()
        median_val = series.median()
        
        # Dynamic threshold for Core keywords
        core_threshold = (mean_val + median_val) / 2
        
        # Tag each keyword
        for k in self.cached_keywords:
            vol = k.get('search_volume', 0)
            if not isinstance(vol, (int, float)) or vol == 0:
                k['segment'] = 'Unknown'
                continue
                
            if vol >= core_threshold:
                k['segment'] = 'Core'
            elif vol >= median_val:
                k['segment'] = 'Mid-tail'
            else:
                k['segment'] = 'Long-tail'

    def analyze_listings(self, listings: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyzes multiple listings against the loaded keywords.
        listings: List of dicts with 'asin' and 'text' (title + bullets).
        """
        if not self.cached_keywords:
            raise ValueError("No keyword data loaded. Call load_and_index_data first.")

        all_keywords_list = [k['keyword'] for k in self.cached_keywords]
        
        # Calculate totals for denominator
        total_keywords = len(self.cached_keywords)
        total_search_volume = sum(k.get('search_volume', 0) for k in self.cached_keywords)
        
        results = {}
        matrix_data = [] # For the heatmap: Keyword | ASIN1 | ASIN2 ...

        # Pre-fill matrix with keyword data
        for k in self.cached_keywords:
            row = {
                'keyword': k['keyword'],
                'translation': k.get('translation', ''),
                'search_volume': k['search_volume'],
                'rank': k['search_rank'],
                'conversion_rate': k.get('conversion_rate', ''),
                'cpc': k.get('cpc_exact', ''),
                'competitors': k.get('competitor_count', ''),
                'segment': k.get('segment', 'Unknown')
            }
            matrix_data.append(row)

        # Analyze each listing
        for listing in listings:
            asin = listing['asin']
            text = listing['text']
            
            analysis = self.matcher.analyze_listing(text, all_keywords_list)
            
            # Calculate extended stats
            matched_keywords_set = set(analysis['text_matches'])
            matched_count = len(matched_keywords_set)
            
            matched_volume = 0
            
            # Segment Stats Initialization
            segment_stats = {
                'Core': {'total_count': 0, 'total_volume': 0, 'matched_count': 0, 'matched_volume': 0},
                'Mid-tail': {'total_count': 0, 'total_volume': 0, 'matched_count': 0, 'matched_volume': 0},
                'Long-tail': {'total_count': 0, 'total_volume': 0, 'matched_count': 0, 'matched_volume': 0},
                'Unknown': {'total_count': 0, 'total_volume': 0, 'matched_count': 0, 'matched_volume': 0}
            }

            for k in self.cached_keywords:
                seg = k.get('segment', 'Unknown')
                vol = k.get('search_volume', 0)
                
                # Update Totals
                if seg in segment_stats:
                    segment_stats[seg]['total_count'] += 1
                    segment_stats[seg]['total_volume'] += vol
                
                # Update Matched
                if k['keyword'] in matched_keywords_set:
                    matched_volume += vol
                    if seg in segment_stats:
                        segment_stats[seg]['matched_count'] += 1
                        segment_stats[seg]['matched_volume'] += vol
            
            # Add stats to result
            results[asin] = {
                'coverage_count': matched_count,
                'total_keywords': total_keywords,
                'coverage_percentage': (matched_count / total_keywords * 100) if total_keywords > 0 else 0,
                'matched_volume': matched_volume,
                'total_volume': total_search_volume,
                'volume_coverage': (matched_volume / total_search_volume * 100) if total_search_volume > 0 else 0,
                'segment_stats': segment_stats
            }
            
            # Update matrix
            for row in matrix_data:
                row[asin] = 1 if row['keyword'] in matched_keywords_set else 0

        # Helper to clean NaN values for JSON serialization
        def clean_nan(obj):
            if isinstance(obj, float):
                if math.isnan(obj) or math.isinf(obj):
                    return None
                return obj
            elif isinstance(obj, dict):
                return {k: clean_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan(v) for v in obj]
            return obj

        raw_result = {
            'summary': results,
            'matrix': matrix_data,
            'global_stats': {
                'total_keywords': total_keywords,
                'total_volume': total_search_volume
            }
        }
        
        return clean_nan(raw_result)
