import argparse
import os
import re
import logging
import yaml
import requests
from typing import List, Dict, Tuple, Optional
from urllib.parse import urlparse

from common import get_pr_files

# 配置日志记录
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 设置请求超时时间（秒）
REQUEST_TIMEOUT = 10


def find_nearest_toc_file(file_path: str) -> Optional[str]:
    """
    查找离文件最近的_toc.yaml文件，按以下顺序查找：
    1. 当前目录
    2. 语言目录（如果是多语言结构）
    3. 向上递归查找父目录

    Args:
        file_path: 要检查的文件路径

    Returns:
        找到的最近_toc.yaml文件路径，如果没找到返回None
    """
    current_dir = os.path.dirname(file_path)
    root_dir = os.path.abspath(PROJECT_ROOT)

    # 1. 首先检查当前目录
    current_toc = os.path.join(current_dir, '_toc.yaml')
    if os.path.exists(current_toc):
        return current_toc

    # 2. 检查语言目录（如果是多语言结构）
    parts = os.path.normpath(file_path).split(os.sep)
    if 'docs' in parts:
        docs_index = parts.index('docs')
        if docs_index + 1 < len(parts):
            lang_dir = os.path.join(root_dir, 'docs', parts[docs_index + 1])
            lang_toc = os.path.join(lang_dir, '_toc.yaml')
            if os.path.exists(lang_toc):
                return lang_toc

    # 3. 向上递归查找父目录
    parent_dir = os.path.join(root_dir, os.path.dirname(current_dir))
    while parent_dir.startswith(root_dir):
        toc_path = os.path.join(parent_dir, '_toc.yaml')
        if os.path.exists(toc_path):
            return toc_path
        parent_dir = os.path.dirname(parent_dir)

    return None


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
    """从内容中提取所有 href 和 reference 的路径"""
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


def check_file_in_menu_index(file_path: str, menu_index_path: str) -> bool:
    """检查文件是否在菜单索引中被引用"""
    content = get_file_content(menu_index_path)
    if not content:
        return False

    paths = extract_href_and_reference_paths(content)
    target_relative_path = get_relative_path(file_path, menu_index_path)

    if target_relative_path in paths:
        return True
    logging.info(f"{target_relative_path} not in {menu_index_path}")
    return False


def check_menu_references(pr_file: str) -> Tuple[List[str], List[str]]:
    """检查Markdown文件在最近的_toc.yaml中的引用情况"""
    missing_refs = []
    parse_errors = []

    filename = os.path.basename(pr_file)
    if filename != '_toc.yaml':
        toc_file = find_nearest_toc_file(pr_file)
        if toc_file:
            try:
                if not check_file_in_menu_index(pr_file, toc_file):
                    missing_refs.append(f"{get_relative_path(pr_file, toc_file)} not in {toc_file}")
            except Exception as e:
                parse_errors.append(str(e))
        else:
            parse_errors.append(f"No _toc.yaml found for {pr_file}")

    return missing_refs, parse_errors


