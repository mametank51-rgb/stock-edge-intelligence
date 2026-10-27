"""Publish long histories separately; clients download only the selected stock on demand."""
from pathlib import Path
import runpy,sys
sys.argv.append('--long-history')
runpy.run_path(str(Path(__file__).with_name('collect-charts.py')),run_name='__main__')
