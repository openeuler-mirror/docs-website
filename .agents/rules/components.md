# 组件规范

## 组件复用层级

| 层级 | 目录 | 说明 |
|------|------|------|
| 通用组件 | `components/` | 无业务逻辑，高度复用 |
| 业务组件 | `views/[module]/components/` | 特定业务模块的组件 |

---

## SFC 文件结构顺序

Vue 单文件组件必须按以下顺序排列：

```vue
<script setup lang="ts">
// 1. 第三方库导入
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

// 2. 内部模块导入（store、hooks、utils、api）
import { useUserStore } from '@/stores/user';
import { getUserList } from '@/api/api-user';
import { formatDate } from '@/utils/format';

// 3. 组件导入
import UserCard from '@/components/UserCard.vue';
import AppLoader from '@/components/AppLoader.vue';

// 4. 类型导入
import type { UserItemT } from '@/types/user';

// 5. Props 定义
const props = defineProps<{
  userName: string, // 用户名称
  isAdmin?: boolean, // 是否为管理员
}>();

// 6. Emits 定义
const emit = defineEmits<{
  'user-click': [user: UserItemT], // 点击的用户对象
}>();

// 7. 响应式状态
const loading = ref(false);
const userList = ref<UserItemT[]>([]);

// 8. Computed 属性
const filteredList = computed(() => {
  return userList.value.filter((user) => user.name.includes(props.userName));
});

// 9. Methods
const fetchData = async () => {
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

const handleCardClick = (user: UserItemT) => {
  emit('user-click', user);
};

// 10. 生命周期
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="user-list">
    <!-- 模板内容 -->
  </div>
</template>

<style lang="scss" scoped>
.user-list {
  // 样式
}
</style>
```

---

## Props 规范

### 基本定义

使用 TypeScript 泛型语法定义 Props，所有 Props 必须添加类型声明和注释说明：

```typescript
// ✅ 正确：TypeScript 泛型语法，每个参数添加注释
const props = defineProps<{
  title: string, // 标题文本
  count?: number, // 计数值
  items: UserItemT[], // 用户列表数据
}>();

// ❌ 错误：缺少注释说明
const props = defineProps<{
  title: string,
  count?: number,
  items: UserItemT[],
}>();

// ❌ 错误：字符串形式（无类型）
const props = defineProps(['title', 'count']);

// ❌ 错误：对象形式（不推荐）
const props = defineProps({
  title: String,
  count: Number,
});
```

### 默认值设置

可选 Props 使用 `withDefaults` 设置默认值：

```typescript
// ✅ 正确：使用 withDefaults 设置默认值，每个参数添加注释
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg', // 尺寸大小
  disabled?: boolean, // 是否禁用
  count?: number, // 计数值
}>(), {
  size: 'md',
  disabled: false,
  count: 0,
});

// ❌ 错误：在泛型中直接赋默认值（不支持）
const props = defineProps<{
  size?: 'sm' | 'md' | 'lg' = 'md',  // 语法错误
}>();
```

### 命名规范

Props 在定义时使用 camelCase，在模板中使用 kebab-case：

```typescript
// ✅ 正确：定义时 camelCase，添加注释说明
const props = defineProps<{
  userName: string, // 用户名称
  isActive: boolean, // 是否激活
  itemList: UserItemT[], // 列表数据
}>();

// ✅ 正确：模板中 kebab-case
<UserCard
  user-name="admin"
  :is-active="true"
  :item-list="list"
/>

// ❌ 错误：定义时 kebab-case
const props = defineProps<{
  'user-name': string,
}>();
```

### 类型规范

```typescript
// ✅ 正确：基础类型，添加注释说明
const props = defineProps<{
  title: string, // 标题文本
  count: number, // 计数值
  isActive: boolean, // 是否激活
}>();

// ✅ 正确：数组/对象类型，添加注释说明
const props = defineProps<{
  items: UserItemT[], // 用户列表数据
  config: ConfigT, // 配置对象
}>();

// ✅ 正确：联合类型，添加注释说明
const props = defineProps<{
  size: 'sm' | 'md' | 'lg', // 尺寸大小
  status: 'loading' | 'success' | 'error', // 状态类型
}>();

// ✅ 正确：复杂对象带默认值，添加注释说明
const props = withDefaults(defineProps<{
  options?: {
    label: string,
    value: string,
  }[], // 选项列表
}>(), {
  options: () => [],  // 数组/对象默认值必须用函数返回
});
```

### Props 使用

```typescript
// ✅ 正确：在 script 中通过 props.xxx 访问
const props = defineProps<{
  userName: string, // 用户名称
}>();

const displayName = computed(() => {
  return `用户：${props.userName}`;
});

// ❌ 错误：直接解构丢失响应性
const { userName } = props;
const displayName = `用户：${userName}`;

// ✅ 正确：需要解构时使用 toRefs
import { toRefs } from 'vue';

const { userName } = toRefs(props);
const displayName = computed(() => {
  return `用户：${userName.value}`;
});
```

