export interface Identity {
  login_name: string;
  userIdInIdp: string;
  identity: string; // 第三方平台类型，gitee/github
  user_name: string;
  accessToken: string;
}

// 用户账号数据类型
export interface UserInfoT {
  photo: string; // 头像
  username: string; // 用户名
  email: string; // 邮箱
  phoneCountryCode: string; // 区号
  phone: string; // 手机号
  identities: Identity[]; // 绑定的第三方平台账号
  recipientId?: number; // 接收人id
}
