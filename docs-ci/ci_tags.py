#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import sys
import time

MAX_RETRIES = 3
RETRY_DELAY = 2


def request_with_retry(method, url, headers, json_data=None):
    """带重试的 HTTP 请求，针对 429 等可重试状态码"""
    retry_delay = RETRY_DELAY
    for attempt in range(MAX_RETRIES):
        if method == "delete":
            response = requests.delete(url, headers=headers)
        elif method == "post":
            response = requests.post(url, headers=headers, json=json_data)
        else:
            raise ValueError(f"Unsupported method: {method}")

        if response.status_code == 429:
            if attempt < MAX_RETRIES - 1:
                retry_after = int(response.headers.get("Retry-After", retry_delay))
                print(f"收到 429，{retry_after}秒后第 {attempt + 1}/{MAX_RETRIES} 次重试...")
                time.sleep(retry_after)
                retry_delay *= 2
                continue
        return response

    return response

def add_or_remove_labels(owner, project, pr_number, access_token, add_labels, remove_labels):
    """
    添加或删除 PR 标签

    Args:
        owner: 仓库所有者
        project: 项目名称
        pr_number: PR 编号
        access_token: 访问令牌
        add_labels: 要添加的标签列表
        remove_labels: 要删除的标签列表
    """
    try:
        print(f"going to update pr {owner}, {project}, {pr_number}, {add_labels}, {remove_labels}")

        base_url = f"https://gitcode.com/api/v5/repos/{owner}/{project}/pulls/{pr_number}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json;charset=UTF-8"
        }

        # 删除 PR 的标签
        for label in remove_labels:
            request_url = f"{base_url}/labels/{label}"
            print(request_url)

            try:
                response = request_with_retry("delete", request_url, headers)
                print(f"Delete label '{label}' response: {response.status_code}")
                if response.status_code == 404:
                    print(f"Label '{label}' not found, may have been already removed")
                elif response.status_code == 200:
                    print(f"Label '{label}' removed successfully")
                elif response.status_code == 429:
                    print(f"Delete label '{label}' still 429 after retries")
            except Exception as e:
                print(f"Error deleting label {label}: {e}")

        # 添加新的标签
        if add_labels:
            request_url = f"{base_url}/labels"
            print(f"Adding labels to: {request_url}")
            print(f"Labels to add: {add_labels}")

            try:
                response = request_with_retry("post", request_url, headers, json_data=add_labels)
                print(f"Add labels response: {response.status_code}")

                if response.status_code in [200, 201]:
                    print("Labels added successfully")
                elif response.status_code == 429:
                    print(f"Failed to add labels: still 429 after retries")
                else:
                    print(f"Failed to add labels: {response.status_code} - {response.text}")

            except Exception as e:
                print(f"Error adding labels: {e}")
        else:
            print("No labels to add")

        print("Label update operation completed")

    except Exception as ex:
        print(f"Failed to update PR labels: {ex}")
        raise

def main():
    """主函数 - 支持多种调用方式"""
    if len(sys.argv) == 6:
        # 方式1: python3 ci_tags.py owner repo pr_number token action
        owner, project, pr_number, token, action = sys.argv[1:6]

        if action == "ATDS":
            add_labels = ["docs-ci-pipeline-success"]
            remove_labels = ["docs-ci-pipeline-failed", "docs-ci-pipeline-running"]
        elif action == "ATDF":
            add_labels = ["docs-ci-pipeline-failed"]
            remove_labels = ["docs-ci-pipeline-success", "docs-ci-pipeline-running"]
        elif action == "ATDR":
            add_labels = ["docs-ci-pipeline-running"]
            remove_labels = ["docs-ci-pipeline-success", "docs-ci-pipeline-failed"]
        else:
            print(f"Unknown action: {action}")
            sys.exit(1)

    elif len(sys.argv) >= 7:
        # 方式2: python3 ci_tags.py owner repo pr_number token add_label1,add_label2 remove_label1,remove_label2
        owner, project, pr_number, token = sys.argv[1:5]
        add_labels = sys.argv[5].split(',') if sys.argv[5] else []
        remove_labels = sys.argv[6].split(',') if len(sys.argv) > 6 and sys.argv[6] else []
    else:
        print("Usage:")
        print("方式1: python3 ci_tags.py <owner> <repo> <pr_number> <token> <ATDS|ATDF>")
        print("方式2: python3 ci_tags.py <owner> <repo> <pr_number> <token> <add_labels> <remove_labels>")
        print("示例: python3 ci_tags.py owner repo 123 token ATDS")
        print("示例: python3 ci_tags.py owner repo 123 token 'label1,label2' 'oldlabel1,oldlabel2'")
        sys.exit(1)

    add_or_remove_labels(owner, project, pr_number, token, add_labels, remove_labels)

if __name__ == "__main__":
    main()