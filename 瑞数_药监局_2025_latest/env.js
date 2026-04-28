!(function () {
    var console_log = console.log;
    watch = function (obj, name) {
        return new Proxy(obj, {
            get(target, p, receiver) {
                if (name !== "contentWindow" && p === "Math" || p === "JSON" || p === "RegExp" || p === "atob" || p === "parseInt" || p === "String" || p === "Symbol" || p === "Proxy" || p === "Promise" || p === "Array" || p === "isNaN" || p === "encodeURI" || p === "Uint8Array" || p.toString().indexOf("Symbol(Symbol.") !== -1 || p.toString().indexOf("Symbol(nodejs") !== -1) {
                    return Reflect.get(...arguments);
                }
                var val = Reflect.get(...arguments);
                if (typeof val === "function") {
                    console_log("get", name, ".", p, "=>function");
                } else {
                    console_log("get", name, ".", p, "=>", val);
                }
                return val;
            },
            set(target, p, value, receiver) {
                var val = Reflect.set(...arguments);
                if (typeof value === "function") {
                    console_log("set", `${name}.${p}`, "=>function");
                } else {
                    console_log("set", `${name}.${p}`, "=>", value);
                }
                return val;
            },
            has(target, key) {
                console_log("has", `${name}.${key.toString()}`);
                return key in target;
            },
            ownKeys(target) {
                console_log("ownKeys", name);
                if (name === "contentWindow_navigator") {
                    return watch([], "contentWindow_navigator_keys");
                }
                return Reflect.ownKeys(target);
            }
        });
    };
})();

(() => {
    const $toString = Function.toString;
    const nativeSymbol = Symbol("(()_)");
    const myToString = function toString() {
        return typeof this === "function" && this[nativeSymbol] || $toString.call(this);
    };

    function setNative(func, key, value) {
        Object.defineProperty(func, key, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: value
        });
    }

    delete Function.prototype.toString;
    setNative(Function.prototype, "toString", myToString);
    setNative(Function.prototype.toString, nativeSymbol, "function toString() { [native code] }");

    safeFunction = function (func) {
        setNative(func, nativeSymbol, `function ${func.name}() { [native code] }`);
    };
})();

function makeFunction(name, impl) {
    var func = new Function("impl", `
        return function ${name}() {
            if (typeof impl === "function") {
                return impl.apply(this, arguments);
            }
            console.log("makeFunction call.${name}", ...arguments);
        }
    `)(impl);
    safeFunction(func);
    func.prototype = watch(func.prototype, `makeFunction.prototype:${name}`);
    return watch(func, `makeFunction:${name}`);
}

function setTag(target, tag) {
    Object.defineProperty(target, Symbol.toStringTag, {
        value: tag,
        configurable: true
    });
    return target;
}

function defineGetter(target, key, getter, setter) {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get: getter,
        set: setter
    });
}

function makeCollection(items, tagName) {
    const list = [];
    items.forEach((item, index) => {
        list[index] = item;
    });
    setTag(list, tagName || "HTMLCollection");
    list.item = makeFunction("item", function (index) {
        return list[index] || null;
    });
    list.namedItem = makeFunction("namedItem", function (name) {
        for (const item of list) {
            if (item && (item.id === name || item.name === name)) {
                return item;
            }
        }
        return null;
    });
    return list;
}

function createStyleDeclaration() {
    const style = {};
    setTag(style, "CSSStyleDeclaration");
    style.setProperty = makeFunction("setProperty", function (name, value) {
        style[name] = String(value);
    });
    style.getPropertyValue = makeFunction("getPropertyValue", function (name) {
        return style[name] || "";
    });
    style.removeProperty = makeFunction("removeProperty", function (name) {
        const oldValue = style[name] || "";
        delete style[name];
        return oldValue;
    });
    style.item = makeFunction("item", function () {
        return "";
    });
    return style;
}

function createEventTarget(target) {
    const listeners = Object.create(null);
    target.addEventListener = makeFunction("addEventListener", function (type, listener) {
        if (!listeners[type]) {
            listeners[type] = [];
        }
        listeners[type].push(listener);
    });
    target.removeEventListener = makeFunction("removeEventListener", function (type, listener) {
        if (!listeners[type]) {
            return;
        }
        listeners[type] = listeners[type].filter((fn) => fn !== listener);
    });
    target.dispatchEvent = makeFunction("dispatchEvent", function (event) {
        const queue = listeners[event && event.type] || [];
        queue.forEach((fn) => {
            try {
                fn.call(target, event);
            } catch (error) {
                console.log("dispatchEvent error", error && error.message);
            }
        });
        return true;
    });
    return target;
}

