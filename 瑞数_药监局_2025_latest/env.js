!(function () {
    var console_log = console.log
    watch = function (obj, name) {
        return new Proxy(obj, {
            get(target, p, receiver) {
                // 过滤没用的信息，不进行打印
                
                if (name!=='contentWindow'&&p === "Math" ||p === "JSON" ||p === "RegExp" ||p === "atob" ||p === "parseInt" ||p === "String" || p === "Symbol" || p === "Proxy" || p === "Promise" || p === "Array" || p === "isNaN" || p === "encodeURI" || p === "Uint8Array" || p.toString().indexOf("Symbol(Symbol.") != -1|| p.toString().indexOf("Symbol(nodejs") != -1) {
                    var val = Reflect.get(...arguments);
                    return val
                }
                // if(p==='readyState'){
                //     debugger
                // }
                else {
                    var val = Reflect.get(...arguments);
                    if (typeof val === 'function') {
                        console_log(`取值:`, name, '.', p, ` =>function`);
                    }
                    else {
                        console_log(`取值:`, name, '.', p, ` =>`, val);
                    }
                    return val
                }
            },
            set(target, p, value, receiver) {
                var val = Reflect.set(...arguments)
                if (typeof value === 'function') {
                    console_log(`设置值:${name}.${p}=>function `,);
                }
                else {
                    console_log(`设置值:${name}.${p}=> `, value);
                }
                return val
            },
            has(target, key) {
                // 在检查属性存在性时输出一条消息
                console_log(`检查属性存在性: ${name}.${key.toString()}`);
                return key in target;
            },
            ownKeys(target){
                // debugger
                console_log(`获取自有属性:${name}`)
                if(name==='contentWindow_navigator'){
                    // debugger
                    return watch([],'contentWindow_navigator自有属性')
                }
                // if(name==='contentWindow'){
                //     debugger
                //     return watch([],'contentWindow_navigator自有属性')
                // }
                return Reflect.ownKeys(target)
            }
        })
    }
})();
(() => {
    const $toString = Function.toString;
    const myFunction_toString_symbol = Symbol('('.concat('', ')_'));
    const myToString = function toString() {
        return typeof this == 'function' && this[myFunction_toString_symbol] || $toString.call(this);
    };

    function set_native(func, key, value) {
        Object.defineProperty(func, key, {
            "enumerable": false,
            "configurable": true,
            "writable": true,
            "value": value
        })
    }

    delete Function.prototype['toString'];

    set_native(Function.prototype, "toString", myToString);

    set_native(Function.prototype.toString, myFunction_toString_symbol, "function toString() { [native code] }");

    //让动态创建的函数看起来像原生代码 避免通过 toString() 暴露函数源代码
    safeFunction = (func) => {
        set_native(func, myFunction_toString_symbol, `function ${func.name}() { [native code] }`);
    };
}).call();

function makeFunction(name) {
    // 动态创建一个函数
    var func = new Function(`
        return function ${name}(arg) {
        // debugger
        console.log('makeFunction函数传参.${name}',...arguments)
        }
    `)();
    safeFunction(func)
    func.prototype = watch(func.prototype, `makeFunction方法原型:${name}.prototype`)
    func = watch(func, `makeFunction方法本身:${name}`)
    return func;
};

window = globalThis;
delete __filename;
delete __dirname;

window.DOMParser = makeFunction('DOMParser');
window.ActiveXObject = undefined;
window.name = '';
window.indexedDB = watch({}, 'indexedDB');
window.addEventListener = function (name, func) {  };
window.XMLHttpRequest = makeFunction('XMLHttpRequest');
window.XMLHttpRequest.prototype.open = makeFunction('open');
window.XMLHttpRequest.prototype.send = makeFunction('send');
window.chrome = watch({}, '_chrome');
window.open = makeFunction('open');
/******************************** location ********************************/
location = {
    hash: "",
    host: "www.nmpa.gov.cn",
    hostname: "www.nmpa.gov.cn",
    href: "https://www.nmpa.gov.cn/datasearch/search-result.html",
    origin: "https://www.nmpa.gov.cn",
    pathname: "/datasearch/search-result.html",
    port: "",
    protocol: "https:",
    search: "",
};

