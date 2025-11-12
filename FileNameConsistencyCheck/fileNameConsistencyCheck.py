import argparse
import os
import logging
from typing import Dict, List, Tuple, Set

from common import get_pr_files

# 配置日志记录
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def get_document_structure(dir_path: str) -> Tuple[Set[str], Set[str]]:
    """
    获取目录下的文档结构

    Args:
        dir_path: 目录路径

    Returns:
        包含两个集合的元组：(文件集合, 目录集合)
    """
    files = set()
    dirs = set()

    if not os.path.exists(dir_path):
        return files, dirs

    for root, sub_dirs, file_names in os.walk(dir_path):
        rel_root = os.path.relpath(root, dir_path)

        # 添加目录结构
        if rel_root != '.':
            dir_parts = rel_root.split(os.sep)
            for i in range(1, len(dir_parts) + 1):
                dirs.add(os.path.join(*dir_parts[:i]))

        # 添加文件结构（只处理Markdown文件）
        for file_name in file_names:
            if file_name.endswith('.md'):
                base_name = os.path.splitext(file_name)[0]
                if rel_root == '.':
                    files.add(base_name)
                else:
                    files.add(os.path.join(rel_root, base_name))

    return files, dirs


def check_corresponding_docs(en_dir: str, zh_dir: str) -> Dict[str, List[str]]:
    """
    检查中英文文档是否一一对应

    Args:
        en_dir: 英文文档目录
        zh_dir: 中文文档目录

    Returns:
        包含错误信息的字典，格式为 {'missing_zh_files': [], 'missing_en_files': [], 'missing_zh_dirs': [], 'missing_en_dirs': []}
    """
    result = {
        'missing_zh_files': [],
        'missing_en_files': [],
        'missing_zh_dirs': [],
        'missing_en_dirs': []
    }

    # 获取中英文文档结构
    en_files, en_dirs = get_document_structure(en_dir)
    zh_files, zh_dirs = get_document_structure(zh_dir)

    # # 检查英文文档在中文中是否有对应
    # for en_file in en_files:
    #     if en_file not in zh_files:
    #         result['missing_zh_files'].append(en_file)

    # 检查中文文档在英文中是否有对应
    for zh_file in zh_files:
        if zh_file not in en_files:
            result['missing_en_files'].append(zh_file)

    # # 检查英文目录在中文中是否有对应
    # for en_dir_path in en_dirs:
    #     if en_dir_path not in zh_dirs:
    #         result['missing_zh_dirs'].append(en_dir_path)

    # # 检查中文目录在英文中是否有对应
    # for zh_dir_path in zh_dirs:
    #     if zh_dir_path not in en_dirs:
    #         result['missing_en_dirs'].append(zh_dir_path)

    return result


def format_correspondence_error_report(correspondence_errors: Dict[str, List[str]]) -> str:
    """
    格式化文档对应关系错误报告

    Args:
        correspondence_errors: 文档对应关系错误

    Returns:
        格式化的错误报告字符串
    """
    report = []

    if any(correspondence_errors.values()):
        report.append("文档对应关系检查:")

        if correspondence_errors['missing_zh_files']:
            report.append("中文缺失的英文Markdown文档:")
            for item in correspondence_errors['missing_zh_files']:
                report.append(f"  - {item}")

        if correspondence_errors['missing_en_files']:
            report.append("英文缺失的中文Markdown文档:")
            for item in correspondence_errors['missing_en_files']:
                report.append(f"  - {item}")

        if correspondence_errors['missing_zh_dirs']:
            report.append("中文缺失的英文目录:")
            for item in correspondence_errors['missing_zh_dirs']:
                report.append(f"  - {item}")

        if correspondence_errors['missing_en_dirs']:
            report.append("英文缺失的中文目录:")
            for item in correspondence_errors['missing_en_dirs']:
                report.append(f"  - {item}")

    return "\n".join(report) if report else "所有文档对应关系检查通过"


def main():
    """
    主函数，执行文档对应关系检查
    """
    # 初始化参数解析
    parser = argparse.ArgumentParser(
        description='中英文文档对应关系检查工具',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--dirs',
                        default="docs/en,docs/zh",
                        help='用逗号分隔的中英文文档目录（英文在前，中文在后），例如 "doc/en,doc/zh"')

    args = parser.parse_args()

    markdown_files = get_pr_files(args.dirs)
    if not markdown_files:
        return

    # 解析目录参数
    dirs = [d.strip() for d in args.dirs.split(',') if d.strip()]
    if len(dirs) != 2:
        logging.error("必须指定两个目录（英文和中文），用逗号分隔")
        exit(1)

    en_dir, zh_dir = dirs
    # 检查中英文文档对应关系
    if not os.path.exists(en_dir) or not os.path.exists(zh_dir):
        logging.error("无法检查文档对应关系，因为中英文目录不存在")
        exit(1)

    logging.info("正在检查中英文文档对应关系")
    correspondence_errors = check_corresponding_docs(en_dir, zh_dir)

    # 输出报告
    report = format_correspondence_error_report(correspondence_errors)
    print(report)

    # 如果有错误，返回非零退出码
    if any(correspondence_errors.values()):
        exit(1)


if __name__ == "__main__":
    main()