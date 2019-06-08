# 从零开始，手写一个简易的Virtual DOM
众所周知，对前端而言，直接操作 DOM 是一件及其耗费性能的事情，以 React 和 Vue 为代表的众多框架普遍采用 Virtual DOM 来解决如今愈发复杂 Web 应用中状态频繁发生变化导致的频繁更新 DOM 的性能问题。本文为笔者通过实际操作，实现了一个非常简单的 Virtual DOM ，加深对现今主流前端框架中 Virtual DOM 的理解。

关于 Virtual DOM ，已经有许多优秀的文章有所讨论了，而本文是笔者采用自己的方式，并有所借鉴前辈们的实现，以浅显易懂的方式，对 Virtual DOM 进行简单实现。

本文阅读时间约15~20分钟。

## 概述

本文分为以下几个方面来讲述极简版本的 Virtual DOM 核心实现：

* Virtual DOM 主要思想
* 用 JavaScript 对象表示 DOM 树
* 将 Virtual DOM 对象转换为真实 DOM
* 由Virtual DOM 对象变化引发真实 DOM 更新
    * 新增节点
    * 删除节点
    * 改变节点
    * 对比子节点
    * 设置节点的props
    * 处理事件
* 性能问题？snabbdom 算法解析

## Virtual DOM 主要思想
要理解 Virtual DOM 的含义，首先需要理解 DOM ，DOM 是针对 HTML 文档和 XML 文档的一个 API ， DOM 描绘了一个层次化的节点树，通过调用 DOM API，开发人员可以任意添加，移除和修改页面的某一部分。而 Virtual DOM 则是用 JavaScript 对象来对 Virtual DOM 进行抽象化的描述。Virtual DOM 的本质是**JavaScript对象**，通过 **Render函数**，可以将 Virtual DOM 树 映射为 真实 DOM 树。

我们可以这么表示 Virtual DOM 与 DOM 的关系：`DOM = Render(Virtual DOM)`。

![](http://wx4.sinaimg.cn/mw690/005SpQEcly1g3u7uy9db8j31270u0jv1.jpg)