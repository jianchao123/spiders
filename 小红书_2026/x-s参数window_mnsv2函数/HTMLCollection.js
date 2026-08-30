'use strict';

/* ============================================================
 * 1. 基础原型链：EventTarget -> Node -> Element -> HTMLElement
 *    -> HTMLHtmlElement / HTMLHeadElement / HTMLBodyElement / HTMLScriptElement
 * ============================================================ */

// 常见 aria-* 属性（挂在 Element.prototype 上，默认值 null）
const ARIA_PROPS = [
  'ariaAtomic', 'ariaAutoComplete', 'ariaBusy', 'ariaChecked', 'ariaColCount',
  'ariaColIndex', 'ariaColSpan', 'ariaCurrent', 'ariaDescription', 'ariaDisabled',
  'ariaExpanded', 'ariaHasPopup', 'ariaHidden', 'ariaInvalid', 'ariaKeyShortcuts',
  'ariaLabel', 'ariaLevel', 'ariaLive', 'ariaModal', 'ariaMultiLine',
  'ariaMultiSelectable', 'ariaOrientation', 'ariaPlaceholder', 'ariaPosInSet',
  'ariaPressed', 'ariaReadOnly', 'ariaRelevant', 'ariaRequired', 'ariaRoleDescription',
  'ariaRowCount', 'ariaRowIndex', 'ariaRowSpan', 'ariaSelected', 'ariaSetSize',
  'ariaSort', 'ariaValueMax', 'ariaValueMin', 'ariaValueNow', 'ariaValueText',
];

// 通用 GlobalEventHandlers（挂在 HTMLElement.prototype 上，默认值 null）
const COMMON_EVENT_HANDLERS = [
  'onabort', 'onanimationcancel', 'onanimationend', 'onanimationiteration', 'onanimationstart',
  'onauxclick', 'onbeforeinput', 'onblur', 'oncancel', 'oncanplay', 'oncanplaythrough',
  'onchange', 'onclick', 'onclose', 'oncontextmenu', 'oncopy', 'oncuechange', 'oncut',
  'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
  'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror',
  'onfocus', 'onformdata', 'onfullscreenchange', 'onfullscreenerror', 'ongotpointercapture',
  'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onloadeddata',
  'onloadedmetadata', 'onloadstart', 'onlostpointercapture', 'onmousedown', 'onmouseenter',
  'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onpaste',
  'onpause', 'onplay', 'onplaying', 'onpointercancel', 'onpointerdown', 'onpointerenter',
  'onpointerleave', 'onpointermove', 'onpointerout', 'onpointerover', 'onpointerup',
  'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onscrollend',
  'onsecuritypolicyviolation', 'onseeked', 'onseeking', 'onselect', 'onselectionchange',
  'onselectstart', 'onslotchange', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate',
  'ontoggle', 'ontransitioncancel', 'ontransitionend', 'ontransitionrun', 'ontransitionstart',
  'onvolumechange', 'onwaiting', 'onwheel',
];

// 只挂在 <body>/<html> 上的 WindowEventHandlers 混入属性
const WINDOW_EVENT_HANDLERS = [
  'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onhashchange', 'onlanguagechange',
  'onmessage', 'onmessageerror', 'onoffline', 'ononline', 'onpagehide', 'onpageshow',
  'onpopstate', 'onrejectionhandled', 'onstorage', 'onunhandledrejection', 'onunload',
];