let window = globalThis;
let location;
let document;
let navigator;
let localStorage;
let sessionStorage;
let screen;
let history;

const idRegistry = Object.create(null);

function registerElementId(element) {
    if (element && element.id) {
        idRegistry[element.id] = element;
    }
}

function syncChildren(node) {
    node.childNodes = makeCollection(node._children, "NodeList");
    node.children = makeCollection(node._children.filter((item) => item && item.nodeType === 1), "HTMLCollection");
}

function appendNode(parent, child) {
    if (!child) {
        return child;
    }
    child.parentNode = parent;
    child.parentElement = parent.nodeType === 1 ? parent : null;
    parent._children.push(child);
    syncChildren(parent);
    registerElementId(child);
    return child;
}

function removeNode(parent, child) {
    const index = parent._children.indexOf(child);
    if (index !== -1) {
        parent._children.splice(index, 1);
        syncChildren(parent);
    }
    child.parentNode = null;
    child.parentElement = null;
    return child;
}

function applyUrlLike(target, href) {
    const base = location && location.href ? location.href : "https://www.nmpa.gov.cn/datasearch/search-result.html#category=yp";
    const parsed = new URL(href || "", base);
    target._href = parsed.href;
    target.protocol = parsed.protocol;
    target.host = parsed.host;
    target.hostname = parsed.hostname;
    target.port = parsed.port;
    target.pathname = parsed.pathname;
    target.search = parsed.search;
    target.hash = parsed.hash;
    target.origin = parsed.origin;
}

function cloneStyle(style) {
    const cloned = createStyleDeclaration();
    Object.keys(style).forEach((key) => {
        cloned[key] = style[key];
    });
    return cloned;
}

