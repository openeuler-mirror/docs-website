# TypeScript 规范

## 基本要求

- 所有文件使用 `.ts` / `.vue` 扩展名，**不使用** `.js`
- 启用严格模式（`tsconfig.json` 中 `"strict": true`）
- **禁止**使用 `any`，特殊情况必须添加注释说明原因

---

## 类型文件组织

```
xxxx/@types/
├── home.ts          # 首页相关类型
├── search.ts        # 搜索相关类型
├── response.ts      # 通用响应类型
└── [模块名].ts      # 其他业务模块类型
```

---

## 接口 vs 类型别名

```typescript
// ✅ 对象结构使用 interface
interface UserItemT {
  name: string;
  email: string;
  role: string;
}

// ✅ 联合类型、工具类型使用 type
type Theme = 'light' | 'dark';
type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

// ✅ 继承扩展使用 interface extends
interface UserDetailT extends UserItemT {
  createdAt: string;
  lastLogin: string;
};
```

---

## API 类型命名约定

```typescript
// @types/user.ts

// 请求参数类型：QueryT 后缀
export interface UserListQueryT {
  page: number;
  pageSize: number;
  keyword?: string;
}

// 响应数据类型：T 后缀（单项）
export interface UserItemT {
  name: string;
  email: string;
}

// 列表响应：ListT 后缀
export interface UserListT {
  list: UserItemT[];
  total: number;
}

// 详情响应：DetailT 后缀
export interface UserDetailT extends UserItemT {
  role: string;
  createdAt: string;
};
```

---

## Ref 类型标注

```typescript
// 基础类型自动推导，无需标注
const count = ref(0);
const name = ref('');

// 复杂类型必须显式标注
const userList = ref<UserItemT[]>([]);
const currentUser = ref<UserDetailT | null>(null);
```

---

## 枚举替代方案

```typescript
// ❌ 避免使用 enum（运行时有额外开销）
enum Status { Active, Inactive }

// ✅ 使用 const object + 类型
const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type StatusType = typeof STATUS[keyof typeof STATUS];
// => 'active' | 'inactive'

// ✅ useScreen 中已有的 Size enum 可延续使用（历史代码）
import { Size } from '@/composables/useScreen';
```

---

## 非空断言

```typescript
// ❌ 避免随意使用非空断言
const name = user!.name;

// ✅ 使用可选链 + 空值合并
const name = user?.name ?? '未知';

// ✅ 提前 guard
if (!user) {
  return;
}
const name = user.name;
```

---

## JSDoc 注释规范

公共函数（API 函数、工具函数）必须添加 JSDoc：

```typescript
/**
 * 获取用户列表
 * @returns {Promise} 用户列表数据
 */
export function getUserList() {
  return request.get('/api-user/list').then((res) => res.data);
}

/**
 * 获取用户详情
 * @param {string} userName 用户名称
 */
export function getUserDetail(userName: string) {
  return request
    .get(`/api-user/detail?userName=${userName}`)
    .then((res) => res.data);
}
```

---

## 禁止事项

```typescript
// ❌ 禁止 any（需注释说明时除外）
const data: any = {};

// ❌ 禁止 @ts-ignore（应修复类型错误）
// @ts-ignore
const result = badFunction();

// ❌ 禁止空 catch
try {
  await fetchData();
} catch {} // 必须处理或添加 // nothing 注释

// ❌ 禁止类型断言绕过类型检查
const user = {} as UserDetailT;
```
