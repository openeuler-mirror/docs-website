# 命名规范

## 命名形式定义

| 形式                     | 格式     | 示例                |
| ---------------------- | ------ | ----------------- |
| camelCase              | 小驼峰    | `getUserName`     |
| PascalCase             | 大驼峰    | `UserProfile`     |
| kebab-case             | 短横线    | `user-profile`    |
| SCREAMING\_SNAKE\_CASE | 全大写下划线 | `MAX_RETRY_COUNT` |

---

## 文件与目录命名

| 类型                | 规范                      | 示例                             |
| ----------------- | ----------------------- | ------------------------------ |
| **文件夹**           | kebab-case              | `user-detail/`                  |
| **Vue SFC**       | PascalCase              | `AppHeader.vue`, `UserCard.vue` |
| **TypeScript 文件** | kebab-case              | `api-user.ts`, `use-screen.ts`  |
| **样式文件**          | kebab-case              | `base.scss`, `theme-dark.scss` |
| **类型定义文件**        | `type-` 前缀 + kebab-case | `type-user.ts`, `type-home.ts`  |
| **API 文件**        | `api-` 前缀 + kebab-case  | `api-user.ts`, `api-search.ts`  |
| **Composable 文件** | `use` 前缀 + camelCase    | `useScreen.ts`, `useTheme.ts`  |
| **Store 文件**      | camelCase               | `common.ts`, `user.ts`         |
| **Nuxt 页面文件**     | kebab-case              | `user-detail.vue`, `index.vue`  |

### 静态资源命名

格式：`[name]_[theme]_[language].ext`

```
homeBanner_light_zh.png   ✅
logo_dark_en.svg          ✅
```

---

## 代码命名

### 变量 / 常量

```typescript
// 普通变量：camelCase
const userName = 'admin';
const isLoading = ref(false);

// 布尔值：is / has / can 前缀
const isVisible = ref(true);
const hasPermission = computed(() => ...);
const canSubmit = computed(() => ...);

// 常量：SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '/api-user';
```

### 函数 / 方法

```typescript
// 动词开头，动宾结构
const getUserList = () => {};
const fetchUserDetail = async () => {};
const handleSubmit = () => {};
const formatDate = (date: string) => {};

// 布尔返回值：is / has / check 前缀
const isValidEmail = (email: string): boolean => {};
```

### 组件

```typescript
// 在模板中：PascalCase 自闭合
<AppHeader />
<UserCard :user="user" />
<OButton type="primary">提交</OButton>

// defineProps 中：camelCase
const props = defineProps<{
  userName: string,
  isActive: boolean,
}>();

// emit 事件：kebab-case
const emit = defineEmits<{
  'nav-click': [item: NavItem],
  'update:modelValue': [value: string],
}>();
```

### CSS 类名

```scss
// kebab-case + BEM
.user-card { }
.user-card--active { }      // BEM 修饰符
.user-card__header { }      // BEM 子元素
```

### Icon 导入

```typescript
// Icon 组件必须加 Icon 前缀，使用对应 collection
import IconDownload from '~icons/app/download';
import IconSearch from '~icons/app/search';
import IconUser from '~icons/user/default';
```

---

## 禁止事项

- **禁止**单字母变量名（循环索引 `i`, `j`, `k` 除外）
- **禁止**使用无意义命名：`data`, `info`, `temp`, `res2`, `obj1`
- **禁止**拼音命名：`yonghu`, `liebiao`
- **禁止** Vue SFC 文件使用 kebab-case：`app-header.vue` ❌
- Nuxt pages 文件使用 kebab-case（符合文件路由约定）：`user-detail.vue` ✅
