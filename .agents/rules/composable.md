# Composable 规范

## 文件组织

```
composables/
├── useTheme.ts        # 主题切换
├── useUser.ts         # 用户相关
└── use[功能名].ts     # 其他功能
```

命名规则：`use[功能名].ts`

---

## 基本结构

Composable 必须遵循以下结构：

```typescript
// ✅ 正确：标准 Composable 结构
// composables/useTheme.ts
import { ref, computed, onMounted, onUnmounted } from 'vue';

export const useTheme = () => {
  // 1. 响应式状态
  const appearance = ref<'light' | 'dark'>('light');

  // 2. Computed 属性
  const isDark = computed(() => appearance.value === 'dark');

  // 3. Methods
  const setTheme = (theme: 'light' | 'dark') => {
    appearance.value = theme;
  };

  const toggleTheme = () => {
    appearance.value = isDark.value ? 'light' : 'dark';
  };

  // 4. 副作用处理（如需）
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'theme') {
      appearance.value = e.newValue as 'light' | 'dark';
    }
  };

  onMounted(() => {
    window.addEventListener('storage', handleStorageChange);
  });

  onUnmounted(() => {
    window.removeEventListener('storage', handleStorageChange);
  });

  // 5. 返回对象
  return {
    appearance,
    isDark,
    setTheme,
    toggleTheme,
  };
};
```

---

## 命名规范

### 文件命名

文件名使用 `use[功能名].ts` 格式，功能名使用 PascalCase：

```typescript
// ✅ 正确：use + PascalCase
useTheme.ts
useUser.ts
useRequest.ts
useScreenWidth.ts

// ❌ 错误：小写开头
usetheme.ts
use-user.ts
```

### 函数命名

函数名与文件名保持一致：

```typescript
// ✅ 正确：函数名与文件名一致
// useTheme.ts
export const useTheme = () => {
  // ...
};

// ❌ 错误：函数名与文件名不一致
// useTheme.ts
export const useAppearance = () => {
  // ...
};
```

---

## 参数规范

Composable 可以接收参数，参数必须添加类型声明和注释：

### 无参数

```typescript
// ✅ 正确：无参数 Composable
export const useTheme = () => {
  const appearance = ref<'light' | 'dark'>('light');

  return {
    appearance,
  };
};
```

### 单参数

```typescript
// ✅ 正确：单参数 Composable，添加注释说明
export const useRequest = (baseUrl: string) => { // API 基础地址
  const loading = ref(false);

  const fetchData = async (endpoint: string) => {
    loading.value = true;
    try {
      const res = await fetch(`${baseUrl}${endpoint}`);
      return res.json();
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    fetchData,
  };
};
```

### 多参数

```typescript
// ✅ 正确：多参数 Composable，每个参数添加注释说明
export const usePaginatedList = (
  fetchFn: (page: number) => Promise<ListT>, // 数据获取函数
  pageSize: number = 10, // 每页条数
) => {
  const list = ref<ListT>([]);
  const page = ref(1);
  const loading = ref(false);

  const loadMore = async () => {
    loading.value = true;
    try {
      const res = await fetchFn(page.value);
      list.value = [...list.value, ...res.items];
      page.value++;
    } finally {
      loading.value = false;
    }
  };

  return {
    list,
    page,
    loading,
    loadMore,
  };
};

// ❌ 错误：参数缺少注释说明
export const usePaginatedList = (fetchFn, pageSize) => {
  // ...
};
```

### 可选参数

```typescript
// ✅ 正确：可选参数 Composable，添加注释说明
export const useDebounce = (
  fn: Function, // 需要防抖的函数
  delay?: number, // 防抖延迟时间（默认 300ms）
) => {
  const timer = ref<number | null>(null);

  const debounce = (...args: any[]) => {
    if (timer.value) {
      clearTimeout(timer.value);
    }
    timer.value = setTimeout(() => {
      fn(...args);
    }, delay ?? 300);
  };

  onUnmounted(() => {
    if (timer.value) {
      clearTimeout(timer.value);
    }
  });

  return {
    debounce,
  };
};
```