function buildBaseNode(tagName, toStringTag, nodeType) {
    const upperTag = tagName ? String(tagName).toUpperCase() : "";
    const node = {};
    setTag(node, toStringTag);
    node._tagName = tagName || "";
    node.nodeType = nodeType || 1;
    node.nodeName = nodeType === 3 ? "#text" : nodeType === 11 ? "#document-fragment" : upperTag;
    node.tagName = nodeType === 1 ? upperTag : undefined;
    node.ownerDocument = null;
    node.parentNode = null;
    node.parentElement = null;
    node.attributes = Object.create(null);
    node._children = [];
    node.style = createStyleDeclaration();
    node.textContent = "";
    node.innerText = "";
    node._innerHTML = "";
    node._normalizedInnerHTML = "";
    syncChildren(node);

    defineGetter(node, "firstChild", function () {
        return node._children[0] || null;
    });
    defineGetter(node, "lastChild", function () {
        return node._children[node._children.length - 1] || null;
    });
    defineGetter(node, "innerHTML", function () {
        return node._normalizedInnerHTML || node._innerHTML || "";
    }, function (html) {
        node._children = [];
        node._innerHTML = String(html);
        node._normalizedInnerHTML = String(html);

        if (node._tagName === "div" && node._innerHTML === "<div a=\"\"/>") {
            node._normalizedInnerHTML = "<div a=\"\"></div>";
        } else if (node._tagName === "div" && node._innerHTML === "<a href=\"\"/>") {
            node._normalizedInnerHTML = "<a href=\"\"></a>";
        } else if (/<textarea>/i.test(node._innerHTML)) {
            appendNode(node, buildElement("textarea"));
        } else if (/<option/i.test(node._innerHTML)) {
            appendNode(node, buildElement("option"));
        } else if (/<form><\/form><form><\/form>/i.test(node._innerHTML)) {
            appendNode(node, buildElement("form"));
            appendNode(node, buildElement("form"));
        }

        syncChildren(node);
    });

    node.appendChild = makeFunction("appendChild", function (child) {
        return appendNode(node, child);
    });
    node.removeChild = makeFunction("removeChild", function (child) {
        return removeNode(node, child);
    });
    node.contains = makeFunction("contains", function (target) {
        if (target === node) {
            return true;
        }
        return node._children.some((child) => child === target || (child && typeof child.contains === "function" && child.contains(target)));
    });
    node.getAttribute = makeFunction("getAttribute", function (name) {
        name = String(name);
        return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null;
    });
    node.setAttribute = makeFunction("setAttribute", function (name, value) {
        name = String(name);
        const stringValue = String(value);
        node.attributes[name] = stringValue;
        if (name === "id") {
            node.id = stringValue;
            registerElementId(node);
        } else if (name === "name") {
            node.name = stringValue;
        } else if (name === "type") {
            node.type = stringValue;
            if ((stringValue === "checkbox" || stringValue === "radio") && !node.value) {
                node.value = "on";
            }
        } else if (name === "checked") {
            node.checked = true;
        } else if (name === "href" && typeof node._applyHref === "function") {
            node._applyHref(stringValue);
        }
        return undefined;
    });
    node.cloneNode = makeFunction("cloneNode", function (deep) {
        return cloneNodeLike(node, !!deep);
    });
    node.toString = makeFunction("toString", function () {
        return `[object ${toStringTag}]`;
    });

     // 在 appendChild/removeChild 等方法之后添加：
    
    node.getElementsByTagName = makeFunction("getElementsByTagName", function (tag) {
        const lower = String(tag).toLowerCase();
        const found = [];
        const walk = function (n) {
            (n._children || []).forEach((child) => {
                if (!child) return;
                if (child._tagName === lower || lower === "*") {
                    found.push(child);
                }
                if (child._children) walk(child);
            });
        };
        walk(node);
        return makeCollection(found, "HTMLCollection");
    });

    node.getElementsByClassName = makeFunction("getElementsByClassName", function (className) {
        const found = [];
        const walk = function (n) {
            (n._children || []).forEach((child) => {
                if (!child) return;
                const cls = child.attributes && child.attributes["class"] || "";
                if (cls.split(/\s+/).includes(className)) {
                    found.push(child);
                }
                if (child._children) walk(child);
            });
        };
        walk(node);
        return makeCollection(found, "HTMLCollection");
    });

    node.querySelector = makeFunction("querySelector", function (selector) {
        // 简单支持 tagName、#id、.class 选择器
        const found = [];
        const walk = function (n) {
            (n._children || []).forEach((child) => {
                if (!child) return;
                let match = false;
                if (/^[a-zA-Z]/.test(selector) && child._tagName === selector.toLowerCase()) match = true;
                if (selector.startsWith("#") && child.id === selector.slice(1)) match = true;
                if (selector.startsWith(".")) {
                    const cls = child.attributes && child.attributes["class"] || "";
                    if (cls.split(/\s+/).includes(selector.slice(1))) match = true;
                }
                if (match) found.push(child);
                if (child._children) walk(child);
            });
        };
        walk(node);
        return found[0] || null;
    });

    node.querySelectorAll = makeFunction("querySelectorAll", function (selector) {
        const found = [];
        const walk = function (n) {
            (n._children || []).forEach((child) => {
                if (!child) return;
                let match = false;
                if (/^[a-zA-Z]/.test(selector) && child._tagName === selector.toLowerCase()) match = true;
                if (selector.startsWith("#") && child.id === selector.slice(1)) match = true;
                if (selector.startsWith(".")) {
                    const cls = child.attributes && child.attributes["class"] || "";
                    if (cls.split(/\s+/).includes(selector.slice(1))) match = true;
                }
                if (match) found.push(child);
                if (child._children) walk(child);
            });
        };
        walk(node);
        return makeCollection(found, "NodeList");
    });

    return node;
}

function buildTextNode(text) {
    const textNode = buildBaseNode("", "Text", 3);
    textNode.data = String(text || "");
    textNode.textContent = textNode.data;
    return textNode;
}

function buildDocumentFragment() {
    return buildBaseNode("", "DocumentFragment", 11);
}

function buildAnchorElement() {
    const anchor = buildBaseNode("a", "HTMLAnchorElement", 1);
    anchor._applyHref = function (href) {
        applyUrlLike(anchor, href);
        anchor.attributes.href = anchor._href;
    };
    defineGetter(anchor, "href", function () {
        return anchor._href || "";
    }, function (value) {
        anchor._applyHref(value);
    });
    anchor._applyHref("https://www.nmpa.gov.cn/datasearch/home-index.html#category=yp");
    return anchor;
}