def is_url_accessible(url: str) -> bool:
    """检查URL是否可以访问"""
    try:
        response = requests.head(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        if response.status_code < 400:
            return True
        # 对于某些网站HEAD请求不被允许，尝试GET
        response = requests.get(url, timeout=REQUEST_TIMEOUT, stream=True)
        return response.status_code < 400
    except requests.RequestException as e:
        logging.warning(f"Failed to access URL {url}: {str(e)}")
        return False


def check_toc_href_files_exist(file_path: str) -> Dict[str, List[str]]:
    """检查_toc.yaml中href和upstream指向的文件是否存在"""
    current_dir = os.path.dirname(file_path)
    result = {'missing_files': [], 'parse_errors': [], 'inaccessible_urls': []}

    for root, _, files in os.walk(current_dir):
        if '_toc.yaml' in files:
            toc_file = os.path.join(root, '_toc.yaml')
            try:
                with open(toc_file, 'r', encoding='utf-8') as f:
                    toc_content = yaml.safe_load(f)

                def check_sections(sections, toc_dir):
                    for section in sections:
                        # 检查href
                        if 'href' in section:
                            href_value = section['href']
                            if href_value is None:  # 新增空值检查
                                continue
                            # 检查是否是URL
                            parsed_url = urlparse(href_value)
                            if parsed_url.scheme in ('http', 'https'):
                                if not is_url_accessible(href_value):
                                    result['inaccessible_urls'].append(
                                        f"Inaccessible URL: {href_value} (referenced in {toc_file})"
                                    )
                            else:
                                # 处理相对路径
                                abs_path = os.path.normpath(os.path.join(toc_dir, href_value))
                                if not os.path.exists(abs_path):
                                    result['missing_files'].append(
                                        f"Missing file: {abs_path} (referenced in {toc_file})"
                                    )

                        # 检查upstream链接
                        if 'upstream' in section:
                            upstream_value = section['upstream']
                            if upstream_value is None:
                                continue
                            if isinstance(upstream_value, dict):
                                # 处理 upstream 是字典的情况（包含URL和path）
                                if 'upstream' in upstream_value and 'path' in upstream_value:
                                    upstream_url = upstream_value['upstream']
                                    upstream_path = upstream_value['path']

                                    # 检查URL是否可访问
                                    parsed_url = urlparse(upstream_url)
                                    if parsed_url.scheme in ('http', 'https'):
                                        if not is_url_accessible(upstream_url):
                                            result['inaccessible_urls'].append(
                                                f"Inaccessible upstream URL: {upstream_url} (referenced in {toc_file})"
                                            )

                                    # 检查本地路径是否存在
                                    abs_path = os.path.normpath(os.path.join(toc_dir, upstream_path))
                                    if not os.path.exists(abs_path):
                                        result['missing_files'].append(
                                            f"Missing upstream file: {abs_path} (referenced in {toc_file})"
                                        )
                            else:
                                # 处理 upstream 是字符串的情况
                                parsed_url = urlparse(upstream_value)
                                if parsed_url.scheme in ('http', 'https'):
                                    if not is_url_accessible(upstream_value):
                                        result['inaccessible_urls'].append(
                                            f"Inaccessible upstream URL: {upstream_value} (referenced in {toc_file})"
                                        )
                                else:
                                    # 处理相对路径
                                    abs_path = os.path.normpath(os.path.join(toc_dir, upstream_value))
                                    if not os.path.exists(abs_path):
                                        result['missing_files'].append(
                                            f"Missing upstream file: {abs_path} (referenced in {toc_file})"
                                        )

                        if 'sections' in section:
                            check_sections(section['sections'], toc_dir)

                if toc_content and 'sections' in toc_content:
                    check_sections(toc_content['sections'], root)
            except Exception as e:
                result['parse_errors'].append(f"Failed to parse {toc_file}: {str(e)}")

    return result


# 新增：定义项目根目录（假设脚本从项目根目录运行）
PROJECT_ROOT = os.getcwd()


def check_all_toc_files() -> Dict[str, List[str]]:
    """
    检查项目下所有_toc.yaml文件中的引用
    返回包含所有错误信息的字典
    """
    result = {
        'toc_missing_files': [],
        'toc_parse_errors': [],
        'toc_inaccessible_urls': []
    }

    # 遍历整个项目目录
    for root, _, files in os.walk(PROJECT_ROOT):
        if '_toc.yaml' in files:
            toc_file = os.path.join(root, '_toc.yaml')
            try:
                with open(toc_file, 'r', encoding='utf-8') as f:
                    toc_content = yaml.safe_load(f)

                def check_sections(sections, toc_dir):
                    for section in sections:
                        # 检查href（处理字典和字符串两种情况）
                        if 'href' in section:
                            href_value = section['href']
                            if isinstance(href_value, dict):
                                # 处理href是字典的情况（如包含upstream字段）
                                if 'upstream' in href_value:
                                    upstream_value = href_value['upstream']
                                    parsed_url = urlparse(upstream_value)
                                    if parsed_url.scheme in ('http', 'https'):
                                        if not is_url_accessible(upstream_value):
                                            rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                            result['toc_inaccessible_urls'].append(
                                                f"Inaccessible URL: {upstream_value} (referenced in {rel_toc_path})"
                                            )
                            else:
                                parsed_url = urlparse(href_value)
                                if parsed_url.scheme in ('http', 'https'):
                                    if not is_url_accessible(href_value):
                                        rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                        result['toc_inaccessible_urls'].append(
                                            f"Inaccessible URL: {href_value} (referenced in {rel_toc_path})"
                                        )
                                else:
                                    abs_href_path = os.path.normpath(os.path.join(toc_dir, href_value))
                                    if not os.path.exists(abs_href_path):
                                        rel_path = os.path.relpath(abs_href_path, PROJECT_ROOT)
                                        rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                        result['toc_missing_files'].append(
                                            f"Missing file: {rel_path} (referenced in {rel_toc_path})"
                                        )

                        # 检查upstream链接
                        if 'upstream' in section:
                            upstream_value = section['upstream']
                            if isinstance(upstream_value, dict):
                                # 处理 upstream 是字典的情况（包含URL和path）
                                if 'upstream' in upstream_value and 'path' in upstream_value:
                                    upstream_url = upstream_value['upstream']
                                    upstream_path = upstream_value['path']

                                    # 检查URL是否可访问
                                    parsed_url = urlparse(upstream_url)
                                    if parsed_url.scheme in ('http', 'https'):
                                        if not is_url_accessible(upstream_url):
                                            rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                            result['toc_inaccessible_urls'].append(
                                                f"Inaccessible upstream URL: {upstream_url} (referenced in {rel_toc_path})"
                                            )

                                    # 检查本地路径是否存在
                                    abs_upstream_path = os.path.normpath(os.path.join(toc_dir, upstream_path))
                                    if not os.path.exists(abs_upstream_path):
                                        rel_path = os.path.relpath(abs_upstream_path, PROJECT_ROOT)
                                        rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                        result['toc_missing_files'].append(
                                            f"Missing upstream file: {rel_path} (referenced in {rel_toc_path})"
                                        )
                            else:
                                # 处理 upstream 是字符串的情况
                                parsed_url = urlparse(upstream_value)
                                if parsed_url.scheme in ('http', 'https'):
                                    if not is_url_accessible(upstream_value):
                                        rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                        result['toc_inaccessible_urls'].append(
                                            f"Inaccessible upstream URL: {upstream_value} (referenced in {rel_toc_path})"
                                        )
                                else:
                                    # 处理相对路径
                                    abs_upstream_path = os.path.normpath(os.path.join(toc_dir, upstream_value))
                                    if not os.path.exists(abs_upstream_path):
                                        rel_path = os.path.relpath(abs_upstream_path, PROJECT_ROOT)
                                        rel_toc_path = os.path.relpath(toc_file, PROJECT_ROOT)
                                        result['toc_missing_files'].append(
                                            f"Missing upstream file: {rel_path} (referenced in {rel_toc_path})"
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
    if errors['toc_missing_refs']:
        report.append("\nTOC文件引用缺失错误:")
        report.extend([f"  - {msg}" for msg in errors['toc_missing_refs']])
    if errors['toc_parse_errors']:
        report.append("\nTOC文件解析错误:")
        report.extend([f"  - {msg}" for msg in errors['toc_parse_errors']])
    if errors['toc_missing_files']:
        report.append("\nTOC文件引用缺失:")
        report.extend([f"  - {msg}" for msg in errors['toc_missing_files']])
    if errors['toc_inaccessible_urls']:
        report.append("\n无法访问的URL:")
        report.extend([f"  - {msg}" for msg in errors['toc_inaccessible_urls']])

    return "\n".join(report) if report else ""


try:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dirs',
                        default="docs/zh/,docs/en/",
                        help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
    args = parser.parse_args()
    pr_files = get_pr_files(args.dirs)
    all_errors = {
        'toc_missing_refs': [],
        'toc_parse_errors': [],
        'toc_missing_files': [],
        'toc_inaccessible_urls': []
    }

    for pr_file in pr_files:
        if not os.path.exists(pr_file):
            logging.error(f"File not found: {pr_file}")
            continue

        if ' ' in pr_file:
            pr_file = pr_file.replace(' ', '\ ')

        if pr_file.endswith('.md'):
            # 检查_toc.yaml引用
            missing_refs, parse_errors = check_menu_references(pr_file)
            all_errors['toc_missing_refs'].extend(missing_refs)
            all_errors['toc_parse_errors'].extend(parse_errors)
        else:
            logging.info(f"Skipping non-Markdown file: {pr_file}")

    # 新增：检查项目中所有_toc.yaml文件
    if pr_files:
        toc_errors = check_all_toc_files()
        all_errors['toc_missing_files'].extend(toc_errors['toc_missing_files'])
        all_errors['toc_parse_errors'].extend(toc_errors['toc_parse_errors'])
        all_errors['toc_inaccessible_urls'].extend(toc_errors['toc_inaccessible_urls'])

    # 统一输出所有错误
    if any(all_errors.values()):
        error_report = format_error_report(all_errors)
        print(f"{error_report}")
        exit(1)

except Exception as e:
    print(f"Unexpected error: {str(e)}")
    exit(1)
