let vKey = 0;

function vdom(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            'v-key': ++vKey,
        },
        children: children.map(child => {
            // 对文本节点的特殊处理
            if (typeof child === 'string') {
                return {
                    type: 'textNode',
                    props: { 'v-key': ++vKey },
                    children: [],
                    text: child,
                };
            }
            return child;
        }),
    };
}

function sameVnode(vnode1, vnode2) {
  return vnode1.props['v-key'] === vnode2.props['v-key'];
}

function toRealDom(vNode) {
    let $dom;
    if (vNode.type === 'textNode') {
        $dom = document.createTextNode(vNode.text);
    } else {
        $dom = document.createElement(vNode.type);
    }

    if (vNode.props) {
        Object.keys(vNode.props).forEach(key => {
            vNode.type !== 'textNode' && setProp($dom, key, vNode.props[key]);
        });
    }

    if (vNode.children) {
        vNode.children.forEach(childVdom => {
            const realChildDom = toRealDom(childVdom);
            $dom.appendChild(realChildDom);
        });
    }

    vNode.$el = $dom;

    return $dom;
}

function mount($parent, vNode) {
    return $parent.appendChild(toRealDom(vNode));
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
    let i;
    let map = {};
    let key;
    let child;
    for (i = beginIdx; i <= endIdx; ++i) {
        child = children[i];
        if (child != null) {
            key = child.props['v-key'];
            if (key !== undefined) {
                map[key] = i;
            }
        }
    }
    return map;
}

