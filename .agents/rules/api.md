# API 规范

## 文件组织

```
/xxx/api/
├── api-user.ts          # 用户相关接口
├── api-home.ts         # 首页接口
├── api-search.ts       # 搜索接口
├── api-news.ts         # 新闻接口
├── api-login.ts        # 登录接口
└── api-[模块名].ts     # 其他业务接口
```

命名规则：`api-[模块名].ts`

---

## axios 实例

**始终从 `@/shared/axios` 导入，**禁止**自行创建 axios 实例。**

```typescript
// ✅ 正确
import { request } from '@/shared/axios';
import type { AxiosResponse } from '@/shared/axios';

// ❌ 禁止
import axios from 'axios';
const myAxios = axios.create({ ... });
```

---

## API 函数编写规范

### 函数注释

所有 API 函数必须添加 JSDoc 注释，包含函数说明和参数说明：

```typescript
// ❌ 错误：缺少注释
export function getUserList() {
  return request
    .get('/api-xxx/list')
    .then((res: AxiosResponse) => res.data);
}

// ❌ 错误：缺少参数说明
/**
 * 获取用户详情
 */
export function getUserDetail(userName: string) {
  return request
    .get(`/api-xxxx/detail/${userName}`)
    .then((res: AxiosResponse) => res.data);
}

// ✅ 正确：包含函数说明和参数说明
/**
 * 获取用户列表
 * @returns {Promise} 用户列表数据
 */
export function getUserList() {
  return request
    .get('/api-xxx/list')
    .then((res: AxiosResponse) => res.data);
}

/**
 * 获取用户详情
 * @param {string} userName 用户名称
 * @returns {Promise} 用户详情数据
 */
export function getUserDetail(userName: string) {
  return request
    .get(`/api-xxxx/detail/${userName}`)
    .then((res: AxiosResponse) => res.data);
}

/**
 * 获取用户角色
 * @param {string} userName 用户名称
 * @returns {Promise} 用户角色数据
 */
export function getUserRole(userName: string) {
  return request
    .get('/api-xxxx/role', {
      params: { user_name: decodeURIComponent(userName) },
    })
    .then((res: AxiosResponse) => res.data);
}
```

### GET 请求参数传递

`get` 请求使用 `params` 参数，**禁止**直接将 query 参数拼接到 url：

```typescript
// ✅ 正确：使用 params 参数传递 query 参数
export function getUserRole(userName: string) {
  return request
    .get('/api-xxxx/role', {
      params: { user_name: decodeURIComponent(userName) },
    })
    .then((res: AxiosResponse) => res.data);
}

// ✅ 正确：路径参数可使用模板字符串拼接
export function getUserDetail(userName: string) {
  return request
    .get(`/api-xxxx/detail/${userName}`)
    .then((res: AxiosResponse) => res.data);
}

// ❌ 错误：直接将 query 参数拼接到 url
export function getUserRole(userName: string) {
  return request
    .get(`/api-xxxx/role?user_name=${userName}`)
    .then((res: AxiosResponse) => res.data);
}
```

---

## 组件中调用 API

```typescript
// ✅ 必须用 try/catch，配合 loading 状态
const userList = ref<UserItemT[]>([]);
const loading = ref(false);

const fetchUserList = async () => {
  loading.value = true;
  try {
    const res = await getUserList();
    userList.value = res.list ?? [];
  } catch (error) {
    console.error('获取用户列表失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUserList();
});

// ❌ 禁止不处理错误
const res = await getUserList();  // 无 try/catch
```
