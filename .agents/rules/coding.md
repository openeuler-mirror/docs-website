# 编码规范

## 缩进

使用 **2 个空格** 进行缩进，禁止使用 Tab：

```typescript
// ✅ 正确：2 个空格缩进
function getData() {
  const list = [];
  if (list.length > 0) {
    return list;
  }
  return null;
}

// ❌ 错误：使用 Tab
function getData() {
	const list = [];
	if (list.length > 0) {
		return list;
	}
	return null;
}
```

---

## 语句结尾

所有语句必须以分号 `;` 结束：

```typescript
// ❌ 错误：缺少分号
const name = 'admin'
const count = 1

// ✅ 正确：添加分号
const name = 'admin';
const count = 1;
```

---

## 字符串规范

### 引号使用

统一使用**单引号**，仅在字符串内包含单引号时使用双引号：

```typescript
// ✅ 正确：使用单引号
const name = 'admin';
const message = 'Hello World';

// ✅ 正确：字符串内包含单引号时用双引号
const sentence = "It's a test";

// ❌ 错误：无特殊情况使用双引号
const name = "admin";
```

### 字符串拼接

使用**模板字符串**进行拼接，禁止使用 `+` 拼接：

```typescript
// ❌ 错误：使用 + 拼接
const fullName = firstName + ' ' + lastName;
const url = '/api/user/' + userId + '/detail';

// ✅ 正确：使用模板字符串
const fullName = `${firstName} ${lastName}`;
const url = `/api/user/${userId}/detail`;
```

---

## 变量声明

优先使用 `const`，其次 `let`，**禁止使用 `var`**：

```typescript
// ✅ 正确：const 优先
const name = 'admin';
const userList = [];

// ✅ 正确：需要重新赋值时使用 let
let count = 0;
count = count + 1;

// ❌ 错误：禁止使用 var
var name = 'admin';
```

---

## 尾随逗号

所有多行数组、对象、参数列表、导入导出语句都必须添加尾随逗号：

```typescript
// ❌ 错误：缺少尾随逗号
const user = {
  name: 'admin',
  email: 'admin@example.com'
};

const list = [
  'apple',
  'banana'
];

function getData(
  id: string,
  name: string
) {}

import {
  ref,
  computed
} from 'vue';

// ✅ 正确：添加尾随逗号
const user = {
  name: 'admin',
  email: 'admin@example.com',
};

const list = [
  'apple',
  'banana',
];

function getData(
  id: string,
  name: string,
) {}

import {
  ref,
  computed,
} from 'vue';

export {
  getUserList,
  getUserDetail,
};
```

### 单行情况

单行数组、对象不需要尾随逗号：

```typescript
// ✅ 正确：单行无需尾随逗号
const user = { name: 'admin', email: 'admin@example.com' };
const list = ['apple', 'banana'];
```

---

## 比较运算符

判断是否为 `null` 或 `undefined` 时可使用 `==`，其余情况必须使用 `===` 全等比较：

```typescript
// ✅ 正确：判断 null 或 undefined 可用 ==
if (value == null) {
  // 同时判断 null 和 undefined
}

// ✅ 正确：判断 null 或 undefined 也可用 ===
if (value === null || value === undefined) {
  // ...
}

// ✅ 正确：其他情况使用 ===
if (count === 0) {
  // ...
}

if (status === 'active') {
  // ...
}

// ❌ 错误：其他情况使用 ==
if (count == 0) {
  // ...
}

if (status == 'active') {
  // ...
}
```

---

## 条件语句

### if 语句格式

所有 `if` 语句必须使用大括号 `{}` 包裹，即使是单行语句。`if` 前面必须添加注释说明条件含义，注释与上方代码空一行：

