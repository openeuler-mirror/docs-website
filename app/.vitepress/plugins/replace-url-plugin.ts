import { Plugin } from 'vitepress';

const OPENEULER_ORG_URL = 'https://www.openeuler.org';
const OPENEULER_ATOM_URL = 'https://www.openeuler.openatom.cn';

export default function replaceUrlPlugin(): Plugin {
  let envVar: string;
  let sourceUrl: string | null;

  return {
    name: 'replace-url',
    enforce: 'post',

    configResolved(resolvedConfig) {
      envVar = resolvedConfig.env.VITE_MAIN_DOMAIN_URL;

      if (!envVar) {
        console.error(
          '[replaceUrlPlugin] 未设置 VITE_MAIN_DOMAIN_URL 环境变量'
        );
        return;
      }

      if (envVar === OPENEULER_ATOM_URL) {
        sourceUrl = OPENEULER_ORG_URL;
      } else if (envVar === OPENEULER_ORG_URL) {
        sourceUrl = OPENEULER_ATOM_URL;
      } else {
        console.warn(
          `[replaceUrlPlugin] 未知的 VITE_MAIN_DOMAIN_URL 值: ${envVar}，不执行替换`
        );
        sourceUrl = null;
      }
    },

    transform(code, id) {
      const SUPPORTED_FILE_TYPES = /\.(html|md|vue|js|ts|jsx|tsx)$/;

      if (
        sourceUrl &&
        SUPPORTED_FILE_TYPES.test(id) &&
        !id.includes('node_modules')
      ) {
        const regex = new RegExp(sourceUrl, 'g');
        return code.replace(regex, envVar);
      }

      return code;
    },
  };
}
