// @ts-expect-error public资源导入
import HOME_CONFIG_RAW from '/dsl/zh/home.json?url&raw';
// @ts-expect-error public资源导入
import HOME_CONFIG_RAW_EN from '/dsl/en/home.json?url&raw';

import type { HomeConfig } from '@/@types/type-home';

// 首页相关配置
export const HOME_CONFIG = JSON.parse(HOME_CONFIG_RAW) as HomeConfig;
export const HOME_CONFIG_EN = JSON.parse(HOME_CONFIG_RAW_EN) as HomeConfig;