function buildInputElement() {
    const input = buildBaseNode("input", "HTMLInputElement", 1);
    input.type = "text";
    input.value = "";
    input.checked = false;
    return input;
}

function buildFormElement() {
    const form = buildBaseNode("form", "HTMLFormElement", 1);
    form.action = "";
    return form;
}

function buildOptionElement() {
    const option = buildBaseNode("option", "HTMLOptionElement", 1);
    option.selected = false;
    option.value = "";
    return option;
}

function buildSelectElement() {
    return buildBaseNode("select", "HTMLSelectElement", 1);
}

function buildTextAreaElement() {
    const textarea = buildBaseNode("textarea", "HTMLTextAreaElement", 1);
    textarea.value = "";
    return textarea;
}

function buildIFrameElement() {
    const iframe = buildBaseNode("iframe", "HTMLIFrameElement", 1);
    iframe.contentWindow = null;
    iframe.contentDocument = null;
    return iframe;
}

function buildGenericElement(tagName, toStringTag) {
    return buildBaseNode(tagName, toStringTag, 1);
}

function buildElement(tagName) {
    const lower = String(tagName).toLowerCase();
    let element;
    switch (lower) {
        case "a":
            element = buildAnchorElement();
            break;
        case "input":
            element = buildInputElement();
            break;
        case "form":
            element = buildFormElement();
            break;
        case "option":
            element = buildOptionElement();
            break;
        case "select":
            element = buildSelectElement();
            break;
        case "textarea":
            element = buildTextAreaElement();
            break;
        case "iframe":
            element = buildIFrameElement();
            break;
        case "script":
            element = buildGenericElement("script", "HTMLScriptElement");
            break;
        case "meta":
            element = buildGenericElement("meta", "HTMLMetaElement");
            break;
        case "style":
            element = buildGenericElement("style", "HTMLStyleElement");
            break;
        case "fieldset":
            element = buildGenericElement("fieldset", "HTMLFieldSetElement");
            break;
        case "html":
            element = buildGenericElement("html", "HTMLHtmlElement");
            break;
        case "head":
            element = buildGenericElement("head", "HTMLHeadElement");
            break;
        case "body":
            element = buildGenericElement("body", "HTMLBodyElement");
            break;
        case "div":
        default:
            element = buildGenericElement(lower, `HTML${lower.charAt(0).toUpperCase()}${lower.slice(1)}Element`);
            break;
    }
    element.ownerDocument = document;
    return element;
}

function cloneNodeLike(node, deep) {
    let cloned;
    if (node.nodeType === 3) {
        cloned = buildTextNode(node.data || "");
    } else if (node.nodeType === 11) {
        cloned = buildDocumentFragment();
    } else {
        cloned = buildElement(node._tagName || "div");
    }

    Object.keys(node.attributes || {}).forEach((key) => {
        cloned.attributes[key] = node.attributes[key];
    });

    [
        "id",
        "name",
        "type",
        "value",
        "checked",
        "selected",
        "action",
        "content",
        "textContent",
        "innerText",
        "_innerHTML",
        "_normalizedInnerHTML",
        "_href",
        "protocol",
        "host",
        "hostname",
        "port",
        "pathname",
        "search",
        "hash",
        "origin"
    ].forEach((key) => {
        if (key in node) {
            cloned[key] = node[key];
        }
    });

    if (node.style) {
        cloned.style = cloneStyle(node.style);
    }

    if (deep && node._children) {
        node._children.forEach((child) => {
            appendNode(cloned, cloneNodeLike(child, true));
        });
    }

    return cloned;
}

function createStorage(className) {
    const store = Object.create(null);
    const storage = {};
    setTag(storage, "Storage");
    storage.getItem = makeFunction("getItem", function (key) {
        key = String(key);
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    });
    storage.setItem = makeFunction("setItem", function (key, value) {
        key = String(key);
        const stringValue = String(value);
        store[key] = stringValue;
        storage[key] = stringValue;
    });
    storage.removeItem = makeFunction("removeItem", function (key) {
        key = String(key);
        delete store[key];
        delete storage[key];
    });
    storage.clear = makeFunction("clear", function () {
        Object.keys(store).forEach((key) => {
            delete store[key];
            delete storage[key];
        });
    });
    defineGetter(storage, "length", function () {
        return Object.keys(store).length;
    });
    storage["__#classType"] = className;
    return storage;
}

