import os
import subprocess


def get_pr_files(base_dirs=None):
    """
    获取 PR 修改过的 Markdown 文件列表

    Args:
        base_dirs (list|str|None): 可以是：
            - None: 使用默认 ['docs/zh/', 'docs/en/']
            - 字符串: 如 "doc/zh/,doc/en/" (兼容旧调用)
            - 列表: 如 ['doc/zh/', 'doc/en/'] (推荐新方式)

    Returns:
        list: 符合条件的文件路径列表
    """
    # 参数标准化处理
    if base_dirs is None:
        base_dirs = ['docs/zh/', 'docs/en/']
    elif isinstance(base_dirs, str):
        base_dirs = [d.strip() for d in base_dirs.split(',') if d.strip()]

    PR_LIST_FILE = 'pr_list'
    DIFF_INFO_FILE = 'diff_info'
    res = []

    if os.path.exists(PR_LIST_FILE):
        with open(PR_LIST_FILE, 'r') as f:
            res = [line.strip() for line in f if line.strip()]
    else:
        subprocess.call(f'git show --numstat > {DIFF_INFO_FILE}', shell=True)
        with open(DIFF_INFO_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if not line: continue

                parts = line.split('\t')
                if len(parts) < 3 or not parts[0].isdigit():
                    continue

                path = parts[2].strip()
                added = int(parts[0])  # 新增行数
                deleted = int(parts[1])  # 删除行数
                if added == 0 and deleted >= 0:
                    continue
                if '=>' in path:  # 处理重命名
                    path = path.split('{')[0] + path.split('=>')[1].replace('}', '').replace('{', '').strip()

                if path.endswith('.md'):
                    for base in base_dirs:
                        if path.startswith(base):
                            res.append(path)
                            break

        with open(PR_LIST_FILE, 'w') as f:
            f.write('\n'.join(res))

    return res
