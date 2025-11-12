import re
import os
import requests
import argparse
from urllib.parse import urlparse
import sys
import chardet
from common import get_pr_files

# 初始化参数解析
parser = argparse.ArgumentParser()
parser.add_argument('--white-list', help='Path to white list file', default='white_list.txt')
parser.add_argument('--dirs',
                    default="docs/zh/,docs/en/",
                    help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
args = parser.parse_args()

# 使用您指定的正则表达式规则
LINK_REGEX = [
    re.compile(r'(?<!!)\[.*?\]\((.+?)\)'),  # 匹配 [xx](xxx) 链接
    re.compile(r'<(http[^>]+)>'),  # 匹配 <链接地址> 格式的链接
    re.compile(r'<a[^>]*href=["\']([^"]+?)["\'][^>]*>', re.IGNORECASE)  # 匹配 <a> 标签链接
]

processed_links_cache = set()


def detect_file_encoding(file_path):
    """自动检测文件编码"""
    with open(file_path, 'rb') as f:
        raw_data = f.read(1024)  # 读取前1KB内容用于检测
    return chardet.detect(raw_data)['encoding']


def read_file_with_fallback(file_path):
    """尝试用多种编码方式读取文件"""
    encodings_to_try = [
        'utf-8',
        'gbk',
        'gb2312',
        'gb18030',
        'big5',
        'iso-8859-1',
        'Windows-1252',
        'Windows-1254'
    ]

    # 先尝试自动检测
    try:
        encoding = detect_file_encoding(file_path)
        if encoding:
            encodings_to_try.insert(0, encoding)
    except:
        pass

    # 尝试各种编码
    last_error = None
    for encoding in encodings_to_try:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError as e:
            last_error = e

    # 所有尝试都失败后抛出错误
    raise Exception(f"无法解码文件 {file_path}，尝试的编码: {encodings_to_try}。最后错误: {str(last_error)}")


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
    """白名单匹配函数（增加缓存检查）"""
    cache_key = f"whitelist:{re_url}:{url}"
    if cache_key in processed_links_cache:
        return True

    pattern = (
        re_url
        .replace(".", r"\.")
        .replace("*", ".*")
        .replace("?", r"\?")
    )
    if not pattern.endswith("$"):
        pattern += "$"

    result = re.match(pattern, url) is not None
    if result:
        processed_links_cache.add(cache_key)
    return result

def is_private_ip_url(url):
    """专门用于检查私有IP URL的函数"""
    # 匹配私有IP的正则规则
    pattern = r'^(https?://)?(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?(/.*)?$'
    return re.match(pattern, url) is not None

def is_gitee_url(url):
    """检查是否是gitee.com的链接"""
    parsed = urlparse(url)
    return parsed.netloc.endswith('gitee.com')


def extract_links(content):
    """使用指定规则提取所有链接（增加去重）"""
    links = []
    for regex in LINK_REGEX:
        matches = regex.finditer(content)
        for match in matches:
            link = match.group(1)
            if link not in links:  # 避免重复添加
                links.append(link)
    return links


def is_valid_url(url):
    """检查URL格式是否有效（增加缓存）"""
    cache_key = f"valid_url:{url}"
    if cache_key in processed_links_cache:
        return True

    try:
        result = urlparse(url)
        valid = all([result.scheme, result.netloc])
        if valid:
            processed_links_cache.add(cache_key)
        return valid
    except ValueError:
        return False


def check_remote_url(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0',
                   'Accept': 'application/json, text/plain, */*'}
        response = requests.get(url, headers=headers, timeout=5, stream=True)
        response.close()
        return response.status_code in (200, 302, 304, 403), f"HTTP {response.status_code}"
    except requests.exceptions.Timeout:
        # 超时异常单独处理，返回通过
        return True, "Timeout occurred but allowed"
    except requests.exceptions.RequestException as e:
        return False, f"Request failed: {str(e)}"


def check_local_link(file_path, link):
    """检查本地链接有效性"""
    abs_path = os.path.normpath(os.path.join(os.path.dirname(file_path), link))
    if os.path.exists(abs_path):
        return True, None
    return False, "File not found"


def normalize_anchor(anchor):
    """标准化锚点ID，与前端处理方式保持一致"""
    import re
    import unicodedata

    # 转换为NFKD形式并移除变音符号
    normalized = unicodedata.normalize('NFKD', anchor)
    normalized = ''.join([c for c in normalized if not unicodedata.combining(c)])

    # 移除控制字符
    normalized = re.sub(r'[\u0000-\u001f]', '', normalized)

    # 将各种符号替换为连字符
    normalized = re.sub(r'[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"\'“”‘’<>,.?/]+', '-', normalized)

    # 处理连续的连字符
    normalized = re.sub(r'-{2,}', '-', normalized)

    # 移除首尾的连字符
    normalized = normalized.strip('-')

    # 处理以数字开头的锚点
    if normalized and normalized[0].isdigit():
        normalized = '_' + normalized

    return normalized.lower()


def check_anchor_link(file_path, link):
    """检查锚点链接（支持Markdown标题和HTML锚点）"""
    if '#' not in link:
        return True, None

    file_part, anchor = link.split('#', 1)

    # 处理当前文件锚点情况
    if not file_part:
        abs_path = file_path
    else:
        abs_path = os.path.normpath(os.path.join(os.path.dirname(file_path), file_part))

    if not os.path.exists(abs_path):
        return False, "Target file not found"

    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()

            # 1. 检查Markdown标题锚点
            headers = re.findall(r'^#{1,6}\s+(.*?)(?:\s+#+)?$', content, flags=re.MULTILINE)
            header_anchors = [normalize_anchor(h.strip()) for h in headers]

            # 2. 检查HTML锚点
            html_anchors = re.findall(r'<a\s+name=["\']([^"\']+)["\']', content, flags=re.IGNORECASE)
            html_anchors = [normalize_anchor(a) for a in html_anchors]

            # 合并两种锚点检查结果
            all_anchors = header_anchors + html_anchors

            normalized_target = normalize_anchor(anchor)
            if normalized_target not in all_anchors:
                return False, f"Anchor '{anchor}' (normalized as '{normalized_target}') not found in headers or HTML anchors"

    except UnicodeDecodeError:
        return False, "Could not read target file"
    except Exception as e:
        return False, f"Error checking anchor: {str(e)}"

    return True, None


def process_markdown_file(file_path, errors):
    """处理单个Markdown文件"""
    try:
        content = read_file_with_fallback(file_path)
    except Exception as e:
        errors.append(f"文件读取失败 [{file_path}]: {str(e)}")
        return

    # 移除代码块避免误检
    content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
    content = re.sub(r'`.*?`', '', content)

    links = extract_links(content)
    white_urls = get_white_urls()

    for link in links:
        # 生成唯一缓存键
        link_key = f"process:{file_path}:{link}"
        if link_key in processed_links_cache:
            continue
        processed_links_cache.add(link_key)

        # 跳过白名单链接
        if any(is_white_url(pattern, link) for pattern in white_urls):
            continue

        if is_private_ip_url(link):
            continue

        if is_valid_url(link):
            # 如果是gitee.com链接，跳过检查
            if is_gitee_url(link):
                continue

            valid, msg = check_remote_url(link)
            if not valid:
                errors.append(f"无效远程链接 [{file_path}]: {link} ({msg})")
        elif link.startswith(('http://', 'https://')):
            errors.append(f"格式错误的URL [{file_path}]: {link}")
        elif '#' in link:
            valid, msg = check_anchor_link(file_path, link)
            if not valid:
                errors.append(f"无效锚点链接 [{file_path}]: {link} ({msg})")
        else:
            valid, msg = check_local_link(file_path, link)
            if not valid:
                errors.append(f"无效本地链接 [{file_path}]: {link} ({msg})")


def main():
    """主检查逻辑"""
    global processed_links_cache
    processed_links_cache = set()
    markdown_files = [f for f in get_pr_files(args.dirs)
                      if f.endswith('.md') and os.path.exists(f)]

    errors = []
    for file_path in markdown_files:
        process_markdown_file(file_path, errors)

    if errors:
        print("\n发现无效链接:")
        for error in errors:
            print(error)
        sys.exit(1)
    else:
        print("\n所有链接有效")


if __name__ == "__main__":
    main()
