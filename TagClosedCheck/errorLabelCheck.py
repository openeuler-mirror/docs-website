import argparse
import re
import os
from common import get_pr_files


# 标准 HTML 标签列表
STANDARD_HTML_TAGS = [
    "a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio",
    "b", "base", "basefont", "bdi", "bdo", "big", "blockquote", "body", "br", "button",
    "canvas", "caption", "center", "cite", "code", "col", "colgroup", "data", "datalist",
    "dd", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "em", "embed",
    "fieldset", "figcaption", "figure", "font", "footer", "form", "frame", "frameset",
    "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "i", "iframe",
    "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main",
    "map", "mark", "meta", "meter", "nav", "noframes", "noscript", "object", "ol",
    "optgroup", "option", "output", "p", "param", "picture", "pre", "progress",
    "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small",
    "source", "span", "strike", "strong", "style", "sub", "summary", "sup", "svg",
    "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time",
    "title", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"
]

def check_unclosed_tags(html, markdown_lines, html_start_line):
    """
    检查未闭合的HTML标签，并返回错误信息。
    行号信息映射到原始 Markdown 文件中的位置。
    """
    stack = []
    index = 0
    line_number = 1
    errors = []
    # 精确匹配标准 HTML 标签的正则表达式
    html_tag_pattern = re.compile(
        r'<(' + '|'.join(STANDARD_HTML_TAGS) + r')(?:\s[^>]*)?(?:/>|>)|</(' + '|'.join(STANDARD_HTML_TAGS) + r')>')

    while index < len(html):
        match = html_tag_pattern.search(html, index)
        if not match:
            break

        start_index = match.start()
        end_index = match.end()
        tag = match.group(0)

        # 更新行号
        line_number += html[index:start_index].count('\n')

        # 将 HTML 中的行号映射到原始 Markdown 文件中的行号
        markdown_line_number = html_start_line + line_number - 1

        if tag.startswith('</'):
            # 处理结束标签
            closing_tag = match.group(2)
            if stack and stack[-1][0] == closing_tag:
                stack.pop()
            else:
                # 未匹配到对应的开始标签，记录错误
                errors.append(f"Unmatched closing tag found in file at line {markdown_line_number}: {tag}")
        else:
            # 处理开始标签
            tag_name = match.group(1)
            if tag.endswith('/>'):
                # 自闭合标签，不压入栈中
                pass
            else:
                stack.append((tag_name, markdown_line_number))  # 记录标签名和行号

        index = end_index

    # 检查栈中是否还有未闭合的开始标签
    if stack:
        for tag, tag_line in stack:
            errors.append(f"Unclosed start tag found at line {tag_line} in file: <{tag}>")

    return errors


def extract_html_from_markdown(markdown):
    """
    忽略所有 Markdown 中使用 < 和 > 的语法（如链接、HTML 注释等）。
    同时忽略代码块中的内容。
    """
    html_blocks = []
    block_start_lines = []

    # 匹配 Markdown 代码块的正则表达式
    code_block_pattern = re.compile(r'```.*?```', re.DOTALL)
    inline_code_pattern = re.compile(r'`.*?`')

    # 先移除代码块中的内容
    markdown_without_code_blocks = code_block_pattern.sub('', markdown)
    markdown_without_code_blocks = inline_code_pattern.sub('', markdown_without_code_blocks)

    # 匹配标准 HTML 块的正则表达式，如 <div>...</div> 这种完整块
    html_block_pattern = re.compile(r'<(' + '|'.join(STANDARD_HTML_TAGS) + r')(?:\s[^>]*)?>(.*?)</\1>', re.DOTALL)
    # 匹配单个标准 HTML 标签的正则表达式
    single_tag_pattern = re.compile(r'<(' + '|'.join(STANDARD_HTML_TAGS) + r')(?:\s[^>]*)?/>')

    # 先提取完整的 HTML 块
    for match in html_block_pattern.finditer(markdown_without_code_blocks):
        start_index = match.start()
        start_line = markdown[:start_index].count('\n') + 1
        html_blocks.append(match.group(0))
        block_start_lines.append(start_line)

    # 再提取单个自闭合 HTML 标签
    for match in single_tag_pattern.finditer(markdown_without_code_blocks):
        start_index = match.start()
        start_line = markdown[:start_index].count('\n') + 1
        html_blocks.append(match.group(0))
        block_start_lines.append(start_line)

    return html_blocks, block_start_lines


