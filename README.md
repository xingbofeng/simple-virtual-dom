# 从零开始，手写一个简易的Virtual DOM
众所周知，对前端而言，直接操作 DOM 是一件及其耗费性能的事情，以 React 和 Vue 为代表的众多框架普遍采用 Virtual DOM 来解决如今愈发复杂 Web 应用中状态频繁发生变化导致的频繁更新 DOM 的性能问题。本文为笔者通过实际操作，实现了一个非常简单的 Virtual DOM ，加深对现今主流前端框架中 Virtual DOM 的理解。

关于 Virtual DOM ，社区已经有许多优秀的文章，而本文是笔者采用自己的方式，并有所借鉴前辈们的实现，以浅显易懂的方式，对 Virtual DOM 进行简单实现，但不包含[snabbdom](https://github.com/snabbdom/snabbdom)的源码分析，在笔者的最终实现里，参考了[snabbdom](https://github.com/snabbdom/snabbdom)的原理，将本文的Virtual DOM实现进行了改进，感兴趣的读者可以阅读上面几篇文章，并参考笔者本文的[最终代码](https://github.com/xingbofeng/simple-virtual-dom)进行阅读。

本文阅读时间约15~20分钟。

## 概述

本文分为以下几个方面来讲述极简版本的 Virtual DOM 核心实现：

* Virtual DOM 主要思想
* 用 JavaScript 对象表示 DOM 树
* 将 Virtual DOM 转换为真实 DOM
    * 设置节点的类型
    * 设置节点的属性
    * 对子节点的处理
* 处理变化
    * 新增与删除节点
    * 更新节点
    * 更新子节点

## Virtual DOM 主要思想
要理解 Virtual DOM 的含义，首先需要理解 DOM ，DOM 是针对 HTML 文档和 XML 文档的一个 API ， DOM 描绘了一个层次化的节点树，通过调用 DOM API，开发人员可以任意添加，移除和修改页面的某一部分。而 Virtual DOM 则是用 JavaScript 对象来对 Virtual DOM 进行抽象化的描述。Virtual DOM 的本质是**JavaScript对象**，通过 **Render函数**，可以将 Virtual DOM 树 映射为 真实 DOM 树。

一旦 Virtual DOM 发生改变，会生成新的 Virtual DOM ，相关算法会对比新旧两颗 Virtual DOM 树，并找到他们之间的不同，尽可能地通过最少的 DOM 操作来更新真实 DOM 树。

我们可以这么表示 Virtual DOM 与 DOM 的关系：`DOM = Render(Virtual DOM)`。

![](http://wx4.sinaimg.cn/mw690/005SpQEcly1g3u7uy9db8j31270u0jv1.jpg)

## 用 JavaScript 对象表示 DOM 树

Virtual DOM 是用 JavaScript 对象表示，并存储在内存中的。主流的框架均支持使用 JSX 的写法， JSX 最终会被 babel 编译为JavaScript 对象，用于来表示Virtual DOM，思考下列的 JSX：

```jsx
<div>
    <span className="item">item</span>
    <input disabled={true} />
</div>
```

最终会被babel编译为如下的 JavaScript对象：

```
{
    type: 'div',
    props: null,
    children: [{
        type: 'span',
        props: {
            class: 'item',
        },
        children: ['item'],
    }, {
        type: 'input',
        props: {
            disabled: true,
        },
        children: [],
    }],
}
```

我们可以注意到以下两点：

* 所有的 DOM 节点都是一个类似于这样的对象：

```
{ type: '...', props: { ... }, children: { ... }, on: { ... } }
```

* 本文节点是用 JavaScript 字符串来表示

那么 JSX 又是如何转化为 JavaScript 对象的呢。幸运的是，社区有许许多多优秀的工具帮助我们完成了这件事，由于篇幅有限，本文对这个问题暂时不做探讨。为了方便大家更快速地理解 Virtual DOM ，对于这一个步骤，笔者使用了开源工具来完成。著名的 babel 插件[babel-plugin-transform-react-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx)帮助我们完成这项工作。

为了更好地使用[babel-plugin-transform-react-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx)，我们需要搭建一下webpack开发环境。具体过程这里不做阐述，有兴趣自己实现的同学可以到[simple-virtual-dom](https://github.com/xingbofeng/simple-virtual-dom)查看代码。

对于不使用 JSX 语法的同学，可以不配置[babel-plugin-transform-react-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx)，通过我们的`vdom`函数创建 Virtual DOM：

```javascript
function vdom(type, props, ...children) {
    return {
        type,
        props,
        children,
    };
}
```

然后我们可以通过如下代码创建我们的 Virtual DOM 树：

```javascript
const vNode = vdom('div', null,
    vdom('span', { class: 'item' }, 'item'),
    vdom('input', { disabled: true })
);

```

在控制台输入上述代码，可以看到，已经创建好了用 JavaScript对象表示的 Virtual DOM 树：

![](http://wx1.sinaimg.cn/mw690/005SpQEcly1g3v0p91m8yj30l20w442d.jpg)

## 将 Virtual DOM 转换为真实 DOM
现在我们知道了如何用 JavaScript对象 来代表我们的真实 DOM 树，那么， Virtual DOM 又是怎么转换为真实 DOM 给我们呈现的呢？

在这之前，我们要先知道几项注意事项：

* 在代码中，笔者将以`$`开头的变量来表示真实 DOM 对象；
* `toRealDom`函数接受一个 Virtual DOM 对象为参数，将返回一个真实 DOM 对象；
* `mount`函数接受两个参数：将挂载 Virtual DOM 对象的父节点，这是一个真实 DOM 对象，命名为`$parent`；以及被挂载的 Virtual DOM 对象`vNode`；

下面是`toRealDom`的函数原型：

```javascript
function toRealDom(vNode) {
    let $dom;
    // do something with vNode
    return $dom;
}
```

通过`toRealDom`方法，我们可以将一个`vNode`对象转化为一个真实 DOM 对象，而`mount`函数通过`appendChild`，将真实 DOM 挂载：

```javascript
function mount($parent, vNode) {
    return $parent.appendChild(toRealDom(vNode));
}
```

下面，让我们来分别处理`vNode`的`type`、`props`和`children`。

### 设置节点的类型

首先，因为我们同时具有字符类型的文本节点和对象类型的`element`节点，需要对`type`做单独的处理：

```javascript
if (typeof vNode === 'string') {
    $dom = document.createTextNode(vNode);
} else {
    $dom = document.createElement(vNode.type);
}
```

在这样一个简单的`toRealDom`函数中，对`type`的处理就完成了，接下来让我们看看对`props`的处理。

### 设置节点的属性

我们知道，如果节点有`props`，那么`props`是一个对象。通过遍历`props`，调用`setProp`方法，对每一类`props`单独处理。

```javascript
if (vNode.props) {
    Object.keys(vNode.props).forEach(key => {
        setProp($dom, key, vNode.props[key]);
    });
}
```

`setProp`接受三个参数：

* `$target`，这是一个真实 DOM 对象，`setProp`将对这个节点进行 DOM 操作；
* `name`，表示属性名；
* `value`，表示属性的值；

读到这里，相信你已经大概清楚`setProp`需要做什么了，一般情况下，对于普通的`props`，我们会通过`setAttribute`给 DOM 对象附加属性。

```javascript
function setProp($target, name, value) {
    return $target.setAttribute(name, value);
}
```

但这远远不够，思考下列的 JSX 结构：

```
<div>
    <span className="item" data-node="item" onClick={() => console.log('item')}>item</span>
    <input disabled={true} />
</div>
```

从上面的 JSX 结构中，我们发现以下几点：

* 由于`class`是 JavaScript 的保留字， JSX 一般使用`className`来表示 DOM 节点所属的`class`；
* 一般以`on`开头的属性来表示事件；
* 除字符类型外，属性还可能是布尔值，如`disabled`，当该值为`true`时，则添加这一属性；

所以，`setProp`也同样需要考虑上述情况：

```javascript
function isEventProp(name) {
    return /^on/.test(name);
}

function extractEventName(name) {
    return name.slice(2).toLowerCase();
}

function setProp($target, name, value) {
    if (name === 'className') { // 因为class是保留字，JSX使用className来表示节点的class
        return $target.setAttribute('class', value);
    } else if (isEventProp(name)) { // 针对 on 开头的属性，为事件
        return $target.addEventListener(extractEventName(name), value);
    } else if (typeof value === 'boolean') { // 兼容属性为布尔值的情况
        if (value) {
            $target.setAttribute(name, value);
        }
        return $target[name] = value;
    } else {
        return $target.setAttribute(name, value);
    }
}
```

最后，还有一类属性是我们的自定义属性，例如主流框架中的组件间的状态传递，即通过`props`来进行传递的，我们并不希望这一类属性显示在 DOM 中，因此需要编写一个函数`isCustomProp`来检查这个属性是否是自定义属性，因为本文只是为了实现 Virtual DOM 的核心思想，为了方便，在本文中，这个函数直接返回`false`。

```javascript
function isCustomProp(name) {
    return false;
}
```

最终的`setProp`函数：

```javascript
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
```

### 对子节点的处理
对于`children`里的每一项，都是一个`vNode`对象，在进行 Virtual DOM 转化为真实 DOM 时，子节点也需要被递归转化，可以想到，针对有子节点的情况，需要对子节点以此递归调用`toRealDom`，如下代码所示：

```javascript
if (vNode.children && vNode.children.length) {
    vNode.children.forEach(childVdom => {
        const realChildDom = toRealDom(childVdom);
        $dom.appendChild(realChildDom);
    });
}
```

最终完成的`toRealDom`如下：

```javascript
function toRealDom(vNode) {
    let $dom;
    if (typeof vNode === 'string') {
        $dom = document.createTextNode(vNode);
    } else {
        $dom = document.createElement(vNode.type);
    }

    if (vNode.props) {
        Object.keys(vNode.props).forEach(key => {
            setProp($dom, key, vNode.props[key]);
        });
    }

    if (vNode.children && vNode.children.length) {
        vNode.children.forEach(childVdom => {
            const realChildDom = toRealDom(childVdom);
            $dom.appendChild(realChildDom);
        });
    }

    return $dom;
}
```

## 处理变化

Virtual DOM 之所以被创造出来，最根本的原因是性能提升，通过 Virtual DOM ，开发者可以减少许多不必要的 DOM 操作，以达到最优性能，那么下面我们来看看 Virtual DOM 算法 是如何通过对比更新前的 Virtual DOM 树和更新后的 Virtual DOM 树来实现性能优化的。

> 注：本文是笔者的最简单实现，目前社区普遍通用的算法是[snabbdom](https://github.com/snabbdom/snabbdom)，如 Vue 则是借鉴该算法实现的 Virtual DOM ，有兴趣的读者可以查看这个库的源代码，基于本文的 Virtual DOM 的小示例，笔者最终也参考了该算法实现，[本文demo传送门](https://github.com/xingbofeng/simple-virtual-dom)，由于篇幅有限，感兴趣的读者可以自行研究。

为了处理变化，首先声明一个`updateDom`函数，这个函数接受以下四个参数：

* `$parent`，表示将被挂载的父节点；
* `oldVNode`，旧的`VNode`对象；
* `newVNode`，新的`VNode`对象；
* `index`，在更新子节点时使用，表示当前更新第几个子节点，默认为0；

函数原型如下：

```javascript
function updateDom($parent, oldVNode, newVNode, index = 0) {

}
```

### 新增与删除节点

首先我们来看新增一个节点的情况，对于原本没有该节点，需要添加新的一个节点到 DOM 树中，我们需要通过`appendChild`来实现：

![](http://wx1.sinaimg.cn/mw690/005SpQEcly1g3v5jpllk5j30ls0dwjsh.jpg)

转化为代码表述为：

```javascript
// 没有旧的节点，添加新的节点
if (!oldVNode) {
    return $parent.appendChild(toRealDom(newVNode));
}
```

同理，对于删除一个旧节点的情况，我们通过`removeChild`来实现，在这里，我们应该从真实 DOM 中将旧的节点删掉，但问题是在这个函数中是直接取不到这一个节点的，我们需要知道这个节点在父节点中的位置，事实上，可以通过`$parent.childNodes[index]`来取到，这便是上面提到的为何需要传入`index`，它表示当前更新的节点在父节点中的索引：

![](http://wx1.sinaimg.cn/mw690/005SpQEcly1g3v5jvs5k4j30j40dw75a.jpg)

转化为代码表述为：

```javascript
const $currentDom = $parent.childNodes[index];

// 没有新的节点，删除旧的节点
if (!newVNode) {
    return $parent.removeChild($currentDom);
}
```

### 更新节点

Virtual DOM 的核心在于如何高效更新节点，下面我们来看看更新节点的情况。

首先，针对文本节点，我们可以简单处理，对于文本节点是否发生改变，只需要通过比较其新旧字符串是否相等即可，如果是相同的文本节点，是不需要我们更新 DOM 的，在`updateDom`函数中，直接`return`即可：

```javascript
// 都是文本节点，都没有发生变化
if (typeof oldVNode === 'string' && typeof newVNode === 'string' && oldVNode === newVNode) {
    return;
}
```

接下来，考虑节点是否真的需要更新，如图所示，一个节点的类型从`span`换成了`div`，显而易见，这是一定需要我们去更新`DOM`的：

![](http://wx3.sinaimg.cn/mw690/005SpQEcly1g3v69uzz71j30iw0dwq3y.jpg)

我们需要编写一个函数`isNodeChanged`来帮助我们判断旧节点和新节点是否真的一致，如果不一致，需要我们把节点进行替换：

```javascript
function isNodeChanged(oldVNode, newVNode) {
    // 一个是textNode，一个是element，一定改变
    if (typeof oldVNode !== typeof newVNode) {
        return true;
    }

    // 都是textNode，比较文本是否改变
    if (typeof oldVNode === 'string' && typeof newVNode === 'string') {
        return oldVNode !== newVNode;
    }

    // 都是element节点，比较节点类型是否改变
    if (typeof oldVNode === 'object' && typeof newVNode === 'object') {
        return oldVNode.type !== newVNode.type;
    }
}
```

在`updateDom`中，发现节点类型发生变化，则将该节点直接替换，如下代码所示，通过调用`replaceChild`，将旧的 DOM 节点移除，并将新的 DOM 节点加入：

```javascript
if (isNodeChanged(oldVNode, newVNode)) {
    return $parent.replaceChild(toRealDom(newVNode), $currentDom);
}
```

但这远远还没有结束，考虑下面这种情况：

```html
<!-- old -->
<div class="item" data-item="old-item"></div>
```

```html
<!-- new -->
<div id="item" data-item="new-item"></div>
```

对比上面的新旧两个节点，发现节点类型并没有发生改变，即`VNode.type`都是`'div'`，但是节点的属性却发生了改变，除了针对节点类型的变化更新 DOM 外，针对节点的属性的改变，也需要对应把 DOM 更新。

与上述方法类似，我们编写一个`isPropsChanged`函数，来判断新旧两个节点的属性是否有发生变化：

```javascript
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
```

因为当节点没有任何属性时，`props`为`null`，`isPropsChanged`首先判断新旧两个节点的`props`是否是同一类型，即是否存在旧节点的`props`为`null`，新节点有新的属性，或者反之：新节点的`props`为`null`，旧节点的属性被删除了。如果类型不一致，那么属性一定是被更新的。

接下来，考虑到节点在更新前后都有`props`的情况，我们需要判断更新前后的`props`是否一致，即两个对象是否全等，遍历即可。如果有不相等的属性，则认为`props`发生改变，需要处理`props`的变化。

现在，让我们回到我们的`updateDom`函数，看看是把Virtual DOM 节点`props`的更新应用到真实 DOM 上的。

```javascript
// 虚拟DOM的type未改变，对比节点的props是否改变
const oldProps = oldVNode.props || {};
const newProps = newVNode.props || {};
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
                return setProp($currentDom, propKey, newProps[propKey]);
            }
        });
    }
}
```

上面的代码也非常好理解，如果发现`props`改变了，那么对旧的`props`的每项去做遍历。把不存在的属性清除，再把新增加的属性加入到更新后的 DOM 树中：

* 首先，如果新的节点没有属性，遍历删除所有旧的节点的属性，在这里，我们通过调用`removeProp`删除。`removeProp`与`setProp`相对应，由于本文篇幅有限，笔者在这里就不做过多阐述；

```javascript
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
```

* 如果新节点有属性，那么拿到旧节点和新节点所有属性，遍历新旧节点的所有属性，如果属性在新节点中没有，那么说明该属性被删除了。如果新的节点与旧的节点属性不一致/或者是新增的属性，则调用`setProp`给真实 DOM 节点添加新的属性。

### 更新子节点
在最后，与`toRealDom`类似的是，在`updateDom`中，我们也应当处理所有子节点，对子节点进行递归调用`updateDom`，一个一个对比所有子节点的`VNode`是否有更新，一旦`VNode`有更新，则真实 DOM 也需要重新渲染：

```javascript
// 根节点相同，但子节点不同，要递归对比子节点
if (
    (oldNode.children && oldNode.children.length) ||
    (newNode.children && newNode.children.length)
) {
    for (let i = 0; i < oldNode.children.length || i < newNode.children.length; i++) {
        updateDom($currentDom, oldNode.children[i], newNode.children[i], i);
    }
}
```

## 远远没有结束

以上是笔者实现的最简单的 Virtual DOM 代码，但这与社区我们所用到 Virtual DOM 算法是有天壤之别的，笔者在这里举个最简单的例子：

```html
<!-- old -->
<ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
    <li>4</li>
    <li>5</li>
</ul>
```

```html
<!-- new -->
<ul>
    <li>5</li>
    <li>1</li>
    <li>2</li>
    <li>3</li>
    <li>4</li>
</ul>
```

对于上述代码中实现的`updateDom`函数而言，更新前后的 DOM 结构如上所示，则会触发五个`li`节点全部重新渲染，这显然是一种性能的浪费。而[snabbdom](https://github.com/snabbdom/snabbdom)则通过移动节点的方式较好地解决了上述问题，由于本文篇幅有限，并且社区也有许多对该 Virtual DOM 算法的分析文章，笔者就不在本文做过多阐述了，有兴趣的读者可以到自行研究。笔者也基于本文实例，参考[snabbdom](https://github.com/snabbdom/snabbdom)算法实现了最终的版本，有兴趣的读者可以查看本文示例[最终版](https://github.com/xingbofeng/simple-virtual-dom) 