function updateDom($parent, oldVNode, newVNode) {
    // 没有旧的节点，添加新的节点
    if (!oldVNode) {
        return $parent.appendChild(toRealDom(newVNode));
    }

    // 没有新的节点，删除旧的节点
    if (!newVNode) {
        return $parent.removeChild(oldVNode.$el);
    }

    // 都是文本节点，都没有发生变化
    if (oldVNode.type === 'textNode' && newVNode.type === 'textNode' && oldVNode.text === newVNode.text) {
        return;
    }

    // 虚拟DOM的type未改变，对比节点的props是否改变
    // 对比props，进行替换vNode
    const oldProps = oldVNode.props || {};
    const newProps = newVNode.props || {};
    if (isPropsChanged(oldProps, newProps)) {
        const oldPropsKeys = Object.keys(oldProps);
        const newPropsKeys = Object.keys(newProps);

        // 如果新节点没有属性，把旧的节点的属性清除掉
        if (newPropsKeys.length === 0) {
            oldPropsKeys.forEach(propKey => {
                removeProp(oldVNode.$el, propKey, oldProps[propKey]);
            });
        } else {
            // 拿到所有的props，以此遍历，增加/删除/修改对应属性
            const allPropsKeys = new Set([...oldPropsKeys, ... newPropsKeys]);
            allPropsKeys.forEach(propKey => {
                // 属性被去除了
                if (!newProps[propKey]) {
                    return removeProp(oldVNode.$el, propKey, oldProps[propKey]);
                }
                // 属性改变了/增加了
                if (newProps[propKey] !== oldProps[propKey] && oldVNode.type !== 'textNode') {
                    return setProp(oldVNode.$el, propKey, newProps[propKey]);
                }
            });
        }
    }

    // 根节点相同，但子节点不同，要递归对比子节点
    if (
        (oldVNode.children && oldVNode.children.length) ||
        (newVNode.children && newVNode.children.length)
    ) {
        let oldStartIdx = 0;
        let oldEndIdx = oldVNode.children.length - 1;
        let oldStartVnode = oldVNode.children[oldStartIdx];
        let oldEndVnode = oldVNode.children[oldEndIdx];
        
        let newStartIdx = 0;
        let newEndIdx = newVNode.children.length - 1;
        let newStartVnode = newVNode.children[newStartIdx];
        let newEndVnode = newVNode.children[newEndIdx];

        let oldKeyToIdx;
        let idxInOld;
        let elmToMove;

        while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (!oldStartVnode) {
                oldStartVnode = oldVNode.children[++oldStartIdx];
            } else if (!oldEndVnode) {
                oldEndVnode = oldVNode.children[--oldEndIdx];
            } else if (!newStartVnode) {
                newStartVnode = newVNode.children[++newStartIdx];
            } else if (!newEndVnode) {
                newEndVnode = newVNode.children[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newStartVnode)) {
                // 如果两个头节点是同一个节点，则更新其子节点，继续向后遍历
                updateDom(oldVNode.$el, oldStartVnode, newStartVnode);
                oldStartVnode = oldVNode.children[++oldStartIdx];
                newStartVnode = newVNode.children[++newStartIdx];
            } else if (sameVnode(oldEndVnode, newEndVnode)) {
                // 如果两个尾节点是同一个节点，则更新其子节点，继续向前遍历
                updateDom(oldVNode.$el, oldEndVnode, newEndVnode);
                oldEndVnode = oldVNode.children[--oldEndIdx];
                newEndVnode = newVNode.children[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newEndVnode)) {
                // 如果旧的头节点和新的尾节点相同，可以通过移动节点来复用DOM
                // 先继续更新子节点，然后把旧的头结点（即新的尾节点）加入到最后面
                updateDom(oldVNode.$el, oldStartVnode, newEndVnode);
                oldVNode.$el.insertBefore(oldStartVnode.$el, oldEndVnode.$el.nextSibling);
                oldStartVnode = oldVNode.children[++oldStartIdx];
                newEndVnode = newVNode.children[--newEndIdx];
            } else if (sameVnode(oldEndVnode, newStartVnode)) {
                // 原理同上
                updateDom(oldVNode.$el, oldEndVnode, newStartVnode);
                oldVNode.$el.insertBefore(oldEndVnode.$el, oldStartVnode.$el);
                oldEndVnode = oldVNode.children[--oldEndIdx];
                newStartVnode = newVNode.children[++newStartIdx];
            } else {
                // 如果不存在旧节点的key-index表，则创建
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(oldVNode.children, oldStartIdx, oldEndIdx);
                }
                // 找到新节点在旧节点组中对应节点的位置
                idxInOld = oldKeyToIdx[newStartVnode.props['v-key']];
                // 该节点是一个新的节点，则在旧节点前插入该节点
                if (idxInOld === undefined) {
                    // 这里创建一个新节点，表示新增加的
                    oldVNode.$el.insertBefore(toRealDom(newStartVnode), oldStartVnode.$el);
                    newStartVnode = newVNode.children[++newStartIdx];
                } else { // 该节点是一个旧节点，可以复用旧的DOM，则移动该节点
                    elmToMove = oldVNode.children[idxInOld];
                    updateDom(oldVNode.$el, elmToMove, newStartVnode);
                    // 然后将旧节点组中对应节点设置为undefined,代表已经遍历过了，不在遍历，否则可能存在重复插入的问题
                    oldVNode.children[idxInOld] = undefined;
                    oldVNode.$el.insertBefore(elmToMove.$el, oldStartVnode.$el);
                    // 自增newStartIdx，继续遍历新节点
                    newStartVnode = newVNode.children[++newStartIdx];
                }
            }

            // 当旧头索引大于旧尾索引时，代表旧节点组已经遍历完，将剩余的新节点添加到最后一个新节点的位置后
            if (oldStartIdx > oldEndIdx) {
                for (let i = newStartIdx; i <= newEndIdx; i++) {
                    if (newVNode.children[i]) {
                        oldVNode.$el.insertBefore(toRealDom(newVNode.children[i]), newVNode.children[newEndIdx + 1] ? newVNode.children[newEndIdx + 1].$el : null);
                    }
                }
            } else if (newStartIdx > newEndIdx) {
                // 当新节点头索引大于新节点尾索引，表示新节点组已经遍历完了，直接删除旧的未遍历到的节点，这些节点不再需要
                for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                    if (oldVNode.children[i]) {
                        oldVNode.$el.removeChild(oldVNode.children[i].$el);
                    }
                }
            }
        }
    }
}

function isEventProp(name) {
    return /^on/.test(name);
}

function extractEventName(name) {
    return name.slice(2).toLowerCase();
}

function isCustomProp(name) {
    return false;
}

function setProp($target, name, value) {
    if (isCustomProp(name)) {
        return;
    } else if (name === 'className') { // fix react className
        return $target.setAttribute('class', value);
    } else if (isEventProp(name)) {
        return $target.addEventListener(extractEventName(name), value);
    } else if (typeof value === 'boolean') {
        if (value) {
            $target.setAttribute(name, value);
        }
        return $target[name] = value;
    } else {
        return $target.setAttribute(name, value);
    }
}