def check_non_standard_tags(markdown):
    """
    检查 Markdown 正文中的未转义的非标准 HTML 标签（如 <device>），并提示需要添加转义符。
    忽略所有 Markdown 中使用 < 和 > 的语法（如链接、HTML 注释等）。
    同时排除已经转义的标签（如 \<device>）、标签名后带有反斜杠的标签（如 <device\>）以及邮箱格式的标签。
    忽略代码块中的内容。
    """
    errors = []
    # 匹配 Markdown 代码块的正则表达式
    code_block_pattern = re.compile(r'```.*?```', re.DOTALL)
    inline_code_pattern = re.compile(r'`.*?`')
    # 匹配 Markdown 链接和图片的正则表达式
    markdown_link_pattern = re.compile(r'\[.*?\]\(.*?\)')
    markdown_image_pattern = re.compile(r'!\[.*?\]\(.*?\)')
    # 匹配 HTML 注释的正则表达式
    html_comment_pattern = re.compile(r'<!--.*?-->', re.DOTALL)
    # 匹配自动链接（如 <https://example.com>）的正则表达式
    autolink_pattern = re.compile(r'<https?://[^\s>]+>')
    # 匹配邮箱格式的正则表达式（如 <1123678@qq.com>）
    email_pattern = re.compile(r'<[\w\.\-]+@[\w\.\-]+>')

    # 先移除代码块中的内容
    markdown_without_code_blocks = code_block_pattern.sub('', markdown)
    markdown_without_code_blocks = inline_code_pattern.sub('', markdown_without_code_blocks)
    # 移除 Markdown 链接和图片
    markdown_without_code_blocks = markdown_link_pattern.sub('', markdown_without_code_blocks)
    markdown_without_code_blocks = markdown_image_pattern.sub('', markdown_without_code_blocks)
    # 移除 HTML 注释
    markdown_without_code_blocks = html_comment_pattern.sub('', markdown_without_code_blocks)
    # 移除自动链接
    markdown_without_code_blocks = autolink_pattern.sub('', markdown_without_code_blocks)
    # 移除邮箱格式的标签
    markdown_without_code_blocks = email_pattern.sub('', markdown_without_code_blocks)

    # 匹配未转义的非标准 HTML 标签的正则表达式
    # 排除已经转义的标签（如 \<device>）、标签名后带有反斜杠的标签（如 <device\>）以及邮箱格式的标签（如 <1123678@qq.com>）
    non_standard_tag_pattern = re.compile(
        r'(?<!\\)<'  # 匹配 <，但不能前面有反斜杠
        r'(?!/?(' + '|'.join(STANDARD_HTML_TAGS) + r')\b)'  # 排除标准 HTML 标签
        r'(?![\w\.\-]+@[\w\.\-]+>)'  # 排除邮箱格式（如 <1123678@qq.com>）
        r'([^>\\\/]+?)'  # 匹配标签名（非 >、\、/ 的字符）
        r'(?<!\\)>'  # 匹配 >，但不能前面有反斜杠
    )

    # 遍历每一行，检查未转义的非标准标签
    lines = markdown_without_code_blocks.split('\n')
    for line_number, line in enumerate(lines, start=1):
        for match in non_standard_tag_pattern.finditer(line):
            tag = match.group(0)
            errors.append(f"Unescaped non-standard tag found at line {line_number} in the file: {tag}, please modify "
                          f"it to \\{tag}")

    return errors

def process_markdown_file(file_path):
    """
    处理 Markdown 文件，修复未闭合的 HTML 标签和未转义的非标准标签。
    """
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
        markdown_lines = content.split('\n')

    html_blocks, block_start_lines = extract_html_from_markdown(content)
    all_errors = []

    # 检查标准 HTML 标签是否闭合
    for html_block, start_line in zip(html_blocks, block_start_lines):
        errors = check_unclosed_tags(html_block, markdown_lines, start_line)
        all_errors.extend(errors)

    # 检查未转义的非标准 HTML 标签
    non_standard_errors = check_non_standard_tags(content)
    all_errors.extend(non_standard_errors)

    if all_errors:
        for error in all_errors:
            print(f"Error found in file {file_path}: {error}")
        raise ValueError("Unclosed HTML tag or unescaped non-standard tag found")


if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument('--dirs',
                            default="docs/zh/,docs/en/",
                            help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')
        args = parser.parse_args()
        pr_files = get_pr_files(args.dirs)
        for pr_file in pr_files:
            if not os.path.exists(pr_file):
                print(f"file not found: {pr_file}")
                continue
            if ' ' in pr_file:
                pr_file = pr_file.replace(' ', '\ ')
            process_markdown_file(pr_file)
    except ValueError as e:
        print(f"\033[31mError: {e}\033[0m")
        exit(1)  # 退出脚本并返回非零状态码
