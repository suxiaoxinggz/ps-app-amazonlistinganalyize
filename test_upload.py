import requests
import os

# Create a dummy excel file if not exists
import pandas as pd

def create_dummy_excel():
    df = pd.DataFrame({
        'Keyword': ['test keyword', 'another keyword'],
        'Search Volume': [1000, 500]
    })
    df.to_excel('test_upload.xlsx', index=False)
    return 'test_upload.xlsx'

def test_upload():
    filename = create_dummy_excel()
    api_host = os.getenv('API_HOST', 'http://localhost:8000').rstrip('/')
    url = f'{api_host}/upload'
    
    try:
        with open(filename, 'rb') as f:
            files = {'file': f}
            print(f"Uploading {filename} to {url}...")
            response = requests.post(url, files=files)
            
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("Upload SUCCESS")
        else:
            print("Upload FAILED")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    test_upload()
