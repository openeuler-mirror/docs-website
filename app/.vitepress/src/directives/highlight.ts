import hljs from 'highlight.js';

export default {
  mounted(el: HTMLElement, binding: { value: boolean }) {
    if (binding.value) {
      hljs.configure({
        ignoreUnescapedHTML: true,
      });
      const blocks: NodeList = el.querySelectorAll('pre code');
      blocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  },
};