```typescript
// ❌ 错误：省略大括号
if (isLoading) return;

// ❌ 错误：省略大括号
if (isValid)
  doSomething();

// ❌ 错误：缺少条件注释
if (isLoading) {
  return;
}

// ❌ 错误：注释与上方代码未空行
fetchUserData();
// 加载中时直接返回
if (isLoading) {
  return;
}

// ✅ 正确：有注释说明，与上方代码空一行
fetchUserData();

// 加载中时直接返回
if (isLoading) {
  return;
}

// ✅ 正确：多行语句
validateForm();

// 表单验证通过时提交
if (isValid) {
  doSomething();
  updateStatus();
}
```

### else / else if 语句

```typescript
// ✅ 正确
if (isLoading) {
  return;
} else {
  doSomething();
}

// ✅ 正确
if (status === 'loading') {
  showSpinner();
} else if (status === 'error') {
  showError();
} else {
  showContent();
}
```

---

## 循环语句

同样的规则适用于 `for`、`while`、`switch` 等控制语句：

```typescript
// ❌ 错误：省略大括号
for (let i = 0; i < list.length; i++) process(list[i]);

// ✅ 正确
for (let i = 0; i < list.length; i++) {
  process(list[i]);
}
```

---

## 注释规范

### 函数注释

函数注释必须使用 `/** */` 格式（JSDoc）：

```typescript
/**
 * 获取用户列表
 * @returns {Promise<UserItemT[]>} 用户列表数据
 */
function getUserList(): Promise<UserItemT[]> {
  return request.get('/api/user/list');
}

/**
 * 格式化日期
 * @param {string} date 日期字符串
 * @param {string} format 格式化模板
 * @returns {string} 格式化后的日期
 */
function formatDate(date: string, format: string): string {
  // ...
}
```

### 代码内注释

代码内注释使用 `//`，注释与代码之间空一格：

```typescript
// ✅ 正确
const maxRetry = 3; // 最大重试次数

// 初始化数据
const initData = () => {
  // ...
};

// ❌ 错误：注释与代码无空格
const maxRetry = 3;//最大重试次数
```

### 特殊标记注释

使用标准标记说明待办事项：

```typescript
// TODO: 待实现的功能
// FIXME: 需要修复的问题
// HACK: 临时解决方案，后续需要优化
// NOTE: 重要说明
```

---

## 异步编程

使用 `async/await` 风格，禁止使用 `.then()` 链式调用：

```typescript
// ❌ 错误：使用 .then() 链式调用
function getUserData() {
  return fetchUser()
    .then((res) => res.data)
    .then((data) => processData(data))
    .catch((err) => console.error(err));
}

// ✅ 正确：使用 async/await
async function getUserData() {
  try {
    const res = await fetchUser();
    const data = await processData(res.data);
    return data;
  } catch (error) {
    console.error('获取用户数据失败:', error);
  }
}
```

---

## 链式调用换行

链式调用时，点号 `.` 前置换行：

```typescript
// ❌ 错误：点号在后
const result = list
  .filter((item) => item.active)
  .map((item) => item.value)
  .reduce((sum, val) => sum + val, 0);

// ✅ 正确：点号在前
const result = list
  .filter((item) => item.active)
  .map((item) => item.value)
  .reduce((sum, val) => sum + val, 0);
```

---

## 三元运算符

简单条件可用三元运算符，复杂逻辑使用 `if` 语句：

```typescript
// ✅ 正确：简单条件
const status = isActive ? 'active' : 'inactive';
const label = count > 0 ? `${count} 项` : '无';

// ❌ 错误：复杂条件嵌套
const result = a > b ? (a > c ? a : c) : (b > c ? b : c);

// ✅ 正确：复杂逻辑用 if
let result;
if (a > b) {
  result = a > c ? a : c;
} else {
  result = b > c ? b : c;
}
```

---

## 空行规范

```typescript
// ✅ 函数之间空一行
function getName() {
  return 'admin';
}

function getAge() {
  return 18;
}

// ✅ 逻辑块之间空一行
function handleSubmit() {
  const isValid = validateForm();

  // 验证通过时提交
  if (!isValid) {
    return;
  }

  const data = getFormData();

  submitData(data);
}

// ✅ 导入语句分组空行
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import { useUserStore } from '@/stores/user';
import { getUserList } from '@/api/api-user';
```

