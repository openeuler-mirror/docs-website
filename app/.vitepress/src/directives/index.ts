import type { Directive } from 'vue';
import vHighlight from './highlight';

const directives: { [key: string]: Directive } = {
  highlight: vHighlight,
};

export default directives;
