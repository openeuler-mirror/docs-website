// 文档捉虫参数类型
export interface DocsBugParamsT {
  bugDocFragment: string; // bug文档片段
  existProblem: string[]; // 问题类型
  problemDetail: string; // 问题类型原因
  comprehensiveSatisfication: number; // 文档满意度
  link: string; // 当前url
}
