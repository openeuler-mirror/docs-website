import os
import subprocess
import sys
from common import get_pr_files


pr_files = get_pr_files()
link_dir = []
for pr_file in pr_files:
    if not os.path.exists(pr_file):
        continue
    if ' ' in pr_file:
        pr_file = pr_file.replace(' ', '\ ')
    link_dir.append(pr_file)
command = 'python3 link_lint.py -p={} -w=white_list.txt'.format(','.join(link_dir))
res = subprocess.call(command, shell=True)
if res != 0:
    sys.exit(1)
