import os
from typing import List, Dict
from colorama import Fore, init
import yaml

# 新增：定义项目根目录（假设脚本从项目根目录运行）
PROJECT_ROOT = os.getcwd()
init(autoreset=True)


def check_all_toc_files() -> Dict[str, List[str]]:
    """
    检查项目下所有_toc.yaml文件中的引用
    返回包含所有错误信息的字典
    """
    result = {'toc_missing_files': [], 'toc_parse_errors': []}

    # 遍历整个项目目录
    for root, _, files in os.walk(PROJECT_ROOT):
        if '_toc.yaml' in files:
            toc_file = os.path.join(root, '_toc.yaml')
            try:
                with open(toc_file, 'r', encoding='utf-8') as f:
                    toc_content = yaml.safe_load(f)

                def check_sections(sections, toc_dir):
                    for section in sections:
                        if 'href' in section:
                            href_path = section['href']
                            # 处理相对路径
                            abs_href_path = os.path.normpath(os.path.join(toc_dir, href_path))
                            if not os.path.exists(abs_href_path):
                                rel_path = os.path.relpath(abs_href_path, PROJECT_ROOT)
                                result['toc_missing_files'].append(
                                    f"Missing file: {rel_path} (referenced in {os.path.relpath(toc_file, PROJECT_ROOT)})"
                                )
                        if 'sections' in section:
                            check_sections(section['sections'], toc_dir)

                if toc_content and 'sections' in toc_content:
                    check_sections(toc_content['sections'], root)
            except Exception as e:
                result['toc_parse_errors'].append(
                    f"Failed to parse {os.path.relpath(toc_file, PROJECT_ROOT)}: {str(e)}"
                )

    return result


def format_error_report(errors: Dict[str, List[str]]) -> str:
    """格式化错误报告"""
    report = []
    if errors['menu_missing_refs']:
        report.append("\nMenu引用缺失错误:")
        report.extend([f"  - {msg}" for msg in errors['_toc.yaml_missing_refs']])
    if errors['menu_parse_errors']:
        report.append("\nMenu文件解析错误:")
        report.extend([f"  - {msg}" for msg in errors['_toc.yaml_parse_errors']])
    if errors['toc_missing_files']:
        report.append("\nTOC文件引用缺失:")
        report.extend([f"  - {msg}" for msg in errors['toc_missing_files']])
    if errors['toc_parse_errors']:
        report.append("\nTOC文件解析错误:")
        report.extend([f"  - {msg}" for msg in errors['toc_parse_errors']])

    return "\n".join(report) if report else ""


try:
    all_errors = {
        'menu_missing_refs': [],
        'menu_parse_errors': [],
        'toc_missing_files': [],
        'toc_parse_errors': []
    }

    # 新增：检查项目中所有_toc.yaml文件
    toc_errors = check_all_toc_files()
    all_errors['toc_missing_files'].extend(toc_errors['toc_missing_files'])
    all_errors['toc_parse_errors'].extend(toc_errors['toc_parse_errors'])
    # 统一输出所有错误
    if any(all_errors.values()):
        print(Fore.RED + "×××××××××××")
        error_report = format_error_report(all_errors)
        print(f"{error_report}")
        exit(1)
    print("All checks passed!")

except Exception as e:
    print(f"Unexpected error: {str(e)}")
    exit(1)
