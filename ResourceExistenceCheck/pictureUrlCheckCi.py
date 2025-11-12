import re
import os
import requests
import argparse
from urllib.parse import urlparse
import sys
from common import get_pr_files

# 初始化参数解析
parser = argparse.ArgumentParser()
parser.add_argument('--white-list', help='Path to white list file', default='white_list.txt')
parser.add_argument('--dirs',
                    default="docs/zh/,docs/en/",
                    help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
args = parser.parse_args()

# 定义更全面的链接匹配正则表达式
LINK_REGEX = [
    re.compile(r'!\[.*?\]\((.*?)\)'),  # 提取 ![xxx](xxx) 语法的链接
    re.compile(r'<img\s+[^>]*src="([^"]+)"[^>]*>', re.IGNORECASE),  # 提取 img 标签的链接
    re.compile(r'<image\s+[^>]*src="([^"]+)"[^>]*>', re.IGNORECASE),  # 提取 image 标签的链接
    re.compile(r'<video\s+[^>]*src="([^"]+)"[^>]*>', re.IGNORECASE),  # 提取 video 标签的链接
]

# 标准Markdown链接语法（排除图片）
STANDARD_LINK_REGEX = re.compile(r'(?<!\!)\[.*?\]\((.*?)\)')


def get_white_urls():
    """获取白名单URL列表"""
    if not os.path.exists(args.white_list):
        return []

    try:
        with open(args.white_list, "r", encoding="utf-8") as f:
            infos = f.readlines()
    except Exception:
        with open(args.white_list, "r", encoding="GBK") as f:
            infos = f.readlines()

    return [info.strip() for info in infos if info.strip()]


def is_white_url(re_url, url):
    """
    白名单匹配函数
    处理所有特殊字符和通配符
    """
    # 将白名单模式转换为正则表达式
    pattern = (
        re_url
        .replace(".", r"\.")  # 转义点号
        .replace("*", ".*")  # 通配符转换为.*
        .replace("?", r"\?")  # 转义问号
    )

    # 确保匹配完整URL
    if not pattern.endswith("$"):
        pattern += "$"
    return re.match(pattern, url) is not None

def is_private_ip_url(url):
    """专门用于检查私有IP URL的函数"""
    # 匹配私有IP的正则规则
    pattern = r'^(https?://)?(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?(/.*)?$'
    return re.match(pattern, url) is not None

def filter_white_urls(urls):
    """
    过滤白名单URL
    返回不在白名单中的URL集合
    """
    white_urls = get_white_urls()
    if not white_urls:
        return set(urls)

    # 先处理精确匹配的白名单
    precise_whites = [url for url in white_urls if "*" not in url]
    filtered_urls = set(urls) - set(precise_whites)

    # 再处理通配符白名单
    re_white_urls = [re_url for re_url in white_urls if "*" in re_url]
    for pattern in re_white_urls:
        matched = {url for url in filtered_urls if is_white_url(pattern, url)}
        filtered_urls -= matched

    return filtered_urls


def extract_all_links(markdown):
    """
    从 Markdown 文件中提取所有链接（包括图片、img/image/video标签等）
    """
    links = []
    for regex in LINK_REGEX:
        links.extend(regex.findall(markdown))
    return links


def extract_markdown_links(markdown):
    """
    从 Markdown 文件中提取所有普通链接（排除图片链接）
    """
    standard_links = STANDARD_LINK_REGEX.findall(markdown)
    return [link for link in standard_links if "relref" not in link]


def is_valid_url(url):
    """
    检查 URL 是否有效
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False


def check_remote_url(url, timeout=5):
    """
    检查远程URL是否可访问
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0',
                   'Accept': 'application/json, text/plain, */*'}
        response = requests.get(
            url,
            headers=headers,
            timeout=timeout,
            stream=True
        )
        response.close()

        if response.status_code in (200, 302, 304, 403):
            return True, None
        else:
            return False, f"HTTP status: {response.status_code}"
    except requests.exceptions.Timeout:
        # 超时异常单独处理，返回通过
        return True, "Timeout occurred but allowed"
    except requests.exceptions.RequestException as e:
        return False, f"request failed: {e}"


def check_local_image(file_path, image_path):
    """
    检查本地图片文件是否存在
    """
    abs_path = os.path.normpath(os.path.join(os.path.dirname(file_path), image_path))
    if os.path.exists(abs_path):
        return True, None
    else:
        return False, "file not found"


def resolve_relative_path(file_path, relative_path):
    """
    解析相对路径并返回绝对路径
    """
    if relative_path == '':
        abs_path = file_path
    else:
        abs_path = os.path.normpath(os.path.join(os.path.dirname(file_path), relative_path))
    return abs_path