---

## Emits 规范

### 基本定义

使用 TypeScript 泛型语法定义 Emits，事件名使用 kebab-case，每个参数添加注释说明：

```typescript
// ✅ 正确：TypeScript 泛型语法，每个参数添加注释
const emit = defineEmits<{
  'update:modelValue': [value: string], // 更新的值
  'user-click': [user: UserItemT], // 点击的用户对象
  'close': [], // 关闭事件（无参数）
  'change': [newValue: string, oldValue: string], // 新值和旧值
}>();

// ❌ 错误：缺少注释说明
const emit = defineEmits<{
  'update:modelValue': [value: string],
  'user-click': [user: UserItemT],
}>();

// ❌ 错误：字符串形式（无类型）
const emit = defineEmits(['update:modelValue', 'close']);

// ❌ 错误：事件名使用 camelCase
const emit = defineEmits<{
  'updateModelValue': [value: string],  // 应使用 kebab-case
}>();
```

### 命名规范

事件名使用 kebab-case，遵循 `动词-对象` 或 `update:属性名` 格式：

```typescript
// ✅ 正确：动词-对象格式，添加注释说明
const emit = defineEmits<{
  'user-click': [user: UserItemT], // 点击的用户对象
  'form-submit': [data: FormDataT], // 提交的表单数据
  'item-delete': [id: string], // 删除的项 ID
  'close': [], // 关闭事件
}>();

// ✅ 正确：update:属性名 格式（用于双向绑定），添加注释说明
const emit = defineEmits<{
  'update:modelValue': [value: string], // 更新的绑定值
  'update:count': [count: number], // 更新的计数值
}>();

// ❌ 错误：使用 camelCase
const emit = defineEmits<{
  'userClick': [user: UserItemT],
}>();

// ❌ 错误：无语义的事件名
const emit = defineEmits<{
  'click': [],  // 应明确语义，如 'button-click'
}>();
```

### 参数规范

```typescript
// ✅ 正确：无参数事件，添加注释说明
const emit = defineEmits<{
  'close': [], // 关闭事件
  'reset': [], // 重置事件
}>();

// ✅ 正确：单参数事件，添加注释说明
const emit = defineEmits<{
  'user-click': [user: UserItemT], // 点击的用户对象
  'change': [value: string], // 变化的值
}>();

// ✅ 正确：多参数事件，每个参数添加注释说明
const emit = defineEmits<{
  'change': [newValue: string, oldValue: string], // 新值和旧值
  'range-change': [start: number, end: number], // 范围起始和结束值
}>();

// ✅ 正确：参数类型定义，添加注释说明
const emit = defineEmits<{
  'update:modelValue': [value: string | number], // 更新的值
  'submit': [data: { name: string, email: string }], // 提交的数据对象
}>();
```

### Emit 调用

```typescript
// ✅ 正确：调用 emit
const emit = defineEmits<{
  'user-click': [user: UserItemT], // 点击的用户对象
  'close': [], // 关闭事件
}>();

const handleClick = (user: UserItemT) => {
  emit('user-click', user);
};

const handleClose = () => {
  emit('close');
};

// ❌ 错误：参数类型不匹配
emit('user-click', 'admin');  // 应传入 UserItemT 类型

// ❌ 错误：缺少参数
emit('user-click');  // 应传入 user 参数
```

### 父组件监听

```vue
<template>
  <!-- ✅ 正确：父组件模板中监听事件 -->
  <UserCard
    @user-click="handleUserClick"
    @close="handleClose"
  />

  <!-- ✅ 正确：使用 update:xxx 实现双向绑定 -->
  <InputField
    v-model="inputValue"
  />

  <!-- 或展开写法 -->
  <InputField
    :model-value="inputValue"
    @update:model-value="inputValue = $event"
  />
</template>
```

---

## 模板规范

```vue
<template>
  <!-- ✅ 单根元素 -->
  <div class="page-wrapper">

    <!-- ✅ v-if 优先于 v-show（频繁切换用 v-show） -->
    <AppLoader v-if="loading" />
    <UserList v-else :items="userList" />

    <!-- ✅ v-for 必须提供有语义的 :key，避免用 index -->
    <UserCard
      v-for="user in userList"
      :key="user.name"
      :user="user"
      @click="handleCardClick(user)"
    />

    <!-- ✅ 多属性时每行一个 -->
    <OButton
      type="primary"
      :disabled="loading"
      @click="handleSubmit"
    >
      提交
    </OButton>
  </div>
</template>
```

---

## 禁止事项

- **禁止**在 `<template>` 中直接写复杂业务逻辑，抽取为 computed 或 method
- **禁止**组件超过 500 行（考虑拆分）
- **禁止**同一元素同时使用 `v-if` 和 `v-for`
- **禁止**直接修改 props（通过 emit 通知父组件）
- **禁止** `<style>` 不加 `scoped`（全局样式除外，需注释说明）
