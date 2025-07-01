import { describe, expect, it } from 'vitest';
import { DocMenuTree, getNodeHrefSafely } from '../app/.vitepress/src/utils/tree';

const data = [{
  id: '1',
  label: '1',
  type: 'menu',
  sections: [
    {
      id: '1-1',
      label: '1-1',
      type: 'menu',
      sections: [
        {
          id: '1-1-1',
          label: '1-1-1',
          type: 'page',
          href: '1-1-1',
        },
        {
          id: '1-1-2',
          label: '1-1-2',
          type: 'page',
          href: '1-1-2.html',
        },
      ],
    },
    {
      id: '1-2',
      label: '1-2',
      type: 'page',
      href: '1-2',
    },
  ],
}];


describe('DocMenuTree', () => {
  const tree = new DocMenuTree(data);

  it('getNode', () => {
    expect(tree.getNode(tree.root, 'id', '1-1')?.id).toBe('1-1');
    expect(tree.getNode(tree.root, 'label', '1-1-1')?.label).toBe('1-1-1');
    expect(tree.getNode(tree.root, 'href', '1-1-2.html')?.href).toBe('1-1-2.html');
  });

  it('getPrevNodes', () => {
    expect(tree.getPrevNodes(tree.root).length).toBe(0);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1')!!).length).toBe(1);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1-1')!!).length).toBe(2);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1-1-1')!!).length).toBe(3);
  });

  it('getNodeHrefSafely', () => {
    expect(getNodeHrefSafely(tree.getNode(tree.root, 'id', '1-1')!!)).toBe('1-1-2.html');
  });
});