---

## 解构规范

优先使用解构赋值：

```typescript
// ✅ 对象解构
const { name, email } = user;
const { username, ...rest } = userInfo;

// ✅ 数组解构
const [first, second] = list;
const [head, ...tail] = items;

// ✅ 函数参数解构
function handleUser({ name, email }: UserT) {
  // ...
}

// ✅ 重命名解构
const { name: userName, email: userEmail } = user;
```

---

## 代码行长度

每行代码不超过 **200 个字符**，超长代码应换行：

```typescript
// ✅ 正确：超长参数换行
function createRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: unknown,
  headers?: Record<string, string>,
) {
  // ...
}

// ✅ 正确：超长条件换行
if (
  user.isActive &&
  user.hasPermission &&
  !user.isLocked
) {
  grantAccess();
}
```

---

## 资源清理

所有在组件中创建的资源（定时器、Observer、事件监听器等）必须在组件生命周期结束时销毁：

### 定时器

```typescript
// ❌ 错误：未清理定时器
onMounted(() => {
  setInterval(() => {
    fetchData();
  }, 1000);
});

// ✅ 正确：在 onUnmounted 清理定时器
let timer: number | null = null;

onMounted(() => {
  timer = setInterval(() => {
    fetchData();
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

// ✅ 正确：setTimeout 使用 clearTimeout
let timeoutId: number | null = null;

onMounted(() => {
  timeoutId = setTimeout(() => {
    showMessage();
  }, 3000);
});

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
});
```

### Observer

```typescript
// ❌ 错误：未清理 Observer
onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    // ...
  });
  observer.observe(target);
});

// ✅ 正确：在 onUnmounted 清理 Observer
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    // ...
  });
  observer.observe(target);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

// ✅ 正确：ResizeObserver
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    // ...
  });
  resizeObserver.observe(container);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// ✅ 正确：MutationObserver
let mutationObserver: MutationObserver | null = null;

onMounted(() => {
  mutationObserver = new MutationObserver((mutations) => {
    // ...
  });
  mutationObserver.observe(element, { attributes: true });
});

onUnmounted(() => {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
});
```

### 事件监听器

```typescript
// ❌ 错误：未清理事件监听器
onMounted(() => {
  window.addEventListener('resize', handleResize);
});

// ✅ 正确：在 onUnmounted 清理事件监听器
const handleResize = () => {
  // ...
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// ✅ 正确：document 事件监听器
const handleClick = (e: MouseEvent) => {
  // ...
};

onMounted(() => {
  document.addEventListener('click', handleClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClick);
});
```

### WebSocket

```typescript
// ❌ 错误：未关闭 WebSocket
onMounted(() => {
  const ws = new WebSocket('ws://example.com');
  ws.onmessage = (e) => {
    // ...
  };
});

// ✅ 正确：在 onUnmounted 关闭 WebSocket
let ws: WebSocket | null = null;

onMounted(() => {
  ws = new WebSocket('ws://example.com');
  ws.onmessage = (e) => {
    // ...
  };
});

onUnmounted(() => {
  if (ws) {
    ws.close();
    ws = null;
  }
});
```

---

## 禁止事项

- **禁止**省略分号
- **禁止**省略大括号
- **禁止**使用 `var` 声明变量
- **禁止**使用双引号（字符串内含单引号除外）
- **禁止**使用 `+` 拼接字符串
- **禁止**使用 `.then()` 链式调用
- **禁止**使用 `==` 比较（判断 null/undefined 除外）
- **禁止**在 `if`/`for`/`while` 语句中不使用 `{}` 包裹代码块
- **禁止**未清理资源（定时器、Observer、事件监听器、WebSocket 等）
- **禁止**提交 `console.log` / `debugger` 到生产代码（`packages/scripts` 除外）
- **禁止**超过 200 个字符的单行代码