function removeProp($target, name, value) {
    if (isCustomProp(name)) {
        return;
    } else if (name === 'className') { // fix react className
        return $target.removeAttribute('class');
    } else if (isEventProp(name)) {
        return $target.removeEventListener(extractEventName(name), value);
    } else if (typeof value === 'boolean') {
        $target.removeAttribute(name);
        $target[name] = false;
    } else {
        $target.removeAttribute(name);
    }
}

function isNodeChanged(oldVNode, newVNode) {
    // 一个是textNode，一个是element，一定改变
    if (typeof oldVNode !== typeof newVNode) {
        return true;
    }

    // 都是textNode，比较文本是否改变
    if (oldVNode.type === 'textNode' && newVNode.type === 'textNode') {
        return oldVNode.text !== newVNode.text;
    }

    // 都是element节点，比较节点类型是否改变
    if (typeof oldVNode === 'object' && typeof newVNode === 'object') {
        return oldVNode.type !== newVNode.type;
    }
}

function isPropsChanged(oldProps, newProps) {
    // 类型都不一致，props肯定发生变化了
    if (typeof oldProps !== typeof newProps) {
        return true;
    }

    // props为对象
    if (typeof oldProps === 'object' && typeof newProps === 'object') {
        const oldKeys = Object.keys(oldProps);
        const newkeys = Object.keys(newProps);
        // props的个数都不一样，一定发生了变化
        if (oldKeys.length !== newkeys.length) {
            return true;
        }
        // props的个数相同的情况，遍历props，看是否有不一致的props
        for (let i = 0; i < oldKeys.length; i++) {
            const key = oldKeys[i]
            if (oldProps[key] !== newProps[key]) {
                return true;
            }
        }
        // 默认未改变
        return false;
    }

    return false;
}

const app = document.getElementById('app');

const oldVNode = (
    <div>
        <span className="old-node" data-node="old" onClick={() => console.log('old-node')}>old-node</span>
        <input disabled={true} />
    </div>
);

const newVNode = (
    <div>
        <span className="new-node" data-node="new">new-node</span>
        <span>next-node</span>
    </div>
);


mount(app, oldVNode); // 初始化挂载一个dom

setTimeout(() => {
    // updateDom(app, oldVNode, newVNode); // 更新dom

    /**
     * 测试，在oldVNode中添加一个节点
     */
    // updateDom(app, oldVNode, {
    //     ...oldVNode,
    //     children: [...oldVNode.children, {
    //         type: 'div',
    //         props: { 'v-key': ++vKey },
    //         children: [{
    //             type: 'textNode',
    //             text: 'test new node',
    //             props: { 'v-key': ++vKey },
    //             children: [],
    //         }],
    //     }],
    // });
    

    /**
     * 测试，颠倒oldVNode的节点
     */
    
    // updateDom(app, oldVNode, {
    //     ...oldVNode,
    //     children: [...oldVNode.children].reverse(),
    // });
    
    /**
     * 测试，在oldVNode前添加一个节点
     */
    
    // updateDom(app, oldVNode, {
    //     ...oldVNode,
    //     children: [{
    //         type: 'div',
    //         props: { 'v-key': ++vKey },
    //         children: [{
    //             type: 'textNode',
    //             text: 'test new node',
    //             props: { 'v-key': ++vKey },
    //             children: [],
    //         }],
    //     }, ...oldVNode.children],
    // });
    
    /**
     * 测试，颠倒oldVNode的节点，并添加2个节点
     */
    
    updateDom(app, oldVNode, {
        ...oldVNode,
        children: [{
            type: 'div',
            props: { 'v-key': ++vKey },
            children: [{
                type: 'textNode',
                text: 'test new node',
                props: { 'v-key': ++vKey },
                children: [],
            }],
        }, ...oldVNode.children, {
            type: 'div',
            props: { 'v-key': ++vKey },
            children: [{
                type: 'textNode',
                text: 'test new node2',
                props: { 'v-key': ++vKey },
                children: [],
            }],
        }].reverse(),
    });


}, 2000);
