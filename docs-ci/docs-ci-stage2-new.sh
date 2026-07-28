#!/bin/bash

set -e
set -o pipefail

handle_error() {
    local exit_code=$?
    echo "Error occurred in script at line: ${1} with exit code: ${exit_code}"
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# Color definitions
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 去除 webHook 开头可能存在的冒号前缀
webHook="${webHook#:}"

if command -v jq &>/dev/null; then
    nameSpace=$(printf '%s' "${webHook}" | jq -r '.project.namespace')
    REPOSITORY_NAME=$(printf '%s' "${webHook}" | jq -r '.project.repository_path')
    PR_ID=$(printf '%s' "${webHook}" | jq -r '.merge_request.iid')
    NAME=$(printf '%s' "${webHook}" | jq -r '.project.name')
    TARGET_BRANCH=$(printf '%s' "${webHook}" | jq -r '.merge_request.target_branch')
else
    _py_ns='import sys,json; print(json.loads(sys.stdin.read())["project"]["namespace"])'
    _py_repo='import sys,json; print(json.loads(sys.stdin.read())["project"]["repository_path"])'
    _py_mid='import sys,json; print(json.loads(sys.stdin.read())["merge_request"]["iid"])'
    _py_name='import sys,json; print(json.loads(sys.stdin.read())["project"]["name"])'
    _py_branch='import sys,json; print(json.loads(sys.stdin.read())["merge_request"]["target_branch"])'
    nameSpace=$(printf '%s' "${webHook}" | python3 -c "${_py_ns}")
    REPOSITORY_NAME=$(printf '%s' "${webHook}" | python3 -c "${_py_repo}")
    PR_ID=$(printf '%s' "${webHook}" | python3 -c "${_py_mid}")
    NAME=$(printf '%s' "${webHook}" | python3 -c "${_py_name}")
    TARGET_BRANCH=$(printf '%s' "${webHook}" | python3 -c "${_py_branch}")
fi

mkdir PR-${PR_ID}
cd PR-${PR_ID}

# 安装Python依赖
install_python_deps() {
    if python3 -c "import requests, yaml" 2>/dev/null; then
        log_info "Python依赖已安装，跳过安装"
        return 0
    fi

    local max_retries=3
    local retry_delay=1
    local retry_count=0

    log_info "安装Python依赖..."

    while [ $retry_count -lt $max_retries ]; do
        # 尝试使用pip3安装
        if pip3 install --quiet requests pyyaml; then
            log_success "Python依赖安装成功"
            return 0
        fi

        log_warning "pip3安装失败，尝试使用pip..."

        # 尝试使用pip安装
        if pip install --quiet requests pyyaml; then
            log_success "Python依赖安装成功"
            return 0
        fi

        retry_count=$((retry_count + 1))

        if [ $retry_count -lt $max_retries ]; then
            log_warning "安装失败，第 ${retry_count}/${max_retries} 次重试"

            log_info "尝试升级pip工具..."

            if command -v pip3 &>/dev/null; then
                log_info "升级pip3..."
                python3 -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi

            if command -v pip &>/dev/null; then
                log_info "升级pip..."
                python -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi

            log_warning "${retry_delay}秒后重试..."
            sleep $retry_delay
            retry_delay=$((retry_delay * 2))
        fi
    done

    log_error "安装Python依赖失败，已重试 ${max_retries} 次"
    return 1
}

git clone -b ${TARGET_BRANCH} https://${gitcode_username}:${gitcode_token}@gitcode.com/${nameSpace}/${REPOSITORY_NAME}.git
cd ${REPOSITORY_NAME}

if ! git config user.email "drizzlezyk@163.com"; then
    log_error "设置Git用户邮箱失败"
    exit 1
fi

if ! git config user.name "drizzlezyk"; then
    log_error "设置Git用户名失败"
    exit 1
fi

git branch
git checkout -b pr_${PR_ID}
git fetch origin merge-requests/${PR_ID}/head:master-${PR_ID}
git merge --no-edit master-${PR_ID}

git -c core.quotepath=false show --numstat

cd ..
ls
mkdir ci
cd ./ci

wget https://raw.gitcode.com/openeuler/docs-website/raw/ci/docs-ci-v2.js
wget https://raw.gitcode.com/openeuler/docs-website/raw/ci/package.json
wget https://raw.gitcode.com/openeuler/docs-website/raw/ci/.npmrc

npm i

# 通过华为云 CodeArts Pipeline 接口获取目标 jobRunId
install_huawei_sdk() {
    if python3 -c "import huaweicloudsdkcore, huaweicloudsdkcodeartspipeline" 2>/dev/null; then
        log_info "华为云 SDK 已安装，跳过安装"
        return 0
    fi

    local max_retries=3
    local retry_delay=1
    local retry_count=0

    log_info "安装华为云 CodeArts Pipeline Python SDK..."

    while [ $retry_count -lt $max_retries ]; do
        if pip3 install --quiet huaweicloudsdkcore huaweicloudsdkcodeartspipeline \
            || pip install --quiet huaweicloudsdkcore huaweicloudsdkcodeartspipeline; then
            log_success "华为云 SDK 安装成功"
            return 0
        fi

        retry_count=$((retry_count + 1))

        if [ $retry_count -lt $max_retries ]; then
            log_warning "华为云 SDK 安装失败，第 ${retry_count}/${max_retries} 次重试"

            log_info "尝试升级pip工具..."
            if command -v pip3 &>/dev/null; then
                python3 -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi
            if command -v pip &>/dev/null; then
                python -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi

            log_warning "${retry_delay}秒后重试..."
            sleep $retry_delay
            retry_delay=$((retry_delay * 2))
        fi
    done

    log_error "华为云 SDK 安装失败，已重试 ${max_retries} 次"
    return 1
}

install_huawei_sdk || log_warning "华为云 SDK 安装失败，jobRunId 将置为空，脚本继续执行"

: "${HUAWEI_REGION:=cn-north-4}"

jobRunId=$(
    HUAWEI_REGION="${HUAWEI_REGION}" \
    CLOUD_SDK_AK="${CLOUD_SDK_AK}" \
    CLOUD_SDK_SK="${CLOUD_SDK_SK}" \
    project_id_codearts="${project_id_codearts}" \
    PIPELINE_ID="${PIPELINE_ID}" \
    PIPELINE_RUN_ID="${PIPELINE_RUN_ID}" \
    python3 - <<'PY'
import os
import sys

ak = os.environ.get("CLOUD_SDK_AK", "")
sk = os.environ.get("CLOUD_SDK_SK", "")
project_id_codearts = os.environ.get("project_id_codearts", "")
pipeline_id = os.environ.get("PIPELINE_ID", "")
pipeline_run_id = os.environ.get("PIPELINE_RUN_ID", "")
region_id = os.environ.get("HUAWEI_REGION", "cn-north-4")

job_run_id = ""
try:
    from huaweicloudsdkcore.auth.credentials import BasicCredentials
    from huaweicloudsdkcodeartspipeline.v2 import (
        CodeArtsPipelineClient,
        ShowPipelineRunDetailRequest,
    )
    from huaweicloudsdkcodeartspipeline.v2.region.codeartspipeline_region import (
        CodeArtsPipelineRegion,
    )

    credentials = BasicCredentials(ak, sk)
    client = (
        CodeArtsPipelineClient.new_builder()
        .with_credentials(credentials)
        .with_region(CodeArtsPipelineRegion.value_of(region_id))
        .build()
    )
    request = ShowPipelineRunDetailRequest(
        project_id=project_id_codearts,
        pipeline_id=pipeline_id,
        pipeline_run_id=pipeline_run_id,
    )
    response = client.show_pipeline_run_detail(request)
    detail = response.to_dict() if hasattr(response, "to_dict") else dict(response)
    # 取目标 jobRunId：stages[2].jobs[0].id
    job_run_id = detail["stages"][2]["jobs"][0].get("id") or ""
except Exception as exc:  # noqa: BLE001
    sys.stderr.write(f"获取 jobRunId 失败，将置为空: {exc}\n")
    job_run_id = ""

sys.stdout.write(job_run_id)
PY
)

if [ -z "${jobRunId}" ]; then
    log_warning "jobRunId 为空，detailLink 中 jobRunId 参数将为空字符串"
else
    log_success "获取 jobRunId 成功: ${jobRunId}"
fi

detailLink="https://www.openlibing.com/apps/pipelineDetail?projectId=${projectId}&pipelineId=${PIPELINE_ID}&pipelineRunId=${PIPELINE_RUN_ID}&codeHostingPlatformFlag=gitcode&jobRunId=${jobRunId}"
echo "detailLink: ${detailLink}"
node docs-ci-v2.js \
    --repoPath="../${REPOSITORY_NAME}" \
    --targetOwnerRepo="${nameSpace}/${REPOSITORY_NAME}" \
    --targetOwnerName="${nameSpace}/${NAME}" \
    --targetBranch="${TARGET_BRANCH}" \
    --detailUrl="${detailLink}" \
    --outputCount="20" \
    --ciConfigUrl="${ciConfigUrl}"

if [ -f "output.md" ]; then
    output=$(cat output.md)
else
    output="file-non-existence"
fi
echo "output:$output"

git clone https://gitcode.com/Zherphy/zy-scripts.git
cd ./zy-scripts/docs-ci

install_python_deps || {
    log_error "Python依赖安装失败，退出脚本"
    exit 1
}

if [ "$output" = "file-non-existence" ]; then
    python3 addComment.py \
        --owner ${nameSpace} \
        --project ${REPOSITORY_NAME} \
        --pr-number ${PR_ID} \
        --token ${gitcode_token} \
        --comment "❌ 文档门禁运行失败！"
    python3 ci_tags.py ${nameSpace} ${REPOSITORY_NAME} ${PR_ID} ${gitcode_token} ATDF
    echo 'failed :('
    exit 1
elif ! printf '%s' "$output" | head -n 1 | grep -qF "❌"; then
    python3 addComment.py \
        --owner ${nameSpace} \
        --project ${REPOSITORY_NAME} \
        --pr-number ${PR_ID} \
        --token ${gitcode_token} \
        --comment "$output"
    python3 ci_tags.py ${nameSpace} ${REPOSITORY_NAME} ${PR_ID} ${gitcode_token} ATDS
    echo "$output"
    echo 'succeeded!'
else
    python3 addComment.py \
        --owner ${nameSpace} \
        --project ${REPOSITORY_NAME} \
        --pr-number ${PR_ID} \
        --token ${gitcode_token} \
        --comment "$output"
    python3 ci_tags.py ${nameSpace} ${REPOSITORY_NAME} ${PR_ID} ${gitcode_token} ATDF
    echo "$output"
    echo 'failed :('
    exit 1
fi
