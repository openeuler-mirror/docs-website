# 样式规范

## CSS 变量命名规范

项目使用 `@opensig/opendesign` 和 `tokens` 包生成的 CSS 变量，前缀为 `--o-`：

```css
/* 颜色 */
--o-color-bg1              /* 主背景色 */
--o-color-bg2              /* 次背景色 */
--o-color-text1            /* 主文本色 */
--o-color-text4            /* 辅助文本色 */
--o-color-brand1           /* 品牌主色 */
--o-color-link1            /* 链接色 */
--o-color-border2          /* 边框色 */

/* 间距 */
--o-spacing-h1  ~ --o-spacing-h8   /* 水平间距 */
--o-spacing-v1  ~ --o-spacing-v8   /* 垂直间距 */

/* 字体 */
--o-font-size-h1 ~ --o-font-size-text4

/* 行高 */
--o-line-height-h1 ~ --o-line-height-text4

/* 阴影 */
--o-shadow-l1  --o-shadow-l2

/* 圆角 */
--o-radius-s  --o-radius-m  --o-radius-l  --o-radius-circle
```

---

## 响应式断点规范

项目使用自定义断点体系（`mixin/screen.scss`），通过 `respond-to` mixin 使用：

| 断点名 | 宽度范围 | 说明 |
|--------|---------|------|
| `phone` | 0 ~ 600px | 手机端 |
| `pad_v` | 601 ~ 840px | 竖屏平板 |
| `pad_h` | 841 ~ 1200px | 横屏平板 |
| `<=pad` | 0 ~ 1200px | 平板及以下 |
| `laptop` | 1201 ~ 1440px | 笔记本 |
| `>laptop` | 1441px~ | 大屏 |

```scss
// ✅ 使用 respond-to mixin（已全局注入，无需 import）
.user-banner {
  padding: 0 48px;

  @include respond-to('<=pad') {
    padding: 0 24px;
  }

  @include respond-to('phone') {
    padding: 0 16px;
  }
}

// ❌ 禁止硬编码断点数值
@media (max-width: 768px) {
  .user-banner { padding: 0 16px; }
}
```

JS 中使用 `useScreen` composable 获取响应式断点：

```typescript
const { isPhone, lePad, gtPad, isPadV } = useScreen();
```

---

## SCSS 编写规范

```vue
<style lang="scss" scoped>
.user-card {
  padding: var(--o-spacing-h4);
  background-color: var(--o-color-bg1);
  border-radius: var(--o-radius-m);
  border: 1px solid var(--o-color-border2);

  // ✅ BEM 子元素用 & 嵌套
  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  &__title {
    font-size: var(--o-font-size-h5);
    color: var(--o-color-text1);
    font-weight: 500;
  }

  // ✅ BEM 修饰符
  &--active {
    border-color: var(--o-color-brand1);
  }

  // ✅ 响应式
  @include respond-to('phone') {
    padding: var(--o-spacing-h6);
  }
}
</style>
```

---

## 主题切换规范

项目通过 `:root` 的 `class` 切换主题（`light` / `dark`），CSS 变量自动适配：

```typescript
// ✅ 使用 useTheme / useAppearance composable 切换
const appearance = useAppearance();
appearance.value = 'dark';
```

```scss
// ✅ 优先使用 CSS 变量（亮/暗主题自动切换）
.card {
  background: var(--o-color-bg1);
  color: var(--o-color-text1);
}

// ❌ 禁止硬编码颜色
.card {
  background: #ffffff;
  color: #000000;
}
```

---

## 深度选择器

```scss
// ✅ 覆盖 Element Plus / OpenDesign 组件样式时用 :deep()
.user-form {
  :deep(.el-input__inner) {
    border-radius: var(--o-radius-s);
  }
  :deep(.o-button) {
    min-width: 120px;
  }
}
```

---

## 禁止事项

- **禁止**使用内联样式（`style="..."`），动态宽高等特殊情况除外
- **禁止**硬编码颜色值，统一使用 CSS 变量
- **禁止** `!important`，通过提高选择器优先级解决
- **禁止**超过 3 层的 SCSS 嵌套
- **禁止**在组件 `<style>` 中手动 `@use`/`@import` 已全局注入的 mixin 文件
- 全局 `<style>`（无 `scoped`）块必须添加注释说明原因
