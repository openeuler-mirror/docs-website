/**
 * 获取去除前缀的版本分支名
 * @param {string} branch - 原始分支名，可能包含前缀
 * @returns {string} 清理后的分支名，不包含指定前缀
 */
export function getBranchName(branch) {
  return branch.replace(/^stable2-|stable-|^test-/, '');
}

/**
 * 解析命令行具名参数
 * @returns {object} 解析后的参数对象，键为参数名，值为参数值
 */
export function parseNamedArgs() {
  const args = process.argv.slice(2);
  const namedArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        // 等号后面作为值：--key=val
        namedArgs[key] = value;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        // 下一个参数作为值：--key val 
        namedArgs[key] = args[i + 1];
        i++; // 跳过下一个参数
      } else {
        // 后面没有值作为布尔类型，值为 true
        namedArgs[key] = true;
      }
    }
  }
  
  return namedArgs;
}

/**
 * sleep 休眠
 * @param {number} ms 休眠时间
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}