# VitePress Vue 规范

## 显式导入规范

**禁止使用自动导入**，所有 API 和组件必须显式 import：

```typescript
// ✅ 正确：显式导入 Vue API
import { ref, computed, onMounted } from 'vue';

const loading = ref(false);

// ✅ 正确：显式导入组件
import CustomButton from './components/CustomButton.vue';
```

---

## Markdown 中使用组件

### 注册全局组件（不推荐）

```typescript
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import CustomButton from './components/CustomButton.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CustomButton', CustomButton);
  },
};
```

```markdown
<!-- ✅ 可以使用，但不推荐（来源不清） -->
<CustomButton>点击</CustomButton>
```

### 局部导入（推荐）

```vue
<!-- components/MyComponent.vue -->
<script setup lang="ts">
import CustomButton from './CustomButton.vue';
</script>

<template>
  <CustomButton>点击</CustomButton>
</template>
```

```markdown
<!-- docs/guide.md -->
<MyComponent />
```

---

## 客户端/构建时差异处理

VitePress 在构建时会执行 Vue 组件代码，需避免访问浏览器 API：

### onMounted 中访问浏览器 API

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const width = ref(0);

const handleResize = () => {
  width.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// ❌ 错误：在 setup 中直接访问
const savedTheme = localStorage.getItem('theme'); // 构建报错
</script>
```

### ClientOnly 组件

```vue
<script setup lang="ts">
import { ClientOnly } from 'vitepress';
import BrowserChart from './components/BrowserChart.vue';
</script>

<template>
  <ClientOnly>
    <BrowserChart :data="chartData" />
  </ClientOnly>
</template>
```

---

## 禁止事项

- **禁止**在 setup 中直接访问 `window`、`document`、`localStorage`