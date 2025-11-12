import os
import re
import logging
import yaml
from typing import List, Dict, Tuple

# 配置日志记录
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def get_file_content(file_path: str) -> str:
    """读取文件内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        logging.error(f"Error：{file_path} file not found")
    except Exception as e:
        logging.error(f"An error occurred while reading file {file_path}: {e}")
    return ""


def remove_leading_dotdot(path: str) -> str:
    """去除路径开头的 ../"""
    while path.startswith('../'):
        path = path[3:]
    return path


def get_relative_path(target_path: str, base_path: str) -> str:
    """获取相对路径并标准化"""
    relative_path = os.path.relpath(target_path, os.path.dirname(base_path))
    return remove_leading_dotdot(os.path.normpath(relative_path).replace("\\", "/"))


def extract_href_and_reference_paths(content: str) -> List[str]:
    """
    从内容中提取所有 href 和 reference 的路径
    返回标准化后的路径列表（统一使用正斜杠）
    """
    pattern = r'(?:href|reference)\s*:\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s\'">]+))'

    paths = []
    for match in re.finditer(pattern, content):
        path = next((g for g in match.groups() if g is not None), "")
        if path:
            try:
                normalized = os.path.normpath(path).replace("\\", "/")
                while normalized.startswith('../'):
                    normalized = normalized[3:]
                paths.append(normalized)
            except Exception as e:
                logging.warning(f"Invalid path '{path}': {str(e)}")
                continue
    return paths


def find_markdown_files(root_dir: str) -> List[str]:
    """查找所有Markdown文件"""
    md_files = []
    for root, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(root, file))
    return md_files


def find_toc_files(root_dir: str) -> List[str]:
    """查找所有_toc.yaml文件"""
    toc_files = []
    for root, _, files in os.walk(root_dir):
        if '_toc.yaml' in files:
            toc_files.append(os.path.join(root, '_toc.yaml'))
    return toc_files


def check_markdown_in_toc(md_file: str, toc_files: List[str]) -> Tuple[bool, List[str]]:
    """
    检查Markdown文件是否被任何_toc.yaml引用
    返回：(是否被引用, 错误信息列表)
    """
    errors = []
    for toc_file in toc_files:
        try:
            content = get_file_content(toc_file)
            if not content:
                continue

            paths = extract_href_and_reference_paths(content)
            target_relative_path = get_relative_path(md_file, toc_file)

            if target_relative_path in paths:
                logging.info(f"Found reference: {md_file} in {toc_file}")
                return True, errors

        except Exception as e:
            errors.append(f"Error checking {toc_file}: {str(e)}")

    return False, errors


def check_all_markdown_files(root_dir: str) -> Dict[str, List[str]]:
    """
    检查所有Markdown文件的引用情况
    返回结果字典:
    {
        'unreferenced_files': [未被引用的文件列表],
        'referenced_files': [被引用的文件列表],
        'errors': [错误信息列表]
    }
    """
    result = {
        'unreferenced_files': [],
        'referenced_files': [],
        'errors': []
    }

    md_files = find_markdown_files(root_dir)
    toc_files = find_toc_files(root_dir)

    if not toc_files:
        result['errors'].append("No _toc.yaml files found in the directory")
        return result

    for md_file in md_files:
        is_referenced, errors = check_markdown_in_toc(md_file, toc_files)
        result['errors'].extend(errors)

        rel_path = os.path.relpath(md_file, root_dir)
        if is_referenced:
            result['referenced_files'].append(rel_path)
        else:
            result['unreferenced_files'].append(rel_path)
            logging.warning(f"Unreferenced file: {rel_path}")

    return result


def format_report(results: Dict[str, List[str]]) -> str:
    """格式化检查结果报告"""
    report = []

    if results['unreferenced_files']:
        report.append("\n\033[31mUnreferenced Markdown files:\033[0m")
        report.extend([f"  - {f}" for f in results['unreferenced_files']])

    if results['errors']:
        report.append("\n\033[33mErrors encountered:\033[0m")
        report.extend([f"  - {e}" for e in results['errors']])

    if results['referenced_files'] and not results['unreferenced_files']:
        report.append("\n\033[32mAll Markdown files are properly referenced!\033[0m")

    return "\n".join(report) if report else "No Markdown files found."


def main():
    current_dir = os.getcwd()
    print(f"Checking Markdown files in: {current_dir}")

    results = check_all_markdown_files(current_dir)
    report = format_report(results)

    print(report)

    if results['unreferenced_files']:
        exit(1)  # 如果有未引用的文件，返回非零状态码


if __name__ == "__main__":
    main()