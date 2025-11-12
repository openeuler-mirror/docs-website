import argparse
import os
import subprocess
import sys
from common import get_pr_files

parser = argparse.ArgumentParser()
parser.add_argument('--dirs',
                    default="docs/zh/,docs/en/",
                    help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
args = parser.parse_args()
pr_files = get_pr_files(args.dirs)
normal = 0
for pr_file in pr_files:
    if not os.path.exists(pr_file):
        continue
    if ' ' in pr_file:
        pr_file = pr_file.replace(' ', '\ ')
    res = subprocess.call('codespell {}'.format(pr_file), shell=True)
    if res != 0:
        normal = 1
sys.exit(normal)