---

## 返回值规范

Composable 必须返回对象，便于扩展和使用：

### 返回对象

```typescript
// ✅ 正确：返回对象
export const useCounter = () => {
  const count = ref(0);

  const increment = () => {
    count.value++;
  };

  const decrement = () => {
    count.value--;
  };

  return {
    count,
    increment,
    decrement,
  };
};

// ❌ 错误：返回单值（不利于扩展）
export const useCounter = () => {
  return ref(0);
};
```

### 响应式返回

```typescript
// ✅ 正确：返回响应式引用
export const useUser = () => {
  const user = ref<UserT | null>(null);
  const loading = ref(false);

  const fetchUser = async (id: string) => {
    loading.value = true;
    try {
      user.value = await getUserById(id);
    } finally {
      loading.value = false;
    }
  };

  return {
    user,    // ref
    loading, // ref
    fetchUser, // function
  };
};

// 使用时
const { user, loading, fetchUser } = useUser();
```

---

## 副作用处理

Composable 中创建的资源必须在组件卸载时清理：

### 定时器

```typescript
// ✅ 正确：清理定时器
export const useInterval = (callback: () => void, delay: number) => {
  const timer = ref<number | null>(null);
  const isRunning = ref(false);

  const start = () => {
    if (timer.value) return;
    timer.value = setInterval(callback, delay);
    isRunning.value = true;
  };

  const stop = () => {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
    isRunning.value = false;
  };

  onUnmounted(() => {
    stop();
  });

  return {
    isRunning,
    start,
    stop,
  };
};
```

### 事件监听

```typescript
// ✅ 正确：清理事件监听
export const useResize = (callback: () => void) => {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const handleResize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
    callback();
  };

  onMounted(() => {
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  return {
    width,
    height,
  };
};
```

### Observer

```typescript
// ✅ 正确：清理 Observer
export const useIntersectionObserver = (
  target: Ref<HTMLElement | null>,
  callback: (isVisible: boolean) => void,
) => {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!target.value) return;

    observer = new IntersectionObserver((entries) => {
      isVisible.value = entries[0].isIntersecting;
      callback(entries[0].isIntersecting);
    });

    observer.observe(target.value);
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  return {
    isVisible,
  };
};
```

---

## 使用场景

### 全局状态管理

```typescript
// ✅ 正确：全局状态 Composable
// composables/useUser.ts
import { ref } from 'vue';

const user = ref<UserT | null>(null); // 全局单例

export const useUser = () => {
  const fetchUser = async () => {
    user.value = await getCurrentUser();
  };

  const logout = () => {
    user.value = null;
  };

  return {
    user,
    fetchUser,
    logout,
  };
};
```

### 组件级状态

```typescript
// ✅ 正确：组件级状态 Composable（每次调用创建新实例）
export const useCounter = () => {
  const count = ref(0); // 每次调用都创建新的 ref

  const increment = () => {
    count.value++;
  };

  return {
    count,
    increment,
  };
};
```

---

## 最佳实践

### 封装可复用逻辑

```typescript
// ✅ 正确：封装 API 请求逻辑
export const useApi = <T>(endpoint: string) => {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetch(endpoint).then((res) => res.json());
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    fetchData,
  };
};
```

### 组合多个 Composable

```typescript
// ✅ 正确：组合使用多个 Composable
export const useUserProfile = () => {
  const { user, fetchUser } = useUser();
  const { loading, error, fetchData } = useApi<UserT>('/api/user/profile');

  const loadProfile = async () => {
    await fetchData();
    user.value = data.value;
  };

  return {
    user,
    loading,
    error,
    loadProfile,
  };
};
```

---

## 禁止事项

- **禁止**文件名不以 `use` 开头
- **禁止**函数名与文件名不一致
- **禁止**返回单值（必须返回对象）
- **禁止**未清理副作用（定时器、事件监听、Observer 等）
- **禁止**在 Composable 中直接修改全局状态（通过参数传入）
- **禁止**参数缺少类型声明和注释说明