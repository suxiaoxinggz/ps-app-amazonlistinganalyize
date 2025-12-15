import sys
from unittest.mock import MagicMock

# Forcefully patch cpuinfo to prevent crash on Leapcell/Docker
# We overwrite it even if it's already loaded, and we also patch the get_cpu_info function
# to ensure any existing references might also be caught (though sys.modules replacement is the main fix)

mock_cpuinfo = MagicMock()
mock_cpuinfo.get_cpu_info.return_value = {
    "arch": "X86_64", 
    "brand_raw": "Intel(R) Xeon(R) CPU @ 2.20GHz",
    "bits": 64,
    "count": 4,
    "flags": []
}

# 1. Overwrite in sys.modules
sys.modules["cpuinfo"] = mock_cpuinfo

# 2. Also try to patch the real module if it was already imported, just in case
try:
    import importlib
    real_cpuinfo = importlib.import_module("cpuinfo")
    real_cpuinfo.get_cpu_info = mock_cpuinfo.get_cpu_info
except (ImportError, Exception):
    pass
