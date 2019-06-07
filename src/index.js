function vdom(type, props, ...children) {
    return {
        type,
        props,
        children,
    };
}

function toRealDom(vdom) {
    let $dom;
    if (typeof vdom === 'string') {
        $dom = document.createTextNode(vdom);
    } else {
        $dom = document.createElement(vdom.type);
    }

    if (vdom.props) {
        Object.keys(vdom.props).forEach(key => {
            setProps($dom, key, vdom.props[key]);
        });
    }

    if (vdom.children) {
        vdom.children.forEach(childVdom => {
            const realChildDom = toRealDom(childVdom);
            $dom.appendChild(realChildDom);
        });
    }

    return $dom;
}

function mount($parent, vNode) {
    return $parent.appendChild(toRealDom(vNode));
}

function updateDom($parent, oldNode, newNode, index = 0) {
    const $currentDom = $parent.childNodes[index];
    // 没有旧的节点，添加新的节点
    if (!oldNode) {
        return $parent.appendChild(toRealDom(newNode));
    }

    // 没有新的节点，删除旧的节点
    if (!newNode) {
        return $parent.removeChild($currentDom);
    }

    // 都是文本节点，都没有发生变化
    if (typeof oldNode === 'string' && typeof newNode === 'string' && oldNode === newNode) {
        return;
    }

    // oldNode和newNode都有值，深入对比
    if (isNodeChanged(oldNode, newNode)) {
        return $parent.replaceChild(toRealDom(newNode), $currentDom);
    }

    // 虚拟DOM的type未改变，对比节点的props是否改变
    const oldProps = oldNode.props || {};
    const newProps = newNode.props || {};
    if (isPropsChanged(oldProps, newProps)) {
        const oldPropsKeys = Object.keys(oldProps);
        const newPropsKeys = Object.keys(newProps);

        // 如果新节点没有属性，把旧的节点的属性清除掉
        if (newPropsKeys.length === 0) {
            oldPropsKeys.forEach(propKey => {
                removeProp($currentDom, propKey, oldProps[propKey]);
            });
        } else {
            // 拿到所有的props，以此遍历，增加/删除/修改对应属性
            const allPropsKeys = new Set([...oldPropsKeys, ... newPropsKeys]);
            allPropsKeys.forEach(propKey => {
                // 属性被去除了
                if (!newProps[propKey]) {
                    return removeProp($currentDom, propKey, oldProps[propKey]);
                }
                // 属性改变了/增加了
                if (newProps[propKey] !== oldProps[propKey]) {
                    return setProps($currentDom, propKey, newProps[propKey]);
                }
            });
        }
    }

    // 根节点相同，但子节点不同，要递归对比子节点
    if (
        (oldNode.children && oldNode.children.length) ||
        (newNode.children && newNode.children.length)
    ) {
        for (let i = 0; i < oldNode.children.length || i < newNode.children.length; i++) {
            updateDom($currentDom, oldNode.children[i], newNode.children[i], i);
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

function setProps($target, name, value) {
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

function isNodeChanged(oldNode, newNode) {
    // 一个是textNode，一个是element，一定改变
    if (typeof oldNode !== typeof newNode) {
        return true;
    }

    // 都是textNode，比较文本是否改变
    if (typeof oldNode === 'string' && typeof newNode === 'string') {
        return oldNode !== newNode;
    }

    // 都是element节点，比较节点类型是否改变
    if (typeof oldNode === 'object' && typeof newNode === 'object') {
        return oldNode.type !== newNode.type;
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

const oldNode = (
    <div>
        <span className="old-node" data-node="old" onClick={() => console.log('old-node')}>old-node</span>
        <input disabled={true} />
    </div>
);

const newNode = (
    <div>
        <span className="new-node" data-node="new">new-node</span>
        <span>next-node</span>
    </div>
);


mount(app, oldNode); // 初始化挂载一个dom


setTimeout(() => {
    updateDom(app, oldNode, newNode); // 更新dom
}, 2000);
