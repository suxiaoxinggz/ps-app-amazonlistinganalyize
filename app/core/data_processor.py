import pandas as pd
import io
from typing import List, Dict, Any

class DataProcessor:
    def __init__(self):
        pass

    def load_excel(self, file_path: str) -> pd.DataFrame:
        """
        Loads the Excel file, dynamically finding the header row.
        """
        try:
            # 1. Read first few rows to find the header
            # We look for a row containing "关键词" or "Keyword"
            preview = pd.read_excel(file_path, nrows=10, header=None)
            header_row_idx = -1
            
            for idx, row in preview.iterrows():
                row_str = row.astype(str).values
                if any('关键词' in s for s in row_str) or any('Keyword' in s for s in row_str):
                    header_row_idx = idx
                    break
            
            if header_row_idx == -1:
                # Fallback to 0 if not found
                header_row_idx = 0

            # 2. Read actual data with correct header
            # We handle multi-level headers by reading, then flattening
            # If header_row_idx is 0, we might still have multi-level (0, 1)
            # But let's try reading just that row first to see if it's enough
            
            # Strategy: Read with the found header row. 
            # If the file has 2-row headers (like the one we saw), the "Actual" column names might be split.
            # The previous logic used header=[0,1]. Let's try to adapt that.
            
            if header_row_idx == 0:
                # First try single-row header (most common case)
                df_single = pd.read_excel(file_path, header=0)
                # Check if a multi-index parse might be needed
                try:
                    df_multi = pd.read_excel(file_path, header=[0, 1])
                    if isinstance(df_multi.columns[0], tuple):
                        # Verify it's truly a multi-level header by checking
                        # if the second level has meaningful (non-Unnamed) values
                        has_real_sublevel = any(
                            "Unnamed" not in str(col[1]) and str(col[1]) != "nan"
                            for col in df_multi.columns
                        )
                        if has_real_sublevel:
                            # Flatten multi-index
                            new_columns = []
                            for col in df_multi.columns:
                                c1 = str(col[0]).strip()
                                c2 = str(col[1]).strip()
                                if "Unnamed" in c2 or c2 == "nan":
                                    final_col = c1
                                else:
                                    final_col = c2
                                new_columns.append(final_col)
                            df_multi.columns = new_columns
                            df = df_multi
                        else:
                            df = df_single
                    else:
                        df = df_single
                except Exception:
                    df = df_single
            else:
                # If header is deep (e.g. row 5), it's likely a single row header
                df = pd.read_excel(file_path, header=header_row_idx)

            # 3. Basic cleaning
            # Find the actual 'keyword' column name (it might be '关键词' or 'Keyword')
            kw_col = next((c for c in df.columns if '关键词' in str(c) or 'Keyword' in str(c)), None)
            
            if kw_col:
                # Standardize to '关键词' for internal processing
                df = df.rename(columns={kw_col: '关键词'})
                df = df[df['关键词'].notna()]
                df = df[df['关键词'] != '关键词'] # Remove repeated headers
            else:
                raise ValueError("Could not find '关键词' or 'Keyword' column")
            
            return df
            
        except Exception as e:
            raise ValueError(f"Error loading Excel file: {str(e)}")

    def extract_metrics(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extracts key metrics from the dataframe and converts to a list of dicts.
        """
        # Define the mapping of Excel columns to our internal schema
        # We use a list of possible names for each field to be robust
        field_mappings = {
            'keyword': ['关键词', 'Keyword', 'Search Term'],
            'translation': ['关键词翻译', 'Translation'],
            'search_volume': ['月搜索量', 'Search Volume', 'Volume'],
            'conversion_rate': ['词搜索转换比(%)', 'Conversion Rate', 'CVR'],
            'top3_click_share': ['点击转化占比TOP3 ASIN', 'Top 3 Click Share'],
            'asin_coverage': ['包含ASIN', 'ASINS'],
            'cpc_exact': ['cpc精准竞价($)', 'CPC (Exact)'],
            'search_rank': ['周搜索排名', 'Rank', 'Search Rank'],
            'competitor_count': ['竞品数量', 'Competitors']
        }
        
        # Create a new clean list of dicts
        records = []
        
        for _, row in df.iterrows():
            record = {}
            for field, possible_names in field_mappings.items():
                # Find the first matching column in the dataframe
                col_name = next((c for c in df.columns if c in possible_names), None)
                
                val = row.get(col_name, '') if col_name else ''
                
                # Data cleaning for specific fields
                if field == 'search_volume':
                    try:
                        val = int(float(str(val).replace(',', '').replace(' ', ''))) if val and str(val).strip() not in ('', '--', 'nan', 'None') else 0
                    except (ValueError, TypeError):
                        val = 0
                elif field == 'search_rank':
                    try:
                        val = int(float(str(val).replace(',', ''))) if val and str(val).strip() not in ('', '--', 'nan', 'None') else 999999
                    except (ValueError, TypeError):
                        val = 999999
                
                record[field] = val
            
            records.append(record)
            
        return records

if __name__ == "__main__":
    # Simple test
    pass
