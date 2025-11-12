import argparse
import os
import re
import logging
from typing import Dict, List

from common import get_pr_files

# 配置日志记录
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 定义允许的字符模式：小写字母、数字和下划线
ALLOWED_PATTERN = re.compile(r'^[a-z0-9_]+$')


def check_naming_convention(path: str) -> Dict[str, List[str]]:
    """
    检查给定路径下的Markdown文件和文件夹命名是否符合规范

    Args:
        path: 要检查的目录路径

    Returns:
        包含错误信息的字典，格式为 {'invalid_files': [], 'invalid_dirs': []}
    """
    result = {'invalid_files': [], 'invalid_dirs': []}

    if not os.path.exists(path):
        logging.error(f"Directory not found: {path}")
        return result

    for root, dirs, files in os.walk(path):
        # 检查文件夹命名（所有文件夹都需要检查，因为它们可能包含Markdown文件）
        for dir_name in dirs:
            if not ALLOWED_PATTERN.fullmatch(dir_name):
                relative_path = os.path.relpath(os.path.join(root, dir_name), path)
                result['invalid_dirs'].append(relative_path)

        # 检查Markdown文件命名（只检查.md文件）
        for file_name in files:
            if file_name.endswith('.md'):
                base_name, ext = os.path.splitext(file_name)
                if not ALLOWED_PATTERN.fullmatch(base_name):
                    relative_path = os.path.relpath(os.path.join(root, file_name), path)
                    result['invalid_files'].append(relative_path)

    return result


def format_naming_error_report(naming_errors: Dict[str, Dict[str, List[str]]]) -> str:
    """
    格式化命名规范错误报告

    Args:
        naming_errors: 命名规范错误

    Returns:
        格式化的错误报告字符串
    """
    report = []

    for dir_name, dir_errors in naming_errors.items():
        if not any(dir_errors.values()):
            continue

        report.append(f"\n命名规范检查 - {dir_name}:")

        if dir_errors['invalid_dirs']:
            report.append("不符合规范的文件夹:")
            for item in dir_errors['invalid_dirs']:
                report.append(f"  - {item}")

        if dir_errors['invalid_files']:
            report.append("不符合规范的Markdown文件:")
            for item in dir_errors['invalid_files']:
                report.append(f"  - {item}")

    return "\n".join(report) if report else "所有命名规范检查通过"


def main():
    """
    主函数，执行命名规范检查
    """
    # 初始化参数解析
    parser = argparse.ArgumentParser(
        description='Markdown文件和目录命名规范检查工具',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--dirs',
                        default="docs/zh/,docs/en/",
                        help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')

    args = parser.parse_args()
    markdown_files = get_pr_files(args.dirs)
    if not markdown_files:
        return

    target_dirs = [d.strip() for d in args.dirs.split(',') if d.strip()]
    all_naming_errors = {}

    # 检查命名规范
    for target_dir in target_dirs:
        if not os.path.exists(target_dir):
            logging.warning(f"目标目录不存在: {target_dir}")
            continue

        logging.info(f"正在检查目录命名规范: {target_dir}")
        all_naming_errors[target_dir] = check_naming_convention(target_dir)

    # 输出报告
    report = format_naming_error_report(all_naming_errors)
    print(report)

    # 如果有错误，返回非零退出码
    if any(any(errors.values()) for errors in all_naming_errors.values()):
        exit(1)


if __name__ == "__main__":
    main()