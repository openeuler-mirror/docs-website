import os
import subprocess
import sys
import argparse
from common import get_pr_files


def main():
    # 初始化参数解析
    parser = argparse.ArgumentParser(
        description='Markdown 格式检查工具',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--style-file',
                        default='style.rb',
                        help='markdownlint 样式文件路径')
    parser.add_argument('--dirs',
                        default="docs/zh/,docs/en/",
                        help='用逗号分隔的文档目录，例如 "doc/zh/,doc/en/"')

    args = parser.parse_args()

    # 获取并验证目录列表
    base_dirs = [d.strip() for d in args.dirs.split(',') if d.strip()]
    for d in base_dirs:
        if not os.path.isdir(d):
            print(f"错误：目录不存在 {d}")
            return

    # 获取待检查文件列表
    pr_files = get_pr_files(args.dirs)  # 保持字符串参数传递

    # 动态生成要跳过的菜单文件路径（适配所有输入目录）
    skip_files = [
        os.path.join(d, "menu/index.md") for d in base_dirs
    ]

    has_errors = 0
    for pr_file in pr_files:
        if not os.path.exists(pr_file):
            print(f"警告：文件不存在 {pr_file}")
            continue

        # 跳过菜单文件（适配所有输入目录）
        if any(pr_file.replace('\\', '/').endswith(skip.replace('\\', '/'))
               for skip in skip_files):
            print(f"跳过菜单文件: {pr_file}")
            continue

        if pr_file.endswith('.md'):
            # 跨平台文件名处理
            processed_file = pr_file
            if ' ' in pr_file:
                processed_file = f'"{pr_file}"' if os.name == 'nt' else pr_file.replace(' ', '\\ ')

            # 执行检查
            cmd = f'mdl -s {args.style_file} {processed_file}'
            exit_code = subprocess.call(cmd, shell=True)
            if exit_code != 0:
                print(f"格式错误发现于: {pr_file}")
                has_errors = 1

    # 输出最终结果
    if has_errors:
        print("\n请修正以上文件的格式问题")
        sys.exit(1)
    else:
        print("\n✓ 所有文件格式检查通过")
        sys.exit(0)


if __name__ == '__main__':
    main()