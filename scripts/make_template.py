import pandas as pd
import os

# Define data
data = {
    'Keyword': ['wireless headphones', 'bluetooth earbuds', 'noise cancelling headphones'],
    'Search Volume': [50000, 35000, 20000],
    'Rank': [1, 5, 12],
    'CPC (Exact)': [1.50, 1.20, 2.00],
    'Competitors': [500, 300, 150]
}

df = pd.DataFrame(data)

# Ensure directory exists
os.makedirs('../frontend/public', exist_ok=True)

# Save
output_path = '../frontend/public/keyword_template.xlsx'
df.to_excel(output_path, index=False)
print(f"Created template at {output_path}")
