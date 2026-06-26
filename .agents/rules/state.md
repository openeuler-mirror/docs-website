# 状态管理规范

## 选择原则

| 场景 | 方案 |
|------|------|
| 全局共享状态（主题、用户信息、登录态） | Pinia `defineStore` |
| 仅当前组件使用的临时状态 | `ref` / `reactive` |

---

## Pinia Store（defineStore）

```typescript
// stores/user.ts
import { defineStore } from 'pinia';

export const useUserInfoStore = defineStore('userInfo', {
  state: () => ({
    username: '',
    email: '',
    photo: '',
  }),
});

export const useLoginStore = defineStore('login', {
  state: () => ({
    loginStatus: 'NOT_LOGIN' as 'NOT_LOGIN' | 'LOGGED_IN',
  }),
});
```

新 store 推荐使用 **Setup Store** 风格（Composition API）：

```typescript
// stores/version.ts
import { defineStore } from 'pinia';

export const useVersionStore = defineStore('version', () => {
  const current = ref('');
  const list = ref<string[]>([]);

  const fetchVersions = async () => {
    try {
      // ...
    } catch (error) {
      console.error('获取版本失败:', error);
    }
  };

  return { current, list, fetchVersions };
});
```

---

## Store 使用

```typescript
import { useUserInfoStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserInfoStore();

// 解构响应式数据必须使用 storeToRefs
const { username, email } = storeToRefs(userStore);

// ❌ 直接解构丢失响应性
const { username } = userStore;
```

---

## Store 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| defineStore ID | camelCase | `'userInfo'`, `'login'` |
| 使用函数 | `use` + PascalCase + `Store` | `useUserInfoStore`, `useLoginStore` |
| useState key | camelCase | `'appearance'`, `'cookie'` |