def check_markdown_link(file_path, link, errors):
    """
    检查 Markdown 链接是否有效
    """
    if link.startswith(('http://', 'https://')):
        # 检查白名单
        white_urls = get_white_urls()
        if white_urls:
            # 先检查精确匹配
            if link in white_urls:
                return

            # 再检查通配符匹配
            for pattern in [url for url in white_urls if "*" in url]:
                if is_white_url(pattern, link):
                    return

        # 不在白名单中的才检查
        is_valid, error_message = check_remote_url(link)
        if not is_valid:
            errors.append(f"Invalid link in file {file_path}: {link}, reason: {error_message}")
        return

    if is_valid_url(link):
        return

    # 处理本地链接
    if '#' in link:
        doc_path, anchor = link.split('#', 1)
    else:
        doc_path, anchor = link, None

    abs_doc_path = resolve_relative_path(file_path, doc_path)
    if not os.path.exists(abs_doc_path):
        errors.append(f"Invalid link in file {file_path}: {link}, reason: target file does not exist")
        return

    if anchor and abs_doc_path != '.':
        with open(abs_doc_path, 'r', encoding="utf-8") as doc_file:
            content = doc_file.read()

            # 检查1: Markdown标题锚点
            header_pattern = re.compile(r'^#{1,6}\s+(.*?)(?:\s+#+)?$', re.MULTILINE)
            headers = [h.strip().lower() for h in header_pattern.findall(content)]

            # 检查2: HTML <a name="..."> 锚点
            html_anchor_pattern = re.compile(r'<a\s+name="([^"]+)"', re.IGNORECASE)
            html_anchors = html_anchor_pattern.findall(content)

            # 检查3： 从标题文本生成GitHub风格的锚点（模拟GitHub的行为）
            github_anchors = [generate_github_anchor(h) for h in headers]
            github_html_anchors = [generate_github_anchor(h) for h in html_anchors]

            # 合并所有可能的锚点
            all_anchors = headers + html_anchors + github_anchors + github_html_anchors

            if anchor.lower() not in [a.lower() for a in all_anchors]:
                errors.append(f"Invalid link in file {file_path}: {link}, Reason: Target anchor does not exist")

def generate_github_anchor(title):
    # 转换为小写
    anchor = title.lower()
    # 替换空格为-
    anchor = anchor.replace(' ', '-')
    # 移除特殊字符
    anchor = re.sub(r'[^\w\-]', '', anchor)
    return anchor

def remove_code_blocks(markdown):
    """
    移除 Markdown 中的代码块和内联代码
    """
    code_block_pattern = re.compile(r'```.*?```', re.DOTALL)
    markdown = code_block_pattern.sub('', markdown)
    inline_code_pattern = re.compile(r'`.*?`')
    markdown = inline_code_pattern.sub('', markdown)
    return markdown


def process_markdown_file(file_path, errors):
    """
    处理 Markdown 文件，检查其中的所有链接是否有效
    """
    with open(file_path, 'r', encoding="utf-8") as file:
        content = file.read()

    content_without_code = remove_code_blocks(content)

    # 检查所有链接
    all_links = extract_all_links(content_without_code)
    if all_links:
        urls_to_check = filter_white_urls(all_links)

        for link in urls_to_check:
            if is_private_ip_url(link):
                continue
            if is_valid_url(link):
                is_valid, error_message = check_remote_url(link)
                if not is_valid:
                    error = f"Invalid remote link in file {file_path}: {link}, reason: {error_message}"
                    errors.append(error)
            else:
                is_valid, error_message = check_local_image(file_path, link)
                if not is_valid:
                    error = f"Invalid local link in file {file_path}: {link}, reason: {error_message}"
                    errors.append(error)

    # # 检查普通Markdown链接
    # markdown_links = extract_markdown_links(content_without_code)
    # if markdown_links:
    #     for link in markdown_links:
    #         check_markdown_link(file_path, link, errors)


def main():
    """
    主函数，处理指定的 Markdown 文件
    """
    markdown_files = get_pr_files(args.dirs)
    errors = []

    for file_path in markdown_files:
        if not os.path.exists(file_path):
            error = f"File does not exist: {file_path}"
            errors.append(error)
            continue
        if not file_path.lower().endswith('.md'):
            continue
        process_markdown_file(file_path, errors)

    if errors:
        print("The following links are invalid:")
        for error in errors:
            print(error)
        sys.exit(1)
    else:
        print("\nAll links are valid.")


if __name__ == "__main__":
    main()
