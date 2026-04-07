PROJECT_PATH="$(pwd)"
CACHE_PATH="$PROJECT_PATH/.cache"
DOCS_PATH="$PROJECT_PATH/.cache/docs-centralized"

echo "PROJECT_PATH: $PROJECT_PATH"
echo "CACHE_PATH: $CACHE_PATH"
echo "DOCS_PATH: $DOCS_PATH"

# 判断 .cache 目录是否存在
if [ ! -d "$CACHE_PATH" ]; then
  mkdir -p $CACHE_PATH
fi

# 判断 docs-centralized 是否存在
if [ -d "$DOCS_PATH" ]; then
  echo "已存在 docs-centralized，跳过拉取~"
else
  echo "不存在 docs-centralized，开始拉取..."
  git clone https://gitee.com/openeuler/docs-centralized.git $DOCS_PATH
  echo "拉取完成！"
fi

# 获取要获取的文档版本分支
VERSION=("$@")

if [ $1 == "all" ]; then
  VERSION=(
    "stable2-24.09" 
    "stable2-22.03_LTS_SP4" 
    "stable2-24.03_LTS" 
    "stable2-22.03_LTS_SP3" 
    "stable2-20.03_LTS_SP4" 
    "stable2-23.09" 
    "stable2-22.03_LTS_SP2" 
    "stable2-23.03" 
    "stable2-22.03_LTS_SP1" 
    "stable2-22.09" 
    "stable2-22.03_LTS" 
    "stable2-20.03_LTS_SP3" 
    "stable2-21.09" 
    "stable2-20.03_LTS_SP2" 
    "stable2-21.03" 
    "stable2-20.03_LTS_SP1" 
    "stable2-20.09" 
    "stable2-20.03_LTS"
  )
fi

# 遍历拉取文档
for branch in "${VERSION[@]}"; do
  echo "拉取的文档版本为：$branch"
  cd $DOCS_PATH

  # 放弃 docs-centralized 所有修改
  git checkout HEAD -- . && git clean -fd

  # 切换分支
  if git show-ref --quiet refs/heads/"$branch"; then
    echo "分支 $branch 已存在"
    git checkout "$branch"
    if ! git pull origin "$branch"; then
      echo "拉取失败，放弃本地修改并强制更新..."
      git reset --hard "origin/$branch"
    fi
  else
    echo "分支 $branch 不存在，拉取远程分支 $branch"
    git checkout -b $branch origin/$branch
  fi

  # 复制文档到指定位置
  branch_name="${branch#stable2-}"
  echo "复制文档到 $PROJECT_PATH/content/zh/docs/$branch_name"
  rm -rf $PROJECT_PATH/content/zh/docs/$branch_name
  mkdir -p $PROJECT_PATH/content/zh/docs/$branch_name
  cp -r $DOCS_PATH/docs/zh/* $PROJECT_PATH/content/zh/docs/$branch_name

  echo "复制文档到 $PROJECT_PATH/content/en/docs/$branch_name"
  rm -rf $PROJECT_PATH/content/en/docs/$branch_name
  mkdir -p $PROJECT_PATH/content/en/docs/$branch_name
  cp -r $DOCS_PATH/docs/en/* $PROJECT_PATH/content/en/docs/$branch_name
done

cd $PROJECT_PATH
hugo server