meta_content = "LekG0o6srYiFch3.TFsGtOHiuyHjcdLy4A2wIJ_.74yRUH1zIqvvNOzf7c3STYfyMQhXgoqEf2wDPmCtocvFcxFZDhrDSQTEmnCLxz3jD8CIBn9NlaKRqG";

delete __filename;
delete __dirname;

location = {
    hash: "#category=yp",
    host: "www.nmpa.gov.cn",
    hostname: "www.nmpa.gov.cn",
    href: "https://www.nmpa.gov.cn/datasearch/search-result.html#category=yp",
    origin: "https://www.nmpa.gov.cn",
    pathname: "/datasearch/search-result.html",
    port: "",
    protocol: "https:",
    search: "",
    assign: makeFunction("assign", function (href) {
        applyUrlLike(location, href);
    }),
    replace: makeFunction("replace", function (href) {
        applyUrlLike(location, href);
    }),
    reload: makeFunction("reload", function () {})
};
setTag(location, "Location");

const customElementsRegistry = {};
setTag(customElementsRegistry, "CustomElementRegistry");
customElementsRegistry.define = makeFunction("define", function () {});
customElementsRegistry.get = makeFunction("get", function () {
    return undefined;
});
customElementsRegistry.whenDefined = makeFunction("whenDefined", function () {
    return Promise.resolve();
});
customElementsRegistry.upgrade = makeFunction("upgrade", function () {});

const deprecatedStorageQuota = {
    queryUsageAndQuota: makeFunction("queryUsageAndQuota", function (successCallback) {
        if (typeof successCallback === "function") {
            successCallback(0, 2147483648);
        }
    }),
    requestQuota: makeFunction("requestQuota", function (type, amount, successCallback) {
        if (typeof successCallback === "function") {
            successCallback(amount || 0);
        }
    })
};
setTag(deprecatedStorageQuota, "DeprecatedStorageQuota");

const networkInformation = {
    type: undefined,
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
    saveData: false
};
setTag(networkInformation, "NetworkInformation");

const mimeTypes = makeCollection([], "MimeTypeArray");
const plugins = makeCollection([], "PluginArray");

const batteryManager = {
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1
};
setTag(batteryManager, "BatteryManager");

navigator = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    appVersion: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    platform: "Win32",
    product: "Gecko",
    vendor: "Google Inc.",
    language: "zh-CN",
    languages: ["zh-CN", "zh", "en-US", "en"],
    onLine: true,
    cookieEnabled: true,
    hardwareConcurrency: 12,
    deviceMemory: 8,
    maxTouchPoints: 0,
    webdriver: false,
    standalone: undefined,
    brave: undefined,
    battery: undefined,
    mimeTypes: mimeTypes,
    plugins: plugins,
    connection: networkInformation,
    webkitPersistentStorage: deprecatedStorageQuota,
    sendBeacon: makeFunction("sendBeacon", function () {
        return true;
    }),
    getBattery: makeFunction("getBattery", function () {
        return Promise.resolve(batteryManager);
    }),
    javaEnabled: makeFunction("javaEnabled", function () {
        return false;
    })
};
setTag(navigator, "Navigator");

screen = {
    width: 1536,
    height: 864,
    availWidth: 1536,
    availHeight: 824,
    availLeft: 0,
    availTop: 0,
    colorDepth: 24,
    pixelDepth: 24,
    isExtended: false,
    orientation: {
        angle: 0,
        type: "landscape-primary"
    }
};
setTag(screen, "Screen");

history = {
    state: null,
    length: 2,
    scrollRestoration: "auto",
    back: makeFunction("back", function () {}),
    forward: makeFunction("forward", function () {}),
    go: makeFunction("go", function () {}),
    pushState: makeFunction("pushState", function (state, title, href) {
        history.state = state;
        if (href) {
            applyUrlLike(location, href);
        }
    }),
    replaceState: makeFunction("replaceState", function (state, title, href) {
        history.state = state;
        if (href) {
            applyUrlLike(location, href);
        }
    })
};
setTag(history, "History");