/** 把一批属性名以 null 值批量挂到某个原型对象上（模拟浏览器原型上的默认 getter/setter） */
function definePropsAsNull(proto, names) {
  for (const name of names) {
    Object.defineProperty(proto, name, {
      value: null,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
}

/** 创建一层原型，并挂上 Symbol.toStringTag（真实 DOM 原型上就是这么做的） */
function makeProto(parentProto, tag) {
  const proto = Object.create(parentProto);
  Object.defineProperty(proto, Symbol.toStringTag, {
    get() { return tag; },
    configurable: true,
  });
  return proto;
}

const EventTargetProto = {};
Object.defineProperty(EventTargetProto, Symbol.toStringTag, {
  get() { return 'EventTarget'; },
  configurable: true,
});

const NodeProto = makeProto(EventTargetProto, 'Node');
const ElementProto = makeProto(NodeProto, 'Element');
definePropsAsNull(ElementProto, ARIA_PROPS);

const HTMLElementProto = makeProto(ElementProto, 'HTMLElement');
definePropsAsNull(HTMLElementProto, COMMON_EVENT_HANDLERS);

const HTMLHtmlElementProto = makeProto(HTMLElementProto, 'HTMLHtmlElement');
definePropsAsNull(HTMLHtmlElementProto, WINDOW_EVENT_HANDLERS);

const HTMLHeadElementProto = makeProto(HTMLElementProto, 'HTMLHeadElement');

const HTMLBodyElementProto = makeProto(HTMLElementProto, 'HTMLBodyElement');
definePropsAsNull(HTMLBodyElementProto, WINDOW_EVENT_HANDLERS);

const HTMLScriptElementProto = makeProto(HTMLElementProto, 'HTMLScriptElement');
definePropsAsNull(HTMLScriptElementProto, [
  'async', 'defer', 'noModule', 'crossOrigin', 'integrity', 'referrerPolicy',
  'charset', 'event', 'htmlFor', 'type', 'text', 'src',
]);

/* ============================================================
 * 2. 简单的 NamedNodeMap / DOMTokenList / CSSStyleDeclaration 模拟
 * ============================================================ */

function createAttributes() {
  return Object.create({
    [Symbol.toStringTag]: 'NamedNodeMap',
  }, { length: { value: 0, enumerable: true } });
}

function createClassList() {
  const list = [];
  return Object.assign(Object.create({
    [Symbol.toStringTag]: 'DOMTokenList',
  }), { value: '', length: 0, item: (i) => list[i] ?? null });
}

function createStyle() {
  return Object.create({ [Symbol.toStringTag]: 'CSSStyleDeclaration' });
}

/* ============================================================
 * 3. 创建 4 个元素实例：html / head / body / script
 * ============================================================ */

function baseElementProps(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    localName: tagName.toLowerCase(),
    nodeType: 1,
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    id: '',
    className: '',
    attributes: createAttributes(),
    classList: createClassList(),
    style: createStyle(),
    dataset: {},
    isConnected: true,
    parentElement: null,
    parentNode: null,
    childNodes: [],
    children: [],
    firstChild: null,
    firstElementChild: null,
    lastChild: null,
    lastElementChild: null,
    nextElementSibling: null,
    previousElementSibling: null,
    textContent: '',
    innerHTML: '',
    outerHTML: '',
  };
}

const htmlEl = Object.assign(Object.create(HTMLHtmlElementProto), baseElementProps('html'));
const headEl = Object.assign(Object.create(HTMLHeadElementProto), baseElementProps('head'));
const bodyEl = Object.assign(Object.create(HTMLBodyElementProto), baseElementProps('body'));
const scriptEl = Object.assign(Object.create(HTMLScriptElementProto), baseElementProps('script'), {
  src: 'http://Users/jianc/Desktop/小红书/测试/xhs_demo.js',
});

// 建立父子关系，与原始快照一致：html > head, body；body > script
htmlEl.children = [headEl, bodyEl];
htmlEl.childNodes = [headEl, bodyEl];
htmlEl.firstElementChild = headEl;
htmlEl.lastElementChild = bodyEl;

headEl.parentElement = htmlEl;
headEl.parentNode = htmlEl;
headEl.nextElementSibling = bodyEl;

bodyEl.parentElement = htmlEl;
bodyEl.parentNode = htmlEl;
bodyEl.previousElementSibling = headEl;
bodyEl.children = [scriptEl];
bodyEl.childNodes = [scriptEl];
bodyEl.firstElementChild = scriptEl;
bodyEl.lastElementChild = scriptEl;
bodyEl.innerHTML = '\n  <script src="xhs_demo.js"></script>\n\n\n';
bodyEl.outerHTML = `<body>${bodyEl.innerHTML}</body>`;

scriptEl.parentElement = bodyEl;
scriptEl.parentNode = bodyEl;
scriptEl.outerHTML = '<script src="xhs_demo.js"></script>';

htmlEl.innerHTML = '<head></head><body>\n  <script src="xhs_demo.js"></script>\n\n\n</body>';
htmlEl.outerHTML = `<html>${htmlEl.innerHTML}</html>`;

/* ============================================================
 * 4. HTMLCollection：真正的原型 + 原型上的 Symbol
 * ============================================================ */

// 真实浏览器里 HTMLCollection.prototype 上就是：length getter、item/namedItem 方法、
// 以及 Symbol.toStringTag（这里额外加了 Symbol.iterator，方便 for...of 使用）
const HTMLCollectionProto = {
  item(index) {
    return this._elements[index] ?? null;
  },
  namedItem(name) {
    return this._elements.find((el) => el.id === name) ?? null;
  },
  get length() {
    return this._elements.length;
  },
};

Object.defineProperty(HTMLCollectionProto, Symbol.toStringTag, {
  get() { return 'HTMLCollection'; },
  configurable: true,
});

Object.defineProperty(HTMLCollectionProto, Symbol.iterator, {
  value: function* () {
    yield* this._elements;
  },
  configurable: true,
});

/** 用 Proxy 实现类数组的下标访问（0,1,2,3）+ 保留 item/namedItem/length/Symbol */
function createHTMLCollection(elements) {
  const target = Object.create(HTMLCollectionProto);
  target._elements = elements;

  return new Proxy(target, {
    get(t, prop, receiver) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return t._elements[Number(prop)];
      }
      return Reflect.get(t, prop, receiver);
    },
    has(t, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return Number(prop) < t._elements.length;
      }
      return Reflect.has(t, prop);
    },
    ownKeys(t) {
      const idx = t._elements.map((_, i) => String(i));
      return [...idx, 'length'];
    },
    getOwnPropertyDescriptor(t, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const i = Number(prop);
        if (i < t._elements.length) {
          return { value: t._elements[i], writable: false, enumerable: true, configurable: true };
        }
        return undefined;
      }
      return Object.getOwnPropertyDescriptor(t, prop);
    },
  });
}

/* ============================================================
 * 5. 最终产物：一个长度为 4、类型是 HTMLCollection 的对象
 * ============================================================ */

const collection = createHTMLCollection([htmlEl, headEl, bodyEl, scriptEl]);

console.log(collection);
// 打印效果类似：HTMLCollection(4) [html, head, body, script]

console.log('length:', collection.length);          // 4
console.log('item(2) tagName:', collection.item(2).tagName); // BODY
console.log('collection[3] tagName:', collection[3].tagName); // SCRIPT
console.log(Object.prototype.toString.call(collection)); // [object HTMLCollection]
console.log([...collection].map((el) => el.tagName));     // ['HTML','HEAD','BODY','SCRIPT']

module.exports = { collection, htmlEl, headEl, bodyEl, scriptEl };