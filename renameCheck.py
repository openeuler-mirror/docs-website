import os
import subprocess
from typing import Dict, List, Optional


def check_redirects() -> bool:
    """
    检查所有变更的文档文件是否都在 _redirect.yaml 中有对应的重定向

    Returns:
        bool: 是否所有变更文件都有重定向映射
    """
    # 1. 获取变更的文档文件
    changed_docs = get_changed_docs()
    if not changed_docs:
        print("No document files changed.")
        return True

    # 2. 查找并加载 _redirect.yaml 文件
    redirect_file = find_redirect_file()
    if not redirect_file:
        print("Error: _redirect.yaml not found in current directory or subdirectories.")
        return False

    redirects = load_redirects(redirect_file)
    if not redirects:
        print(f"Error: {redirect_file} is empty or invalid.")
        return False

    # 3. 检查每个变更文件是否有重定向
    all_valid = True
    for doc in changed_docs:
        if doc not in redirects:
            print(f"Error: Changed document '{doc}' is not in {redirect_file}")
            all_valid = False
        else:
            print(f"Valid: {doc} -> {redirects[doc]}")

    return all_valid


def find_redirect_file() -> Optional[str]:
    """
    在当前目录及其子目录中查找 _redirect.yaml 文件

    Returns:
        Optional[str]: 找到的文件路径，如果未找到则返回 None
    """
    for root, _, files in os.walk('.'):
        if '_redirect.yaml' in files:
            return os.path.join(root, '_redirect.yaml')
    return None


def load_redirects(redirect_file: str) -> Dict[str, str]:
    """
    加载 _redirect.yaml 文件并解析为字典

    Args:
        redirect_file: 重定向文件路径

    Returns:
        Dict[str, str]: 原路径到新路径的映射字典
    """
    with open(redirect_file, 'r') as f:
        content = f.read()

    # 解析 YAML 内容
    redirects = {}
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        if ':' in line:
            parts = line.split(':', 1)
            old_path = parts[0].strip()
            new_path = parts[1].strip().strip('"\'')

            # 处理可能的多行标记 '>-'
            if new_path.startswith('>-'):
                new_path = new_path[2:].strip()

            redirects[old_path] = new_path

    return redirects


def get_changed_docs() -> List[str]:
    """获取变更的文档文件（仅限 docs/zh/ 和 docs/en/ 下的 .md 文件）"""
    changed_files = get_all_changed_files()
    return [
        file for file in changed_files
        if (file.startswith('docs/zh/') or file.startswith('docs/en/'))
           and file.endswith('.md')
    ]


def get_all_changed_files() -> List[str]:
    """
    获取所有变更的文件（包括新增、修改、删除、重命名）
    结合 git diff 和 git show --numstat 确保不遗漏重命名文件

    Returns:
        List[str]: 变更的文件路径列表
    """
    changed_files = set()

    # 1. 使用 git diff 获取变更文件（包括暂存和未暂存的变更）
    diff_cmd = "git diff --name-only HEAD"
    try:
        diff_output = subprocess.check_output(diff_cmd, shell=True, stderr=subprocess.PIPE).decode().strip()
        for file in diff_output.split('\n'):
            if file.strip():
                changed_files.add(file.strip())
    except subprocess.CalledProcessError as e:
        print(f"Error executing git diff: {e.stderr.decode()}")

    # 2. 使用 git show --numstat 检测文件重命名/移动
    show_cmd = "git show --numstat --pretty=\"\" HEAD"
    try:
        show_output = subprocess.check_output(show_cmd, shell=True, stderr=subprocess.PIPE).decode().strip()
        for line in show_output.split('\n'):
            if not line.strip():
                continue

            parts = line.split('\t')
            if len(parts) < 3:
                continue

            path_part = parts[2].strip()
            if '=>' in path_part:
                # 处理重命名文件（如 "path/{old => new}/file.md"）
                new_path = path_part.split('{')[0] + path_part.split('=>')[1].replace('}', '').strip()
                changed_files.add(new_path)
    except subprocess.CalledProcessError as e:
        print(f"Error executing git show: {e.stderr.decode()}")

    return sorted(changed_files)

if __name__ == "__main__":
    if not check_redirects():
        print("\nERROR: Some changed documents are not in _redirect.yaml")
        exit(1)
    else:
        print("\nSUCCESS: All changed documents have redirects")
