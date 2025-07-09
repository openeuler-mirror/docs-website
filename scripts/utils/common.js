/**
 * 获取去除前缀的版本分支名
 * @param {string} branch 原始分支名
 */
export function getBranchName(branch) {
  return branch.replace(/^stable-|^test-/, '');
}
