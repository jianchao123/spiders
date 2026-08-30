const { collection, HTMLCollection} = require('./HTMLCollection.js');

const process = require("node:process");



!(function () {
    var console_log = console.log;
    watch = function (obj, name) {
        return new Proxy(obj, {
            get(target, p, receiver) {
                if (typeof p === "symbol" || name !== "contentWindow" && p === "Math" || p === "JSON" || p === "RegExp" || p === "atob" || p === "parseInt" || p === "String" || p === "Symbol" || p === "Proxy" || p === "Promise" || p === "Array" || p === "isNaN" || p === "encodeURI" || p === "Uint8Array" || p.toString().indexOf("Symbol(Symbol.") !== -1 || p.toString().indexOf("Symbol(nodejs") !== -1) {
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
                console_log("has", `${name} . ${key.toString()}`);
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
window = globalThis;

// delete global;
delete __dirname;
delete __filename;


// TODO 此处补环境信息


location = {};
document = {};
navigator = {};
localStorage = {};
sessionStorage = {};
screen = {};
history = {};
cache = {};

document.addEventListener = function(event, callback) {};
localStorage.getItem = function(key) {
    return cache[key];
};
 window.addEventListener = function(event, callback) {};
 document.cookie = '';
 location . host = '';
 window.Screen = makeFunction("Screen", function() {debugger;});
 window.MouseEvent = makeFunction("MouseEvent", function() {debugger;});
 window.WebGLRenderingContext  = makeFunction("WebGLRenderingContext", function() {debugger;});
 window.WebGLRenderingContext.getParameter = makeFunction("getParameter", function() {debugger;});
 document.documentElement = watch({}, "documentElement");
 document.documentElement.getAttribute = makeFunction("getAttribute", function(name) {
 
    return cache[name];
});
document.documentElement.toString = makeFunction("toString", function() {
    debugger;
    return "[object HTMLHtmlElement]";
});
Object.defineProperties(document, {
    getElementById: {
        value: function(id) {
            debugger;
            console.log("document.getElementById calling", id);
            return null;
        },
        writable: true,
        configurable: true,
        enumerable: false
    },

    getElementsByTagName: {
        value: function (tagName) {
            debugger;
            console.log(
                "document.getElementsByTagName calling",
                tagName
            );

            return collection;
       
        },
        writable: true,
        configurable: true,
        enumerable: false
    },

    querySelector: {
        value: makeFunction("querySelector"),
        writable: true,
        configurable: true,
        enumerable: false
    },

    querySelectorAll: {
        value: makeFunction("querySelectorAll"),
        writable: true,
        configurable: true,
        enumerable: false
    },

    evaluate: {
        value: makeFunction("evaluate"),
        writable: true,
        configurable: true,
        enumerable: false
    }
});

const originalApply = Function.prototype.apply;
document.documentElement.getAttribute.apply =
    makeFunction("apply", function(thisArg, argsArray) {

        return originalApply.call(
            document.documentElement.getAttribute,
            thisArg,
            argsArray
        );
    });
document.all = watch(collection, "document.all");
document.body = watch(collection[2], "document.body");
document.all.removeChild = makeFunction("removeChild", function(child) {
    debugger;
    console.log("document.all.removeChild calling", child);
    return null;
});
document.body.removeChild = makeFunction("removeChild", function(child) {
    debugger;
    console.log("document.body.removeChild calling", child);
    return null;
});

window = watch(window, "window");
location = watch(location, "location");
document = watch(document, "document");
navigator = watch(navigator, "navigator");
localStorage = watch(localStorage, "localStorage");
sessionStorage = watch(sessionStorage, "sessionStorage");
screen = watch(screen, "screen");
history = watch(history, "history");


require("./raw.js");

console.log(window.mnsv2);
process.exit(0);