#!/usr/bin/env python3
import requests
import json
import sys
import time
import os
import argparse

def add_gitcode_comment(owner, project, pr_number, access_token, comment, base_url=None, timeout=30, retry_count=3):
    """添加评论到GitCode PR"""

    # 支持自定义基础URL（便于测试）
    if base_url is None:
        base_url = "https://gitcode.com/api/v5"

    url = f"{base_url}/repos/{owner}/{project}/pulls/{pr_number}/comments"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json;charset=UTF-8"
    }

    def send_comment(comment_text, retry=retry_count):
        """发送单个评论，支持重试"""
        data = {"body": comment_text}

        for attempt in range(retry):
            try:
                response = requests.post(url, headers=headers, json=data, timeout=timeout)
                response.raise_for_status()
                return True, response.json()
            except requests.exceptions.RequestException as e:
                if attempt < retry - 1:
                    print(f"Attempt {attempt + 1} failed, retrying...")
                    time.sleep(2)  # 重试前等待
                else:
                    return False, str(e)
        return False, "Max retries exceeded"

    # 如果评论长度不超过8000，直接发送
    if len(comment) <= 8000:
        success, result = send_comment(comment)
        if success:
            print("Comment added successfully")
            return True
        else:
            print(f"Failed to add comment: {result}")
            return False

    # 长评论分片处理
    print(f"Comment too long ({len(comment)} characters), splitting into chunks...")

    # 可配置的分块大小
    max_chunk_size = 7900
    chunks = []
    current_chunk = ""

    # 按行处理，保持行完整性
    lines = comment.split('\n')
    for line in lines:
        # 如果单行就超过限制，需要特殊处理
        if len(line) > max_chunk_size:
            # 对超长行进行强制分割
            words = line.split(' ')
            temp_line = ""
            for word in words:
                if len(temp_line) + len(word) + 1 > max_chunk_size:
                    if temp_line:
                        chunks.append(temp_line)
                    temp_line = word
                else:
                    temp_line += " " + word if temp_line else word
            if temp_line:
                if len(current_chunk) + len(temp_line) + 1 > max_chunk_size:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = temp_line
                else:
                    current_chunk += "\n" + temp_line if current_chunk else temp_line
        else:
            if len(current_chunk) + len(line) + 1 > max_chunk_size:
                chunks.append(current_chunk)
                current_chunk = line
            else:
                current_chunk += "\n" + line if current_chunk else line

    if current_chunk:
        chunks.append(current_chunk)

    print(f"Split into {len(chunks)} chunks")

    success_count = 0
    for i, chunk in enumerate(chunks):
        total_chunks = len(chunks)

        # 可配置的块前缀
        if total_chunks > 1:
            chunk_header = f"**评论部分 {i+1}/{total_chunks}**\n\n"
            chunk_footer = "\n\n---\n*还有后续内容...*" if i < total_chunks - 1 else ""
            chunk_comment = chunk_header + chunk + chunk_footer
        else:
            chunk_comment = chunk

        success, result = send_comment(chunk_comment)
        if success:
            success_count += 1
            print(f"✅ Chunk {i+1}/{total_chunks} sent successfully")
        else:
            print(f"❌ Failed to send chunk {i+1}: {result}")

        # 可配置的延迟时间
        if i < total_chunks - 1:
            time.sleep(1)  # 块间延迟

    success = success_count == len(chunks)
    if success:
        print(f"✅ All {success_count} chunks sent successfully")
    else:
        print(f"❌ Only {success_count}/{len(chunks)} chunks sent successfully")

    return success

def main():
    parser = argparse.ArgumentParser(description='Add comment to GitCode PR')
    parser.add_argument('--owner', required=True, help='Repository owner')
    parser.add_argument('--project', required=True, help='Project name')
    parser.add_argument('--pr-number', required=True, help='PR number')
    parser.add_argument('--token', required=True, help='Access token')
    parser.add_argument('--comment', required=True, help='Comment content')
    parser.add_argument('--comment-file', help='Read comment from file (overrides --comment)')
    parser.add_argument('--base-url', default='https://gitcode.com/api/v5', help='Base API URL')
    parser.add_argument('--timeout', type=int, default=30, help='Request timeout in seconds')
    parser.add_argument('--retry', type=int, default=3, help='Retry count')
    parser.add_argument('--dry-run', action='store_true', help='Dry run without actually sending')

    args = parser.parse_args()

    # 从文件读取评论或使用参数
    if args.comment_file:
        try:
            with open(args.comment_file, 'r', encoding='utf-8') as f:
                comment_content = f.read()
        except Exception as e:
            print(f"Error reading comment file: {e}")
            sys.exit(1)
    else:
        comment_content = args.comment

    if args.dry_run:
        print("=== DRY RUN ===")
        print(f"Owner: {args.owner}")
        print(f"Project: {args.project}")
        print(f"PR Number: {args.pr_number}")
        print(f"Token: {args.token[:10]}...")  # 只显示部分token
        print(f"Comment length: {len(comment_content)}")
        print(f"Base URL: {args.base_url}")
        print("=== END DRY RUN ===")
        sys.exit(0)

    success = add_gitcode_comment(
        owner=args.owner,
        project=args.project,
        pr_number=args.pr_number,
        access_token=args.token,
        comment=comment_content,
        base_url=args.base_url,
        timeout=args.timeout,
        retry_count=args.retry
    )

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()