var _script0 = watch({
    getAttribute: function (attr) {
        if (attr === 'r') {
            return "m"
        }
        debugger
    },
    parentElement: watch({
        removeChild: function (child) {
            return child;
        }
    }, '_script0.parentElement'),

}, '_script0');

var _script1 = watch({
    getAttribute: function (attr) {
        if (attr === 'r') {
            return "m"
        }
        debugger
    },
    parentElement: watch({
        removeChild: function (child) {
            return child;
        }
    }, '_script1.parentElement'),

}, '_script1');

var _meta0 = watch({
    getAttribute: function (attr) {
        if (attr === 'r') {       
            return 'm'
        }
        debugger
    },
    parentNode: watch({
        removeChild: function (child) {
            return child;
        }
    }, "_meta0.parentNode")
},'_meta0');

var _meta1 = watch({
    getAttribute: function (attr) {
        if (attr === 'r') {       
            return 'm'
        }
        debugger
    },
    parentNode: watch({
        removeChild: function (child) {
            return child;
        }
    }, 
    "_meta1.parentNode"),
    content: 'sPTJx7esxKTAigJwOGaIJdekhdXcTzlTI62D.NsaojEhpUe9Wt.4apZ5aMf4X9v.',

},'_meta1');

/******************************** document ********************************/
document = {
    createElement: function (tagName) {
        if (tagName === 'div') {
            let _div = {
                getElementsByTagName: function (tagName) {
                    if(tagName==='i'){
                       let _i = []
                       _i = watch(_i,'getElementsByTagName.i')
                       return _i
                    }
                    debugger

                }
            }
            _div = watch(_div, 'div');
            return _div;
        }
        if (tagName === 'a') {
            let _a = {};
            _a = watch(_a, 'a');
            return _a;
        }
        debugger
    },
    getElementsByTagName: function (tagName) {
        if (tagName === 'script') {
            let _script = [_script0, _script1];
            _script = watch(_script, 'script');
            return _script;
        }
        if(tagName === 'meta'){
            let _meta = [_meta0,_meta1];
            _meta = watch(_meta, 'meta');
            return _meta;
        }
        if(tagName==='base'){
            return [];
        }
        debugger;
    },
    appendChild: function (child) {
        debugger
        console.log('appendChild', child);
    },
    removeChild: function (child) {
        debugger
        console.log('removeChild', child);
        return child;
    },
    documentElement: watch({
        style: watch({}, '_documentElement.style'),
    }, '_documentElement'),
    getElementById : function (id) {
        if(id === 'root-hammerhead-shadow-ui') {
            return null;
        }
        if(id==='a'){
            let _a = {};
            _a = watch(_a, '_getElementById.a');
            return _a;
        }
        debugger
    },
    visibilityState: 'visible',
    cookie: '',
};
navigator = {};

/******************************** localStorage ********************************/
localStorage = {
    removeItem: function (key) {
        delete this[key];
    },
    getItem: function (key) {
        return this[key];
    }
};

/******************************** sessionStorage ********************************/
sessionStorage = {
    getItem: function (key) {
        return this[key];
    }
};

/******************************** screen ********************************/
screen = {};

/******************************** history ********************************/
history = {};

window = watch(window, 'window');
location = watch(location, 'location');
document = watch(document, 'document');
navigator = watch(navigator, 'navigator');
localStorage = watch(localStorage, 'localStorage');
sessionStorage = watch(sessionStorage, 'sessionStorage');
screen = watch(screen, 'screen');
history = watch(history, 'history');
window.top = window;
window.self = window;


require('./rs6_ts');
require('./rs6_auto');


content="sPTJx7esxKTAigJwOGaIJdekhdXcTzlTI62D.NsaojEhpUe9Wt.4apZ5aMf4X9v."