localStorage = createStorage("localStorage");
sessionStorage = createStorage("sessionStorage");

const documentElement = buildElement("html");
const headElement = buildElement("head");
const bodyElement = buildElement("body");
appendNode(documentElement, headElement);
appendNode(documentElement, bodyElement);

const scriptNodes = [];
for (let index = 0; index < 9; index += 1) {
    const scriptNode = buildElement("script");
    scriptNode.parentNode = headElement;
    scriptNode.parentElement = headElement;
    scriptNode.getAttribute = makeFunction("getAttribute", function (attr) {
        if (attr === "r" && index < 2) {
            return "m";
        }
        return null;
    });
    scriptNodes.push(watch(scriptNode, `_script${index}`));
}

const meta0 = buildElement("meta");
meta0.parentNode = headElement;
meta0.parentElement = headElement;
meta0.getAttribute = makeFunction("getAttribute", function (attr) {
    if (attr === "r") {
        return "m";
    }
    return null;
});

const meta1 = buildElement("meta");
meta1.parentNode = headElement;
meta1.parentElement = headElement;
meta1.content = meta_content;
meta1.getAttribute = makeFunction("getAttribute", function (attr) {
    if (attr === "r") {
        return "m";
    }
    return null;
});

const metaNodes = [watch(meta0, "_meta0"), watch(meta1, "_meta1")];
const cookieStore = [];

document = {
    compatMode: "CSS1Compat",
    charset: "UTF-8",
    characterSet: "UTF-8",
    inputEncoding: "UTF-8",
    referrer: "",
    readyState: "complete",
    visibilityState: "visible",
    hidden: false,
    designMode: "off",
    URL: location.href,
    documentURI: location.href,
    baseURI: "https://www.nmpa.gov.cn/",
    defaultView: null,
    documentElement: watch(documentElement, "document.documentElement"),
    head: watch(headElement, "document.head"),
    body: watch(bodyElement, "document.body"),
    implementation: null
};
setTag(document, "HTMLDocument");
createEventTarget(document);

defineGetter(document, "cookie", function () {
    return cookieStore.join("; ");
}, function (value) {
    const cookieLine = String(value).split(";")[0].trim();
    if (!cookieLine) {
        return;
    }
    const cookieName = cookieLine.split("=")[0];
    const index = cookieStore.findIndex((item) => item.split("=")[0] === cookieName);
    if (index === -1) {
        cookieStore.push(cookieLine);
    } else {
        cookieStore[index] = cookieLine;
    }
});

document.createElement = makeFunction("createElement", function (tagName) {
    const element = watch(buildElement(tagName), `document.createElement("${String(tagName).toLowerCase()}")`);
    if (String(tagName).toLowerCase() === "iframe") {
        element.contentWindow = watch({
            navigator: watch(Object.assign({}, navigator), "contentWindow_navigator"),
            document: document,
            top: null,
            self: null
        }, "contentWindow");
        element.contentWindow.top = element.contentWindow;
        element.contentWindow.self = element.contentWindow;
        element.contentDocument = document;
    }
    return element;
});

document.createTextNode = makeFunction("createTextNode", function (text) {
    return watch(buildTextNode(text || ""), `document.createTextNode("${text || ""}")`);
});

document.createDocumentFragment = makeFunction("createDocumentFragment", function () {
    return watch(buildDocumentFragment(), "document.createDocumentFragment()");
});

document.createExpression = makeFunction("createExpression", function () {
    const expression = {
        _ast: undefined,
        toString: makeFunction("toString", function () {
            return "[object XPathExpression]";
        })
    };
    setTag(expression, "XPathExpression");
    return watch(expression, 'document.createExpression("//html","null")');
});

document.createEvent = makeFunction("createEvent", function () {
    const event = {
        type: "",
        timeStamp: 3169.399999976158
    };
    setTag(event, "Event");
    event.initEvent = makeFunction("initEvent", function (type) {
        event.type = type;
    });
    return watch(event, 'document.createEvent("Event")');
});

document.getElementById = makeFunction("getElementById", function (id) {
    if (id === "root-hammerhead-shadow-ui") {
        return null;
    }
    if (idRegistry[id]) {
        return idRegistry[id];
    }
    if (/^[A-Za-z0-9]{12}$/.test(String(id))) {
        return metaNodes[1];
    }
    return null;
});

