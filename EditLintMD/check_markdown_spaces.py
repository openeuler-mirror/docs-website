import argparse
import re
import sys
import os
from common import get_pr_files


def check_spaces(file_path):
    # 定义检查规则
    chinese_pattern = re.compile(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])')
    english_pattern = re.compile(r'([a-zA-Z])\s{2,}([a-zA-Z])')
    punctuation_pattern = re.compile(r'([\u4e00-\u9fff])\s+([，。、；：？！）】」』])')
    punctuation_pattern2 = re.compile(r'([（【「『])\s+([\u4e00-\u9fff])')

    issues = []

    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            # 忽略代码块和链接
            if line.strip().startswith('```') or '`' in line or 'http' in line:
                continue

            # 检查中文之间的多余空格
            for match in chinese_pattern.finditer(line):
                issues.append(f"行 {line_num}: 中文之间有多余空格: '{match.group(0)}'")

            # 检查英文单词之间的多余空格（两个及以上空格）
            for match in english_pattern.finditer(line):
                issues.append(f"行 {line_num}: 英文单词之间有多个空格: '{match.group(0)}'")

            # 检查中文和标点之间的多余空格
            for match in punctuation_pattern.finditer(line):
                issues.append(f"行 {line_num}: 中文和结束标点之间有多余空格: '{match.group(0)}'")

            for match in punctuation_pattern2.finditer(line):
                issues.append(f"行 {line_num}: 中文和开始标点之间有多余空格: '{match.group(0)}'")

    return issues

def main():
    """
    主函数，处理指定的 Markdown 文件
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--dirs',
                        default="docs/zh/,docs/en/",
                        help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
    args = parser.parse_args()
    markdown_files = get_pr_files(args.dirs)
    errors = []

    for file_path in markdown_files:
        if not os.path.exists(file_path):
            error = f"File does not exist: {file_path}"
            errors.append(error)
            continue
        if not file_path.lower().endswith('.md'):
            continue
        errors = check_spaces(file_path)

    if errors:
        print("The following links are invalid:")
        for error in errors:
            print(error)
        sys.exit(1)
    else:
        print("\nAll links are valid.")

if __name__ == "__main__":
    main()
