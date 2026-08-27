#!/bin/bash

set -e
set -o pipefail

handle_error() {
    local exit_code=$?
    echo "Error occurred in script at line: ${1} with exit code: ${exit_code}"
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

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

            # 升级pip工具再重试
            log_info "尝试升级pip工具..."

            # 尝试升级pip3
            if command -v pip3 &>/dev/null; then
                log_info "升级pip3..."
                python3 -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi

            # 尝试升级pip
            if command -v pip &>/dev/null; then
                log_info "升级pip..."
                python -m pip install --quiet --upgrade pip 2>/dev/null || true
            fi

            log_warning "${retry_delay}秒后重试..."
            sleep $retry_delay
            # 指数退避增加等待时间
            retry_delay=$((retry_delay * 2))
        fi
    done

    log_error "安装Python依赖失败，已重试 ${max_retries} 次"
    return 1
}



# 去除 webHook 开头可能存在的冒号前缀
webHook="${webHook#:}"

if command -v jq &>/dev/null; then
    nameSpace=$(printf '%s' "${webHook}" | jq -r '.project.namespace')
    REPOSITORY_NAME=$(printf '%s' "${webHook}" | jq -r '.project.repository_path')
    PR_ID=$(printf '%s' "${webHook}" | jq -r '.merge_request.iid')
    NAME=$(printf '%s' "${webHook}" | jq -r '.project.name')
else
    _py_ns='import sys,json; print(json.loads(sys.stdin.read())["project"]["namespace"])'
    _py_repo='import sys,json; print(json.loads(sys.stdin.read())["project"]["repository_path"])'
    _py_mid='import sys,json; print(json.loads(sys.stdin.read())["merge_request"]["iid"])'
    _py_name='import sys,json; print(json.loads(sys.stdin.read())["project"]["name"])'
    nameSpace=$(printf '%s' "${webHook}" | python3 -c "${_py_ns}")
    REPOSITORY_NAME=$(printf '%s' "${webHook}" | python3 -c "${_py_repo}")
    PR_ID=$(printf '%s' "${webHook}" | python3 -c "${_py_mid}")
    NAME=$(printf '%s' "${webHook}" | python3 -c "${_py_name}")
fi

echo "webHook:${webHook}"
echo "nameSpace:${nameSpace}"
: "${orgName:=ascend}"

echo "REPOSITORY_NAME:${REPOSITORY_NAME}"
echo "NAME:${NAME}"
echo "PR_ID:${PR_ID}"
echo "gitcode_token:${gitcode_token}"
echo "comment:${orgName} docs pipeline is running..."

# 检查仓库是否在配置文件中（NAME或REPOSITORY_NAME任一匹配即可）
CONFIG_URL="${ciConfigUrl}"
REPO_PATH_BY_NAME="${nameSpace}/${NAME}"
REPO_PATH_BY_REPO="${nameSpace}/${REPOSITORY_NAME}"

log_info "检查仓库 ${REPO_PATH_BY_NAME} 或 ${REPO_PATH_BY_REPO} 是否在配置文件中..."

CONFIG_CONTENT=$(curl -s --fail "${CONFIG_URL}")
if [ $? -ne 0 ] || [ -z "${CONFIG_CONTENT}" ]; then
    log_error "无法获取配置文件: ${CONFIG_URL}"
    exit 1
fi

if command -v jq &>/dev/null; then
    REPO_FOUND_BY_NAME=$(printf '%s' "${CONFIG_CONTENT}" | jq -r --arg repo "${REPO_PATH_BY_NAME}" '.repo | has($repo)')
    REPO_FOUND_BY_REPO=$(printf '%s' "${CONFIG_CONTENT}" | jq -r --arg repo "${REPO_PATH_BY_REPO}" '.repo | has($repo)')
else
    _py_check='import sys,json; d=json.loads(sys.stdin.read()); print("true" if sys.argv[1] in d.get("repo", {}) else "false")'
    REPO_FOUND_BY_NAME=$(printf '%s' "${CONFIG_CONTENT}" | python3 -c "${_py_check}" "${REPO_PATH_BY_NAME}")
    REPO_FOUND_BY_REPO=$(printf '%s' "${CONFIG_CONTENT}" | python3 -c "${_py_check}" "${REPO_PATH_BY_REPO}")
fi

if [ "${REPO_FOUND_BY_NAME}" = "true" ]; then
    REPO_PATH="${REPO_PATH_BY_NAME}"
    log_success "仓库 ${REPO_PATH} 已在配置文件中（通过NAME匹配），继续执行..."
elif [ "${REPO_FOUND_BY_REPO}" = "true" ]; then
    REPO_PATH="${REPO_PATH_BY_REPO}"
    log_success "仓库 ${REPO_PATH} 已在配置文件中（通过REPOSITORY_NAME匹配），继续执行..."
else
    log_warning "仓库 ${REPO_PATH_BY_NAME} 和 ${REPO_PATH_BY_REPO} 均未配置在 ${CONFIG_URL}，退出脚本"
    exit 1
fi

git clone https://gitcode.com/Zherphy/zy-scripts.git
cd ./zy-scripts/docs-ci
# 调用函数
install_python_deps || {
    log_error "Python依赖安装失败，退出脚本"
    exit 1
}
python3 addComment.py \
    --owner ${nameSpace} \
    --project ${REPOSITORY_NAME} \
    --pr-number ${PR_ID} \
    --token ${gitcode_token} \
    --comment "${orgName} docs pipeline is running..."
python3 ci_tags.py ${nameSpace} ${REPOSITORY_NAME} ${PR_ID} ${gitcode_token} "ATDR"