document.getElementsByTagName = makeFunction("getElementsByTagName", function (tagName) {
    const lower = String(tagName).toLowerCase();
    if (lower === "script") {
        return watch(makeCollection(scriptNodes, "HTMLCollection"), 'document.getElementsByTagName("script")');
    }
    if (lower === "meta") {
        return watch(makeCollection(metaNodes, "HTMLCollection"), 'document.getElementsByTagName("meta")');
    }
    if (lower === "base") {
        return watch(makeCollection([], "HTMLCollection"), 'document.getElementsByTagName("base")');
    }
    const found = [];
    const walk = function (node) {
        (node._children || []).forEach((child) => {
            if (child && child._tagName === lower) {
                found.push(child);
            }
            if (child && child._children) {
                walk(child);
            }
        });
    };
    walk(documentElement);
    return watch(makeCollection(found, "HTMLCollection"), `document.getElementsByTagName("${lower}")`);
});

document.implementation = watch({
    createHTMLDocument: makeFunction("createHTMLDocument", function () {
        const htmlDoc = {
            body: watch(buildElement("body"), "document.implementation.createHTMLDocument().body"),
            head: watch(buildElement("head"), "document.implementation.createHTMLDocument().head"),
            documentElement: watch(buildElement("html"), "document.implementation.createHTMLDocument().documentElement")
        };
        setTag(htmlDoc, "HTMLDocument");
        return watch(htmlDoc, "document.implementation.createHTMLDocument()");
    }),
    hasFeature: makeFunction("hasFeature", function () {
        return true;
    })
}, "document.implementation");

document.defaultView = window;

documentElement.getAttribute = makeFunction("getAttribute", function (name) {
    if (name === "selenium" || name === "driver" || name === "webdriver" || name === "data-kantu" || name === "style") {
        return null;
    }
    return Object.prototype.hasOwnProperty.call(documentElement.attributes, name) ? documentElement.attributes[name] : null;
});

headElement.appendChild = makeFunction("appendChild", function (child) {
    child.parentNode = headElement;
    child.parentElement = headElement;
    registerElementId(child);
    return child;
});
headElement.removeChild = makeFunction("removeChild", function (child) {
    child.parentNode = null;
    child.parentElement = null;
    return child;
});

const chromeObject = {
    app: {},
    runtime: {},
    csi: makeFunction("csi", function () {
        return {};
    }),
    loadTimes: makeFunction("loadTimes", function () {
        return {};
    })
};

window.setTimeout = makeFunction("setTimeout", function (fn) {
    if (typeof fn === "function") {
        fn();
    }
    return 1;
});
window.clearTimeout = makeFunction("clearTimeout", function () {});
window.setInterval = makeFunction("setInterval", function () {
    return 1;
});
window.clearInterval = makeFunction("clearInterval", function () {});
window.requestAnimationFrame = makeFunction("requestAnimationFrame", function (fn) {
    if (typeof fn === "function") {
        fn(Date.now());
    }
    return 1;
});
window.cancelAnimationFrame = makeFunction("cancelAnimationFrame", function () {});
window.DOMParser = makeFunction("DOMParser");
window.XMLHttpRequest = makeFunction("XMLHttpRequest");
window.XMLHttpRequest.prototype.open = makeFunction("open");
window.XMLHttpRequest.prototype.send = makeFunction("send");
window.ActiveXObject = undefined;
window.chrome = watch(chromeObject, "_chrome");
window.open = makeFunction("open", function () {
    return null;
});
window.name = "";
window.status = "";
window.closed = false;
window.length = 0;
window.opener = null;
window.frameElement = null;
window.origin = location.origin;
window.innerWidth = 667;
window.innerHeight = 826;
window.outerWidth = 1536;
window.outerHeight = 912;
window.scrollX = 0;
window.scrollY = 0;
window.pageXOffset = 0;
window.pageYOffset = 0;
window.screenX = 0;
window.screenY = 0;
window.screenLeft = 0;
window.screenTop = 0;
window.devicePixelRatio = 1.25;
window.event = undefined;
window.isSecureContext = true;
window.crossOriginIsolated = false;
window.originAgentCluster = true;
window.credentialless = false;
window.fence = null;
window.indexedDB = watch({}, "indexedDB");
window.customElements = watch(customElementsRegistry, "window.customElements");
window.location = location;
window.document = document;
window.navigator = navigator;
window.localStorage = localStorage;
window.sessionStorage = sessionStorage;
window.screen = screen;
window.history = history;
window.top = window;
window.self = window;
window.parent = window;
window.frames = window;

