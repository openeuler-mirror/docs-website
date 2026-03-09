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
    // 未找到时返回 null
    expect(tree.getNode(tree.root, 'id', 'nonexistent')).toBeNull();
  });

  it('getPrevNodes', () => {
    expect(tree.getPrevNodes(tree.root).length).toBe(0);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1')!!).length).toBe(1);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1-1')!!).length).toBe(2);
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1-1-1')!!).length).toBe(3);
    // stopDepth 为负数时返回空数组
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1')!!, -1).length).toBe(0);
    // stopDepth 等于节点深度时返回空数组
    expect(tree.getPrevNodes(tree.getNode(tree.root, 'id', '1')!!, 1).length).toBe(0);
  });

  it('getNodeHrefSafely', () => {
    expect(getNodeHrefSafely(tree.getNode(tree.root, 'id', '1-1')!!)).toBe('1-1-2.html');
    // 节点本身有 http 链接时直接返回
    const nodeWithHttp = tree.getNode(tree.root, 'id', '1-1-1')!!;
    // 没有子节点且 href 无 .html 或 http 时返回空字符串
    expect(getNodeHrefSafely(nodeWithHttp)).toBe('');
  });

  it('buildTree 处理无 type 字段的节点', () => {
    // 覆盖 info.type || '' 的空字符串分支
    const treeNoType = new DocMenuTree([{ id: 'x', label: 'x' } as any]);
    const node = treeNoType.getNode(treeNoType.root, 'id', 'x');
    expect(node?.type).toBe('');
  });
});