[
    "onsearch",
    "onappinstalled",
    "onbeforeinstallprompt",
    "onabort",
    "onbeforeinput",
    "onbeforematch",
    "onbeforetoggle",
    "onblur",
    "oncancel",
    "oncanplay",
    "oncanplaythrough",
    "onchange",
    "onclick",
    "onclose",
    "oncontentvisibilityautostatechange",
    "oncontextlost",
    "oncontextmenu",
    "oncontextrestored",
    "oncuechange",
    "ondblclick",
    "ondrag",
    "ondragend",
    "ondragenter",
    "ondragleave",
    "ondragover",
    "ondragstart",
    "ondrop",
    "ondurationchange",
    "onemptied",
    "onended",
    "onerror",
    "onfocus",
    "onformdata",
    "oninput",
    "oninvalid",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onload",
    "onloadeddata",
    "onloadedmetadata",
    "onloadstart",
    "onmousedown",
    "onmouseenter",
    "onmouseleave",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onmousewheel",
    "onpause",
    "onplay",
    "onplaying",
    "onprogress",
    "onratechange",
    "onreset",
    "onresize",
    "onscroll",
    "onscrollend",
    "onsecuritypolicyviolation",
    "onseeked",
    "onseeking",
    "onselect",
    "onslotchange",
    "onstalled",
    "onsubmit",
    "onsuspend",
    "ontimeupdate",
    "ontoggle",
    "onvolumechange",
    "onwaiting",
    "onwebkitanimationend",
    "onwebkitanimationiteration",
    "onwebkitanimationstart",
    "onwebkittransitionend",
    "onwheel",
    "onauxclick",
    "ongotpointercapture",
    "onlostpointercapture",
    "onpointerdown",
    "onpointermove",
    "onpointerup",
    "onpointercancel",
    "onpointerover",
    "onpointerout",
    "onpointerenter",
    "onpointerleave",
    "onselectstart",
    "onselectionchange",
    "onanimationend",
    "onanimationiteration",
    "onanimationstart",
    "ontransitionrun",
    "ontransitionstart",
    "ontransitionend",
    "ontransitioncancel",
    "onbeforexrselect",
    "onafterprint",
    "onbeforeprint",
    "onbeforeunload",
    "onhashchange",
    "onlanguagechange",
    "onmessage",
    "onmessageerror",
    "onoffline",
    "ononline",
    "onpagehide",
    "onpageshow",
    "onpopstate",
    "onrejectionhandled",
    "onstorage",
    "onunhandledrejection",
    "onunload",
    "ondevicemotion",
    "ondeviceorientation",
    "ondeviceorientationabsolute",
    "onpointerrawupdate",
    "onpageswap",
    "onpagereveal",
    "onscrollsnapchange",
    "onscrollsnapchanging"
].forEach((key) => {
    window[key] = null;
});

createEventTarget(window);

window = watch(window, "window");
location = watch(location, "location");
document = watch(document, "document");
navigator = watch(navigator, "navigator");
localStorage = watch(localStorage, "localStorage");
sessionStorage = watch(sessionStorage, "sessionStorage");
screen = watch(screen, "screen");
history = watch(history, "history");

window.location = location;
window.document = document;
window.navigator = navigator;
window.localStorage = localStorage;
window.sessionStorage = sessionStorage;
window.screen = screen;
window.history = history;
window.window = window;
window.top = window;
window.self = window;
window.parent = window;
window.frames = window;

globalThis.window = window;
globalThis.location = location;
globalThis.document = document;
globalThis.navigator = navigator;
globalThis.localStorage = localStorage;
globalThis.sessionStorage = sessionStorage;
globalThis.screen = screen;
globalThis.history = history;

require("./rs6_ts");
require("./rs6_auto");

function get_cookie() {
    return document.cookie;
}

console.log(get_cookie().length);
