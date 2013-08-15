/*! Grape.js JavaScript game engine | (c) 2013 Zoltan Mihalyi. | https://github.com/zoltan-mihalyi/grape/blob/master/MIT-LICENSE.txt*/

(function(nodeRequire) {
    var require, define;
    (function() {
        var defined = {}, waiting = {}, hasOwn = Object.prototype.hasOwnProperty, hasProp = function(obj, prop) {
            return hasOwn.call(obj, prop);
        };
        define = function(name, deps, callback) {
            if (hasProp(defined, name) || hasProp(waiting, name)) throw "Already defined: " + name;
            waiting[name] = [ deps, callback ];
        };
        var loadTree = function(name) {
            var w, deps, args, i;
            if (!hasProp(defined, name) && hasProp(waiting, name)) {
                w = waiting[name];
                deps = w[0];
                args = [];
                for (i = 0; deps.length > i; ++i) {
                    loadTree(deps[i]);
                    args[i] = defined[deps[i]];
                }
                defined[name] = w[1].apply({}, args);
            }
        };
        require = function(dep, callback) {
            loadTree(dep);
            callback && callback(defined[dep]);
        };
    })();
    define("../js/grape/dependency", function() {});
    define("core/logger", [], function() {
        return {
            log: "undefined" != typeof console && console.log ? function() {
                return Function.prototype.apply.call(console.log, console, arguments);
            } : function() {},
            warning: "undefined" != typeof console && console.warn ? function() {
                return Function.prototype.apply.call(console.warn, console, arguments);
            } : function() {},
            error: function(message) {
                throw message;
            }
        };
    });
    define("utils/trim", [], function() {
        return function(str) {
            return str.replace(/^\s+|\s+$/g, "");
        };
    });
    define("utils/format", [], function() {
        return function(str, substitute) {
            var i, o;
            substitute && substitute.constructor === Object || substitute instanceof Array || (substitute = Array.prototype.slice.call(arguments, 1));
            if (substitute instanceof Array) {
                o = {};
                for (i = substitute.length; --i >= 0; ) o["%" + (i + 1)] = substitute[i] + "";
                substitute = o;
            }
            for (i in substitute) substitute.hasOwnProperty(i) && (str = str.replace(i, substitute[i]));
            return str;
        };
    });
    define("utils/has-prop", [], function() {
        var hasProp = Object.prototype.hasOwnProperty;
        return function(obj, prop) {
            return hasProp.call(obj, prop);
        };
    });
    define("utils/unique-generator", [], function() {
        return {
            create: function(prefix) {
                var uniqueId = 0;
                return function() {
                    uniqueId++;
                    return prefix + uniqueId;
                };
            }
        };
    });
    define("core/component", [ "core/logger", "utils/trim", "utils/format", "utils/has-prop", "utils/unique-generator" ], function(Logger, trim, format, hasProp, UniqueGenerator, undefined) {
        function Component() {}
        function component(name, inherited, eventListeners, methods, modifiers) {
            var i;
            if ("object" == typeof name && null !== name) {
                inherited = name.inherited;
                eventListeners = name.events || name.eventListeners;
                methods = name.methods;
                modifiers = name.modifiers;
                name = name.name;
            }
            name || (name = unique());
            "string" == typeof name && name.match(/^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$/) || Logger.error(format(BAD_NAME, name));
            components[name] !== undefined && Logger.error(format(ALREADY_DEFINED, name));
            if ("object" == typeof inherited && null !== inherited && !(inherited instanceof Array)) return component(name, "", inherited, eventListeners, methods);
            null === inherited || inherited === undefined ? inherited = [] : "string" == typeof inherited && (inherited = inherited.split(","));
            for (i = 0; inherited.length > i; ++i) {
                inherited[i] = trim(inherited[i]);
                "" === inherited[i] ? inherited.splice(i, 1) : components[inherited[i]] === undefined && Logger.error(format(NOT_DEFINED, inherited[i]));
            }
            "object" != typeof eventListeners && (eventListeners = {});
            "object" != typeof methods && (methods = {});
            "object" != typeof modifiers && (modifiers = {});
            return checkedComponent(name, inherited, eventListeners, methods, modifiers);
        }
        function getAllInherited(names, all, added, notNecessary) {
            var i, max, reqName, comp;
            if (!all) {
                notNecessary = {};
                for (i = 0; names.length > i; ++i) notNecessary[names[i]] = !0;
                all = [];
                added = {};
            }
            for (i = 0, max = names.length; max > i; ++i) {
                reqName = names[i];
                comp = components[reqName].prototype.Component;
                if (added[reqName]) notNecessary[reqName] && Logger.error(format(INHERITED_TWICE, reqName)); else {
                    getAllInherited(comp.inherited, all, added, notNecessary);
                    all.push(reqName);
                    added[reqName] = !0;
                }
            }
            return all;
        }
        function decompose(block, target, prefix) {
            var i;
            for (i in block) hasProp(block, i) && ("object" == typeof block[i] ? decompose(block[i], target, prefix + i + ".") : target[prefix + i] = block[i]);
            return target;
        }
        function decomposeBlockEvents(eventListeners) {
            return decompose(eventListeners, {}, "");
        }
        function hasAbstractModifier(modifiers) {
            var i;
            for (i in modifiers) if (hasProp(modifiers, i) && isAbstractModifier(modifiers[i])) return !0;
            return !1;
        }
        function createComponentConstructor(name, isAbstract) {
            var component = null;
            component = isAbstract ? function() {
                Logger.error(format(ABSTRACT_INSTANTIATION, name));
            } : Function("", 'this["' + name + '"]=function(){}; return this["' + name + '"];').call({});
            component.prototype = new Component();
            component.prototype.constructor = component;
            return component;
        }
        function optimizeDispatch(component, allEventListener) {
            var ev, j, max, dispatch = "", evId = 0;
            for (ev in allEventListener) if (hasProp(allEventListener, ev)) {
                dispatch += "case '" + ev.replace("'", "\\'") + "':\n";
                for (j = 0, max = allEventListener[ev].length; max > j; ++j) {
                    component.prototype["e_" + evId + "_" + j] = allEventListener[ev][j];
                    dispatch += "	this.e_" + evId + "_" + j + "(d);\n";
                }
                dispatch += "	break;\n";
                evId++;
            }
            "" !== dispatch && (dispatch = "switch(e){\n" + dispatch + "}");
            component.prototype.Component.dispatch = component.prototype.dispatch = Function("e,d", dispatch + "\nreturn this;");
            component.prototype.Component.dispatchWithLocal = Function("e,d", dispatch + "\nthis._localDispatch(e,d);\nreturn this;");
        }
        function addOwnMethods(component, methods, inheritedModifiers, modifierSources) {
            var i;
            for (i in methods) if (hasProp(methods, i)) {
                "Component" === i && Logger.error(COMPONENT_IS_RESERVED);
                i in Component.prototype && Logger.error(format(RESERVED_METHOD_NAME, i));
                inheritedModifiers[i] === !1 && Logger.error(format(OVERRIDING_FINAL_METHOD, modifierSources[i] + "." + i));
                component.prototype[i] = methods[i];
            }
        }
        function isFinalModifier(modifier) {
            return modifier === !1;
        }
        function isAbstractModifier(modifier) {
            return modifier === !0;
        }
        function checkedComponent(name, inherited, eventListeners, methods, modifiers) {
            var component, i, max, im, iComp, iName, iMethods, iModifiers, allInherited = getAllInherited(inherited), isAbstract = hasAbstractModifier(modifiers), inheritedSet = {}, allEvents = {}, eventNames = [], inheritedModifiers = {}, modifierSources = {}, methodSources = {};
            for (i = 0, max = allInherited.length; max > i; ++i) {
                inheritedSet[allInherited[i]] = !0;
                iComp = components[allInherited[i]];
                for (var ev in iComp.prototype.Component.events) if (hasProp(iComp.prototype.Component.events, ev)) {
                    allEvents[ev] = allEvents[ev] || [];
                    allEvents[ev].push(iComp.prototype.Component.events[ev]);
                }
            }
            eventListeners = decomposeBlockEvents(eventListeners);
            for (i in eventListeners) if (hasProp(eventListeners, i)) {
                allEvents[i] = allEvents[i] || [];
                allEvents[i].push(eventListeners[i]);
            }
            for (i in allEvents) hasProp(allEvents, i) && eventNames.push(i);
            component = createComponentConstructor(name, isAbstract);
            component.prototype.Component = {
                name: name,
                inherited: allInherited,
                inheritedAndMe: allInherited.concat(name),
                inheritedSet: inheritedSet,
                events: eventListeners,
                allEvents: allEvents,
                eventNames: eventNames,
                methods: methods,
                modifiers: modifiers
            };
            component.prototype.Component.dispatch = component.prototype.dispatch = function(event, data) {
                var i, max, evs = allEvents[event];
                if (evs) for (i = 0, max = evs.length; max > i; ++i) evs[i].call(this, data);
                return this;
            };
            component.prototype.Component.dispatchWithLocal = function(event, data) {
                var i, max, evs = allEvents[event];
                if (evs) for (i = 0, max = evs.length; max > i; ++i) evs[i].call(this, data);
                this._localDispatch(event, data);
                return this;
            };
            optimizeDispatch(component, allEvents);
            for (i = 0; allInherited.length > i; ++i) {
                iName = allInherited[i];
                iComp = components[iName].prototype.Component;
                iMethods = iComp.methods;
                iModifiers = iComp.modifiers;
                for (im in iMethods) if (hasProp(iMethods, im)) {
                    isFinalModifier(inheritedModifiers[im]) && Logger.error(format(OVERRIDING_FINAL_METHOD_BY_INHERITING_METHOD, modifierSources[im] + "." + im, iName + "." + im));
                    component.prototype[im] = iMethods[im];
                    methodSources[im] = iName;
                }
                for (im in iModifiers) if (hasProp(iModifiers, im)) if (isFinalModifier(iModifiers[im])) {
                    inheritedModifiers[im] = !1;
                    modifierSources[im] = iName;
                } else if (isAbstractModifier(iModifiers[im]) && inheritedModifiers[im] === undefined) {
                    inheritedModifiers[im] = !0;
                    modifierSources[im] = iName;
                }
            }
            addOwnMethods(component, methods, inheritedModifiers, modifierSources);
            for (i in inheritedModifiers) hasProp(inheritedModifiers, i) && isAbstractModifier(inheritedModifiers[i]) && (component.prototype[i] !== undefined || isAbstractModifier(modifiers[i]) || Logger.error(format(MISSING_IMPLEMENTATION, modifierSources[i] + "." + i)));
            for (i in modifiers) hasProp(modifiers, i) && (isAbstractModifier(modifiers[i]) ? component.prototype[i] !== undefined && (methodSources[i] ? Logger.error(format(ABSTRACT_FAIL_INHERITED, name + "." + i, methodSources[i] + "." + i)) : Logger.error(format(ABSTRACT_FAIL_OWN, name + "." + i))) : component.prototype[i] === undefined && Logger.error(format(FINAL_FAIL, name + "." + i)));
            components[name] = component;
            return name;
        }
        var ALREADY_DEFINED = 'Component "%1" already defined!', BAD_NAME = 'Component name "%1" is not valid. Use alphanumeric characters, and dots as separator! E.g. "BigRedBall" or "2D.Box"', NOT_DEFINED = 'Component "%1" is not defined!', INHERITED_TWICE = 'Component "%1" is twice in the "inherited" list or implied by an other component!', ABSTRACT_INSTANTIATION = 'Abstract component "%1" cannot be instantiated.', OVERRIDING_FINAL_METHOD_BY_INHERITING_METHOD = "Final method %1 cannot be overridden by inheriting %2", OVERRIDING_FINAL_METHOD = "Final %1 cannot be overridden!", COMPONENT_IS_RESERVED = "Component is a reserved property name.", RESERVED_METHOD_NAME = 'Reserved method name "%1" cannot be overridden.', MISSING_IMPLEMENTATION = "Component does not implement or mark abstract method %1", ABSTRACT_FAIL_INHERITED = "Method %1 cannot be marked abstract because it is inherited from %2", ABSTRACT_FAIL_OWN = "Component has an abstract marker on an implemented method: %1", FINAL_FAIL = "Component has a final marker on a non existing method: %1", NO_LOCAL_EVENTS = "Instance does not have local events", NO_LOCAL_EVENTS_FOR_EVENT = 'Instance does not have local handlers for "%1"', NON_INHERITED_SUPER_CALL = "Can not call super on non-inherited component.", components = {}, unique = UniqueGenerator.create("AnonymusComponent");
        Component.prototype = {
            dispatch: function(event, data) {
                throw event + data;
            },
            _localDispatch: function(event, data) {
                var i, c;
                event = this._localEvents[event];
                if (event !== undefined) for (i = 0; c = event[i]; ++i) c.call(this, data);
            },
            bind: function(event, callback) {
                var evs;
                if (!this._localEvents) {
                    this._localEvents = {};
                    this._localEventNumber = 0;
                    this.dispatch = this.Component.dispatchWithLocal;
                }
                if ((evs = this._localEvents[event]) === undefined) {
                    evs = this._localEvents[event] = [];
                    this.Component.allEvents[event] === undefined && (evs.subscribe = this._subscribe(event));
                }
                evs.push(callback);
                ++this._localEventNumber;
                return this;
            },
            unbind: function(event, callback) {
                var i, es, found = !1;
                this._localEvents || Logger.error(NO_LOCAL_EVENTS);
                (es = this._localEvents[event]) === undefined && (es = []);
                for (i = es.length; --i >= 0; ) if (es[i] === callback) {
                    found = !0;
                    if (1 === es.length) {
                        this.Component.allEvents[event] === undefined && this._unsubscribe(es.subscribe);
                        delete this._localEvents[event];
                    } else es.splice(i, 1);
                    if (0 === --this._localEventNumber) {
                        delete this._localEvents;
                        this.dispatch = this.Component.dispatch;
                    }
                }
                found || Logger.error(format(NO_LOCAL_EVENTS_FOR_EVENT, event));
                return this;
            },
            inherits: function(componentName) {
                return this.Component.inheritedSet[componentName] !== undefined;
            },
            sup: function(comp, method) {
                var t = this;
                this.Component.inheritedSet[comp] === undefined && Logger.error(NON_INHERITED_SUPER_CALL);
                method = components[comp].prototype[method];
                return function() {
                    return method.apply(t, arguments);
                };
            },
            _subscribe: function(event) {
                throw event;
            },
            _unsubscribe: function(subscription) {
                throw subscription;
            }
        };
        component.fn = Component.prototype;
        component._reset = function() {
            components = {};
        };
        component.get = function(name) {
            return components[name] || Logger.error(format(NOT_DEFINED, name));
        };
        return component;
    });
    define("core/canvas", [], function() {
        var toRender, canvases, Canvas = {
            z: 0,
            alpha: 1,
            color: "#000",
            rectangle: function() {
                toRender.push([ "rectangle", arguments ]);
            },
            sprite: function() {
                toRender.push([ "sprite", arguments ]);
            },
            text: function() {
                toRender.push([ "text", arguments ]);
            },
            background: function() {
                toRender.push([ "background", arguments ]);
            }
        };
        return {
            Public: Canvas,
            Protected: {
                init: function() {},
                clearViewElements: function() {
                    canvases = [];
                },
                createViewElement: function(id, viewElement) {
                    var canvas = document.createElement("canvas");
                    canvas.style.width = "100%";
                    canvas.style.height = "100%";
                    viewElement.appendChild(canvas);
                    canvases[id] = canvas;
                },
                beforeCollect: function() {
                    toRender = [];
                },
                afterCollect: function() {},
                beforeCollectViews: function() {},
                beforeCollectView: function() {},
                afterCollectView: function() {},
                afterRecalculate: function() {},
                renderFirstAutoRendered: function() {},
                renderOtherAutoRendered: function() {},
                renderView: function() {}
            }
        };
    });
    define("core/settings", [], function() {
        return {
            gridSize: 64,
            headless: !1,
            autoLoad: !0
        };
    });
    define("core/system", [ "core/component", "core/logger", "core/settings", "utils/has-prop" ], function(component, Logger, Settings, hasProp) {
        var System, ALREADY_STARTED = "Game already started!", started = !1;
        component("System", {}, {
            start: function(container, scene, settings) {
                var i;
                if (started) Logger.error(ALREADY_STARTED); else {
                    started = !0;
                    settings = settings || {};
                    settings.container = container;
                    settings.scene = scene;
                    for (i in settings) hasProp(settings, i) && (Settings[i] = settings[i]);
                    System.dispatch("init");
                    Settings.autoLoad ? System.dispatch("startLoad") : System.dispatch("start");
                }
            },
            frame: function() {
                this.dispatch("beginFrame");
                this.dispatch("handleInput");
                this.dispatch("frame");
                this.dispatch("physics");
                this.dispatch("collision");
                this.dispatch("endFrame");
            }
        });
        System = component.get("System");
        System.prototype._subscribe = function() {};
        System = new System();
        return System;
    });
    define("core/loader", [ "core/logger", "core/system", "utils/format", "utils/has-prop" ], function(Logger, System, format, hasProp) {
        function loadAll(callback) {
            function finish() {
                --remaining;
                System.dispatch();
                System.dispatch("loadingProcess", {
                    name: "all",
                    percent: 100 * ((allFiles - remaining - 1) / (allFiles - 1))
                });
                if (0 === remaining) {
                    System.dispatch("loadingComplete", "all");
                    callback();
                }
            }
            callback = callback || function() {};
            var type, url, dataList, allFiles = 1, remaining = 1;
            for (type in loadSet) if (hasProp(loadSet, type)) {
                cache[type] = cache[type] || {};
                for (url in loadSet[type]) if (hasProp(loadSet[type], url)) {
                    dataList = loadSet[type][url];
                    if (cache[type][url]) createLoadSuccessHandler(type, url, dataList)(); else {
                        ++allFiles;
                        ++remaining;
                        types[type].loader(url, createLoadSuccessHandler(type, url, dataList, finish));
                    }
                }
            }
            finish();
        }
        var ALREADY_ADDED = 'Type "%1" already added!', types = {}, loadSet = {}, cache = {}, process = function(processor, loadData, dataList, type) {
            var i;
            for (i = dataList.length; --i >= 0; ) {
                processor(dataList[i], loadData);
                System.dispatch("resourceProcessed." + type, dataList[i]);
            }
        }, createLoadSuccessHandler = function(type, url, dataList, finish) {
            return function(loadData) {
                finish && (cache[type][url] = loadData);
                process(types[type].processor, loadData, dataList, type);
                finish && finish();
            };
        };
        System.bind("startLoad", function() {
            loadAll(function() {
                System.dispatch("start");
            });
        });
        return {
            register: function(type, loader, processor) {
                hasProp(types, type) && Logger.error(format(ALREADY_ADDED, type));
                types[type] = {
                    loader: loader,
                    processor: processor
                };
            },
            add: function(type, url, data) {
                hasProp(loadSet, type) || (loadSet[type] = {});
                hasProp(loadSet[type], url) || (loadSet[type][url] = []);
                loadSet[type][url].push(data);
            },
            loadAll: loadAll
        };
    });
    define("utils/environment", [], function() {
        var environment = {};
        if ("undefined" != typeof window && window.document !== void 0) environment.browser = !0; else {
            if ("object" != typeof process || "object" != typeof process.env) throw "Failed to determine environment!";
            environment.node = !0;
        }
        environment.canvas = "function" == typeof document.createElement("canvas").getContext;
        environment.canvas = !1;
        environment.mobile = function() {
            try {
                document.createEvent("TouchEvent");
                return !0;
            } catch (e) {
                return !1;
            }
        }();
        environment.audio = environment.browser ? window.Audio !== void 0 : !1;
        environment.webAudio = window.webkitAudioContext !== void 0;
        return environment;
    });
    define("utils/extend", [ "utils/has-prop" ], function(hasProp) {
        return function(original, extra) {
            var i;
            for (i in extra) hasProp(extra, i) && (original[i] = extra[i]);
        };
    });
    define("core/sprite", [ "core/logger", "core/loader", "utils/environment", "utils/extend", "utils/format", "utils/unique-generator" ], function(Logger, Loader, Environment, extend, format, UniqueGenerator, undefined) {
        function createSprite(url, name, settings) {
            var def = {
                left: 0,
                top: 0,
                subimages: 1,
                originX: 0,
                originY: 0,
                width: undefined,
                height: undefined,
                leftBounding: 0,
                topBounding: 0,
                rightBounding: undefined,
                bottomBounding: undefined
            };
            settings === undefined && (settings = 1);
            "number" == typeof settings && (settings = {
                subimages: settings
            });
            extend(def, settings);
            def.url = url;
            def.name = name;
            return def;
        }
        function sprite(name, url, options) {
            var spr;
            if (url === undefined) {
                if (spr = sprites[name]) return spr;
                Logger.error('Sprite "' + name + '" does not exists.');
                return null;
            }
            name || (name = unique());
            name.match(/^[a-z0-9][a-zA-Z0-9_]*$/) || Logger.error(format(INVALID_NAME, name));
            Loader.add("sprite", url, sprites[name] = createSprite(url, name, options));
            return name;
        }
        var INVALID_NAME = 'Sprite name "%1" is invalid. camelCase format is allowed with digits anywhere.', FAILED_TO_LOAD = "Failed to load sprite from URL: %1", sprites = {}, unique = UniqueGenerator.create("anonymus_sprite"), processImage = function(spr, loadData) {
            var width = loadData.width, height = loadData.height;
            spr.width === undefined && (spr.width = width / spr.subimages);
            spr.height === undefined && (spr.height = height);
            spr.rightBounding === undefined && (spr.rightBounding = spr.width);
            spr.bottomBounding === undefined && (spr.bottomBounding = spr.height);
        }, loader = function() {
            var fs;
            if (Environment.browser) return function(url, finish) {
                var img = document.createElement("img");
                img.onerror = function() {
                    Logger.error(format(FAILED_TO_LOAD, url));
                };
                img.onload = function() {
                    finish({
                        width: img.width,
                        height: img.height
                    });
                };
                img.src = url;
            };
            fs = nodeRequire("fs");
            return function(url, finish) {
                fs.read(url, function(err, data) {
                    var img = data;
                    err && Logger.error(format(FAILED_TO_LOAD, url));
                    finish({
                        width: img.width,
                        height: img.height
                    });
                });
            };
        }();
        Loader.register("sprite", loader, processImage);
        return sprite;
    });
    define("utils/dom-utils", [ "utils/environment", "utils/extend" ], function(environment, extend, undefined) {
        function getRealEvent(event) {
            return event ? event : window.event;
        }
        var bind, unbind, contains, fireEvent;
        if (!environment.browser) return null;
        if ("function" == typeof window.addEventListener) {
            bind = function(el, ev, fn) {
                el.addEventListener(ev, fn, !1);
            };
            unbind = function(el, ev, fn) {
                el.removeEventListener(ev, fn, !1);
            };
        } else if (document.attachEvent) {
            bind = function(el, ev, fn) {
                el.attachEvent("on" + ev, fn);
            };
            unbind = function(el, type, fn) {
                el.detachEvent("on" + type, fn);
            };
        }
        document.documentElement.contains ? contains = function(a, b) {
            return 9 !== b.nodeType && a !== b && (a.contains ? a.contains(b) : !0);
        } : document.documentElement.compareDocumentPosition && (contains = function(a, b) {
            return !!(16 & a.compareDocumentPosition(b) + 0);
        });
        fireEvent = document.createEvent ? function(element, name, data) {
            var event = document.createEvent("HTMLEvents");
            event.initEvent(name, !0, !0);
            event.eventName = name;
            extend(event, data || {});
            element.dispatchEvent(event);
        } : function(element, name, data) {
            var event = document.createEventObject();
            event.eventType = name;
            event.eventName = name;
            extend(event, data || {});
            element.fireEvent("on" + event.eventType, event);
        };
        return {
            bind: bind,
            unbind: unbind,
            contains: contains,
            getRealEvent: getRealEvent,
            fireEvent: fireEvent,
            getTarget: function(event) {
                return event ? event.target ? event.target : event.srcElement : window.event.srcElement;
            },
            getKeyCode: function(event) {
                event = getRealEvent(event);
                return event.which !== undefined ? event.which : event.keyCode;
            },
            preventDefault: function(event) {
                event = getRealEvent(event);
                event.preventDefault ? event.preventDefault() : event.returnValue = !1;
            },
            createStyle: function(css) {
                var style = document.createElement("style");
                style.type = "text/css";
                style.styleSheet ? style.styleSheet.cssText = css : style.appendChild(document.createTextNode(css));
                document.getElementsByTagName("head")[0].appendChild(style);
                return style;
            },
            hasClass: function(element, name) {
                name = " " + name + " ";
                return -1 !== (" " + element.className.replace(/[\t\r\n]/g, " ") + " ").indexOf(name);
            }
        };
    });
    define("core/dom", [ "core/sprite", "core/system", "utils/dom-utils" ], function(sprite, System, DomUtils, undefined) {
        function applyStyles(target, styles) {
            for (var style, nodeStyle, spr, nodes = target.childNodes, i = 0, max = styles.length; max > i; ++i) {
                style = styles[i];
                nodeStyle = nodes[i].style;
                nodeStyle.left = style[1] + "px";
                nodeStyle.top = style[2] + "px";
                nodeStyle.zIndex = style[3];
                nodeStyle.opacity = style[4];
                switch (style[0]) {
                  case 0:
                    nodeStyle.width = style[5] + "px";
                    nodeStyle.height = style[6] + "px";
                    nodeStyle.backgroundColor = style[7];
                    nodeStyle.borderColor = style[8];
                    nodeStyle.borderWidth = style[9] + "px";
                    nodeStyle.borderStyle = style[10];
                    break;

                  case 1:
                    spr = sprite(style[5]);
                    nodeStyle.backgroundPosition = -spr.left - (style[6] >> 0) * spr.width + "px " + -spr.top + "px";
                    break;

                  case 2:
                    nodeStyle.color = style[5];
                    nodeStyle.fontSize = style[6] + "px";
                    if (style[7] && "left" !== style[7]) {
                        nodeStyle.textAlign = style[7];
                        nodeStyle.left = style[1] - ("center" === style[7] ? 5e3 : 1e4) + "px";
                        nodeStyle.width = "10000px";
                    }
                    break;

                  case 3:
                    nodeStyle.width = style[5] + "px";
                    nodeStyle.height = style[6] + "px";
                }
            }
        }
        var htmls, styles, firstRenderedData, viewSpecificBlockRendered, viewElements, DIVS = [ "st", "br", "vsbr" ], autoRendered = [], spriteStyles = [], Draw = {
            z: 0,
            alpha: 1,
            color: "#000",
            rectangle: function(x, y, w, h, opts) {
                htmls.push('<div class="Grape-e"></div>');
                opts ? styles.push([ 0, x, y, opts.z === undefined ? Draw.z : opts.z, opts.alpha === undefined ? Draw.alpha : opts.alpha, w, h, opts.backgroundColor === undefined ? Draw.color : opts.backgroundColor, opts.borderColor === undefined ? Draw.color : opts.borderColor, opts.borderWidth === undefined ? 1 : opts.borderWidth, opts.borderStyle === undefined ? "solid" : opts.borderStyle ]) : styles.push([ 0, x, y, Draw.z, Draw.alpha, w, h, Draw.color ]);
            },
            sprite: function(x, y, sprite, subimage, opts) {
                htmls.push('<div class="Grape-e Gs-' + sprite + '"></div>');
                opts ? styles.push([ 1, x, y, opts.z === undefined ? Draw.z : opts.z, opts.alpha === undefined ? Draw.alpha : opts.alpha, sprite, subimage ]) : styles.push([ 1, x, y, Draw.z, Draw.alpha, sprite, subimage ]);
            },
            text: function(x, y, text, opts) {
                htmls.push('<div class="Grape-e">' + text + "</div>");
                opts ? styles.push([ 2, x, y, opts.z === undefined ? Draw.z : opts.z, opts.alpha === undefined ? Draw.alpha : opts.alpha, opts.color === undefined ? Draw.color : opts.color, opts.size === undefined ? 20 : opts.size, opts.align ? opts.align : undefined ]) : styles.push([ 2, x, y, Draw.z, Draw.alpha, Draw.color, 20 ]);
            },
            background: function(x, y, w, h, background, opts) {
                htmls.push('<div class="Grape-e Gs-' + background + '"></div>');
                opts ? styles.push([ 3, x, y, opts.z === undefined ? Draw.z : opts.z, opts.alpha === undefined ? Draw.alpha : opts.alpha, w, h ]) : styles.push([ 3, x, y, Draw.z, Draw.alpha, w, h ]);
            }
        };
        return {
            Protected: {
                init: function() {
                    System.bind("resourceProcessed.sprite", function(spr) {
                        spriteStyles.push(DomUtils.createStyle(".Gs-" + spr.name + "{width:" + spr.width + "px; height:" + spr.height + "px;" + " margin-left:" + -spr.originX + "px; margin-top:" + -spr.originY + "px;" + "background-image:url('" + spr.url + "');}\n"));
                    });
                },
                clearViewElements: function() {
                    viewElements = [];
                },
                createViewElement: function(id, viewElement) {
                    for (var div, result = [], i = 0; 3 > i; ++i) {
                        div = document.createElement("div");
                        div.className = "Grape-view-" + DIVS[i];
                        viewElement.appendChild(div);
                        result[i] = div;
                    }
                    viewElements[id] = result;
                },
                beforeCollect: function() {
                    htmls = [];
                    styles = [];
                },
                afterCollect: function() {
                    autoRendered = [ htmls, styles ];
                },
                beforeCollectViews: function() {
                    viewSpecificBlockRendered = [];
                },
                beforeCollectView: function() {
                    htmls = [];
                    styles = [];
                },
                afterCollectView: function(i) {
                    viewSpecificBlockRendered[i] = [ htmls, styles ];
                },
                afterRecalculate: function(id, view) {
                    for (var style, i = 0; 3 > i; ++i) {
                        style = viewElements[id][i].style;
                        style.left = view.calculated.originX - view.x + "px";
                        style.top = view.calculated.originY - view.y + "px";
                    }
                },
                renderFirstAutoRendered: function(id) {
                    var blockRenderedView = viewElements[id][1];
                    blockRenderedView.innerHTML = firstRenderedData = autoRendered[0].join("");
                    applyStyles(blockRenderedView, autoRendered[1]);
                },
                renderOtherAutoRendered: function(id) {
                    viewElements[id][1].innerHTML = firstRenderedData;
                    applyStyles(viewElements[id][1], autoRendered[1]);
                },
                renderView: function(id) {
                    viewElements[id][2].innerHTML = viewSpecificBlockRendered[id][0].join("");
                    applyStyles(viewElements[id][2], viewSpecificBlockRendered[id][1]);
                }
            },
            Public: Draw
        };
    });
    define("utils/ajax", [], function() {
        return function(url, data) {
            "function" == typeof data && (data = {
                success: data
            });
            data = data || {};
            data.async === void 0 && (data.async = !0);
            var xhr;
            xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            xhr.async = data.async;
            xhr.onreadystatechange = function() {
                4 === xhr.readyState && 200 === xhr.status && data.success && ("blob" === xhr.responseType || "arraybuffer" === xhr.responseType ? data.success(xhr.response) : data.success(xhr.responseText));
            };
            xhr.open("GET", url, data.async);
            data.responseType !== void 0 && (xhr.responseType = data.responseType);
            xhr.send();
        };
    });
    define("utils/json", [], function() {
        return "object" == typeof JSON ? JSON : {
            parse: function(string) {
                return Function("", "return " + string)();
            },
            stringify: function() {
                throw "Unsupported!";
            }
        };
    });
    define("core/scene", [ "core/loader", "utils/ajax", "utils/environment", "utils/extend", "utils/json", "utils/trim", "utils/unique-generator" ], function(Loader, ajax, Environment, extend, JSON, trim, UniqueGenerator, undefined) {
        function scene(name, inherited, data) {
            var i, max;
            if (data === undefined) return scene(name, [], inherited);
            "string" == typeof inherited && (inherited = inherited.split(","));
            for (i = 0, max = inherited.length; max > i; ++i) inherited[i] = trim(inherited[i]);
            if ("string" == typeof data) {
                data = {
                    url: data
                };
                Loader.add("scene", data.url, data);
            }
            data.inherited = inherited;
            name || (name = unique());
            scenes[name] = data;
            return name;
        }
        function processScene(scene, loadedData) {
            extend(scene, loadedData);
        }
        var scenes = {}, unique = UniqueGenerator.create("anonymus-scene"), loader = function() {
            return Environment.browser ? function(url, finish) {
                ajax(url, function(resp) {
                    finish(JSON.parse(resp));
                });
            } : function(url, finish) {
                var fs = require("fs");
                fs.readFile(url, function(err, content) {
                    finish(JSON.parse(content));
                });
            };
        }();
        Loader.register("scene", loader, processScene);
        scene.get = function(name) {
            return scenes[name];
        };
        return scene;
    });
    define("utils/doubly-linked-list", [], function() {
        var DoublyLinkedList = function() {
            this.first = [ null, null, null ];
            this.last = [ this.first, null, null ];
            this.first[2] = this.last;
        }, detachElement = DoublyLinkedList.detachElement = function(el) {
            var prev, next;
            (prev = el[0])[2] = next = el[2];
            next[0] = prev;
        }, Iterator = DoublyLinkedList.Iterator = function(current) {
            return {
                hasNext: function() {
                    return null !== current[2][1];
                },
                next: function() {
                    return (current = current[2])[1];
                },
                remove: function() {
                    detachElement(current);
                }
            };
        };
        DoublyLinkedList.prototype = {
            push: function(el) {
                var last = this.last, prev = last[0];
                el = [ prev, el, last ];
                prev[2] = el;
                return last[0] = el;
            },
            pushListElement: function(el) {
                var li = this.last;
                el[0] = li[0];
                el[2] = li;
                li[0][2] = el;
                li[0] = el;
            },
            iterator: function() {
                return new Iterator(this.first);
            },
            each: function(callback) {
                for (var e, it = this.iterator(); null !== (e = it.next()); ) callback.call(e, e);
            }
        };
        return DoublyLinkedList;
    });
    define("core/playground", [ "core/component", "core/logger", "core/scene", "core/system", "utils/doubly-linked-list", "utils/extend", "utils/format", "utils/has-prop" ], function(component, Logger, scene, System, List, extend, format, hasProp) {
        var playground, previous, playgroundProtected, originalDispatch, SCENE_NOT_FOUND = 'Scene "%1" not found!', INHERITED_SCENE_NOT_FOUND = 'Inherited scene "%1" not found!', SCENE_NOT_LOADED = 'Scene "%1" not loaded!', NEXT_SCENE_NOT_DEFINED = "Next scene is not defined for the current scene!", NO_PREVIOUS_SCENE = "Cannot call previousScene on first scene.", detach = List.detachElement, applyInherited = function(playground, inherited) {
            var i, max, sc, prop;
            for (i = 0, max = inherited.length; max > i; ++i) {
                sc = scene.get(inherited[i]);
                sc || Logger.error(format(INHERITED_SCENE_NOT_FOUND, inherited[i]));
                sc.inherited || Logger.error(format(SCENE_NOT_LOADED, inherited[i]));
                applyInherited(playground, sc.inherited);
                for (prop in sc) if (hasProp(sc, prop)) switch (prop) {
                  case "inherited":
                    break;

                  case "init":
                  case "instances":
                  case "systems":
                    playground[prop] = playground[prop].concat(sc[prop]);
                    break;

                  default:
                    playground[prop] = sc[prop];
                }
            }
        }, createPlayground = function(name) {
            var newPlayground, Playground = function() {
                extend(this, {
                    fps: 30,
                    width: 100,
                    height: 100,
                    backgroundColor: "gray",
                    background: "",
                    backgroundAlpha: 1,
                    next: "",
                    init: [],
                    instances: [],
                    systems: [],
                    views: [ {} ]
                });
                this.setViews(this.views);
                delete this.systems;
                delete this.views;
                applyInherited(this, [ name ]);
                this.name = name;
            }, registerInstance = function(type, x, y) {
                var instances, lists, inst, events, inherited, i, current, Component = component.get(type);
                if (instances = instancesByTypes[type]) ++instanceNumbersByTypes[type]; else {
                    instances = instancesByTypes[type] = new List();
                    lists = listsByTypes[type] = [];
                    events = Component.prototype.Component.eventNames;
                    for (i = events.length; --i >= 0; ) {
                        current = events[i];
                        typesByEventListeners[current] || (typesByEventListeners[current] = new List());
                        lists.push(typesByEventListeners[current].push(type));
                    }
                    if (0 !== instanceNumbersByTypes[type]) {
                        inherited = Component.prototype.Component.inherited;
                        for (i = inherited.length; --i >= 0; ) {
                            current = inherited[i];
                            typesByInherited[current] ? typesByInherited[current].push(type) : typesByInherited[current] = [ type ];
                        }
                    }
                    instanceNumbersByTypes[type] = 1;
                }
                ++instanceNumber;
                inst = new Component();
                inst.x = x;
                inst.y = y;
                inst._id = ++nextId;
                inst._listElement = instances.push(inst);
                return inst;
            }, remove = function(inst) {
                var i, localEvents, subscribe, lists, type = inst.Component.name, last = 1 === instanceNumbersByTypes[type];
                if (!inst._destroyed) {
                    inst._destroyed = !0;
                    inst.dispatch("destroy", last);
                    detach(inst._listElement);
                    if (inst._localEvents) for (i in localEvents = inst._localEvents) hasProp(localEvents, i) && (subscribe = localEvents[i].subscribe) && detach(subscribe);
                    if (last) {
                        delete instancesByTypes[type];
                        lists = listsByTypes[type];
                        delete listsByTypes[type];
                        for (i = lists.length; --i >= 0; ) detach(lists[i]);
                    }
                    --instanceNumbersByTypes[type];
                    --instanceNumber;
                }
            }, subscribe = function(inst, event) {
                var list;
                (list = instancesByLocalEventListeners[event]) || (list = instancesByLocalEventListeners[event] = new List());
                return list.push(inst);
            }, finish = function() {
                var i, max, inst, insts = [];
                for (i = 0, max = newPlayground.instances.length; max > i; ++i) {
                    inst = newPlayground.instances[i];
                    if ("string" == typeof inst) {
                        inst = inst.split(",");
                        inst = {
                            x: parseFloat(inst[0]),
                            y: parseFloat(inst[1]),
                            type: inst[2]
                        };
                    }
                    insts.push(registerInstance(inst.type, inst.x, inst.y));
                }
                delete newPlayground.instances;
                for (i = 0, max = insts.length; max > i; ++i) insts[i].dispatch("create");
                for (i = 0, max = newPlayground.init.length; max > i; ++i) newPlayground.init[i].call(this);
            }, getViews = function() {
                return views;
            }, getDerivedTypes = function(type) {
                return typesByInherited[type];
            }, getInstancesByTypes = function(type) {
                return instancesByTypes[type];
            }, getTypes = function() {
                return instancesByTypes;
            }, nextId = 0, views = [], instanceNumber = 0, instanceNumbersByTypes = {}, typesByInherited = {}, typesByEventListeners = {}, listsByTypes = {}, instancesByLocalEventListeners = {}, instancesByTypes = {};
            Playground.prototype = {
                dispatch: function(event, data) {
                    var currentType, type, current, el, instances, types = typesByEventListeners[event];
                    if (types) {
                        currentType = types.first;
                        for (;null !== (currentType = currentType[2]) && null !== (type = currentType[1]); ) {
                            current = instancesByTypes[type].first;
                            for (;null !== (current = current[2]) && null !== (el = current[1]); ) el.dispatch(event, data);
                        }
                    }
                    if (instances = instancesByLocalEventListeners[event]) {
                        current = instances.first;
                        for (;null !== (current = current[2]) && null !== (el = current[1]); ) el.dispatch(event, data);
                    }
                },
                getView: function(id) {
                    return views[id];
                },
                setViews: function(newViews) {
                    var i;
                    for (i = newViews.length; --i >= 0; ) {
                        views[i] = {
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            x: 0,
                            y: 0,
                            originX: 0,
                            originY: 0,
                            zoom: 1,
                            alpha: 1,
                            follow: "",
                            followType: "",
                            followSpeed: "",
                            autoRender: !0
                        };
                        extend(views[i], newViews[i]);
                        views[i].id = i;
                    }
                    System.dispatch("viewsChanged", views);
                }
            };
            newPlayground = new Playground();
            return {
                playground: newPlayground,
                getViews: getViews,
                finish: finish,
                getDerivedTypes: getDerivedTypes,
                getInstancesByTypes: getInstancesByTypes,
                getTypes: getTypes,
                remove: remove,
                subscribe: subscribe,
                registerInstance: registerInstance,
                name: newPlayground.name
            };
        }, deferredEvents = [], deferredDispatch = function() {
            deferredEvents.push(arguments);
        }, startDeferringEvents = function() {
            if (playground.dispatch !== deferredDispatch) {
                originalDispatch = playground.dispatch;
                playground.dispatch = deferredDispatch;
            }
        }, stopDeferringEvents = function() {
            var i, max;
            if (playground.dispatch === deferredDispatch) {
                playground.dispatch = originalDispatch;
                for (i = 0, max = deferredEvents.length; max > i; ++i) originalDispatch.apply(this, deferredEvents[i]);
                deferredEvents = [];
            }
        }, startScene = function(name) {
            scene.get(name) || Logger.error(format(SCENE_NOT_FOUND, name));
            System.dispatch("stopLoop", function() {
                var playgroundData = createPlayground(name);
                playground && (previous = playgroundProtected.name);
                playground = playgroundData.playground;
                playgroundProtected = playgroundData;
                System.dispatch("newPlayground", playground);
                playgroundProtected.finish();
                System.dispatch("startLoop");
            });
        };
        component.fn.destroy = function() {
            playgroundProtected.remove(this);
        };
        component.fn._subscribe = function(event) {
            return this._id ? playgroundProtected.subscribe(this, event) : null;
        };
        component.fn._unsubscribe = function(subscribe) {
            null !== subscribe && detach(subscribe);
        };
        System.bind("beginFrame", function() {
            playground.dispatch("beginFrame");
        });
        System.bind("frame", function() {
            playground.dispatch("frame");
        });
        System.bind("endFrame", function() {
            playground.dispatch("endFrame");
        });
        return {
            dispatch: function(event, data) {
                playground.dispatch(event, data);
            },
            startScene: startScene,
            restartScene: function() {
                startScene(playgroundProtected.name);
            },
            nextScene: function() {
                playground.next || Logger.error(NEXT_SCENE_NOT_DEFINED);
                startScene(playground.next);
            },
            previousScene: function() {
                previous || Logger.error(NO_PREVIOUS_SCENE);
                startScene(previous);
            },
            getViews: function() {
                return playgroundProtected.getViews();
            },
            getDerivedTypes: function(type) {
                return playgroundProtected.getDerivedTypes(type);
            },
            getInstancesByTypes: function(type) {
                return playgroundProtected.getInstancesByTypes(type);
            },
            getTypes: function() {
                return playgroundProtected.getTypes();
            },
            createInstance: function(x, y, type) {
                var inst = playgroundProtected.registerInstance(type, x, y);
                inst.dispatch("create");
                return inst;
            },
            getView: function(id) {
                return playground.getView(id);
            },
            setViews: function(views) {
                playground.setViews(views);
            },
            startDeferringEvents: startDeferringEvents,
            stopDeferringEvents: stopDeferringEvents
        };
    });
    define("core/draw", [ "core/canvas", "core/dom", "core/logger", "core/playground", "core/settings", "core/system", "utils/dom-utils", "utils/environment", "utils/format" ], function(Canvas, DOM, Logger, Playground, Settings, System, DomUtils, Environment, format) {
        function recalculate(views) {
            for (var nodeStyle, view, j, propName, prop, calculated, i = 0, max = views.length, nodes = screen.childNodes, width = screen.offsetWidth, height = screen.offsetHeight; max > i; ++i) {
                nodeStyle = nodes[i].style;
                view = views[i];
                for (j = 0; 6 > j; ++j) {
                    propName = DYNAMIC_PROPERTIES[j];
                    "function" != typeof (prop = view[propName]) && (view[propName] = parseFloat(prop) + "" == prop + "" ? Function("return " + prop + ";") : Function("p", "return " + prop.replace(/%/, "/100*p") + ";"));
                }
                (calculated = view.calculated) || (calculated = view.calculated = {});
                calculated.left = view.left(width);
                calculated.top = view.top(height);
                calculated.width = view.width(width) / view.zoom;
                calculated.height = view.height(height) / view.zoom;
                calculated.originX = view.originX(calculated.width);
                calculated.originY = view.originY(calculated.height);
                nodeStyle.zoom = view.zoom;
                nodeStyle.opacity = view.alpha;
                if ("" !== nodeStyle.webkitTransform) {
                    nodeStyle.MozTransform = "translate(" + calculated.width / 2 * (view.zoom - 1) + "px, " + calculated.height / 2 * (view.zoom - 1) + "px) scale(" + view.zoom + ")";
                    nodeStyle.OTransform = "translate(" + calculated.width / 2 * (view.zoom - 1) + "px, " + calculated.height / 2 * (view.zoom - 1) + "px) scale(" + view.zoom + ")";
                    nodeStyle.left = calculated.left + "px";
                    nodeStyle.top = calculated.top + "px";
                } else {
                    nodeStyle.left = calculated.left / view.zoom + "px";
                    nodeStyle.top = calculated.top / view.zoom + "px";
                }
                nodeStyle.width = calculated.width + "px";
                nodeStyle.height = calculated.height + "px";
                Protected.afterRecalculate(i, view);
            }
            System.dispatch("recalculateViews", views);
        }
        var screen, style, MISSING_CONTAINER = 'Game container "%1" is missing!', BASIC_CSS = ".Grape-screen{cursor:default; z-index:0; float:left; position:relative; overflow:hidden; width:100%; height:100%;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none; text-transform:none;}.Grape-e, .Grape-view>*{position:absolute; white-space:pre;}.Grape-view{z-index:0; float: left;position: absolute;overflow: hidden;}", DYNAMIC_PROPERTIES = [ "left", "top", "width", "height", "originX", "originY" ], DrawHandler = Environment.canvas && Settings.canvas !== !1 ? Canvas : DOM, Protected = DrawHandler.Protected, Draw = DrawHandler.Public, document = Environment.browser ? window.document : null;
        Protected.init();
        System.bind("init", function() {
            var container, elId = Settings.container;
            if (Environment.browser && !Settings.headless) {
                "string" == typeof elId && (container = document.getElementById(elId));
                if (!container) {
                    Logger.error(format(MISSING_CONTAINER, elId));
                    return;
                }
                screen = document.createElement("div");
                screen.className = "Grape-screen";
                container.appendChild(screen);
                screen.onselectstart = function() {
                    return !1;
                };
                style = DomUtils.createStyle(BASIC_CSS);
            }
        });
        System.bind("viewsChanged", function(views) {
            var view, i = 0, max = views.length;
            screen.innerHTML = "";
            Protected.clearViewElements();
            for (;max > i; ++i) {
                view = document.createElement("div");
                view.className = "Grape-view";
                Protected.createViewElement(i, view);
                screen.appendChild(view);
            }
            recalculate(views);
        });
        System.bind("render", function() {
            var i, container, views = Playground.getViews(), max = views.length, firstRendered = null, playground = Playground.playground, opts = {
                alpha: playground.backgroundAlpha,
                z: -1e7
            };
            Protected.beforeCollect();
            if (playground.background) Draw.background(0, 0, playground.width, playground.height, playground.background, opts); else if (playground.backgroundColor) {
                opts.backgroundColor = playground.backgroundColor;
                opts.borderWidth = 0;
                Draw.rectangle(0, 0, playground.width, playground.height, opts);
            }
            playground.dispatch("draw");
            Protected.afterCollect();
            Protected.beforeCollectViews();
            for (i = 0; max > i; ++i) {
                Protected.beforeCollectView(i);
                playground.dispatch("drawView", views[i]);
                playground.dispatch("drawView." + i, views[i]);
                Protected.afterCollectView(i);
            }
            recalculate(views);
            (container = screen.parentNode).removeChild(screen);
            for (i = 0; max > i; ++i) {
                views[i].autoRender && (null === firstRendered ? Protected.renderFirstAutoRendered(i) : Protected.renderOtherAutoRendered(i));
                Protected.renderView(i);
            }
            container.appendChild(screen);
        });
        return {
            Public: Draw,
            Protected: {
                getScreen: function() {
                    return screen;
                },
                setCursor: function(cursor) {
                    screen.style.cursor = cursor;
                }
            }
        };
    });
    define("core/gameloop", [ "core/playground", "core/settings", "core/system", "utils/environment" ], function(Playground, Settings, System, Environment) {
        var firstScene, lastRun, timeoutId = null, running = !1, StopThreadException = function(callback) {
            this.callback = callback;
        }, requestFrame = Environment.browser ? window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || window.setTimeout : setTimeout, yieldFrame = Environment.browser ? window.cancelRequestAnimationFrame || window.mozCancelRequestAnimationFrame || window.webkitCancelRequestAnimationFrame || window.msCancelRequestAnimationFrame || window.oCancelRequestAnimationFrame || window.clearTimeout : clearTimeout, run = function() {
            var frameDiff = 1e3 / Playground.playground.fps, loops = 0;
            timeoutId = null;
            try {
                Playground.stopDeferringEvents();
                for (;new Date().getTime() > lastRun; ) {
                    if (!(16 > frameDiff * loops)) {
                        lastRun = new Date().getTime();
                        break;
                    }
                    System.frame();
                    ++loops;
                    lastRun += frameDiff;
                }
                loops && System.dispatch("render");
            } catch (e) {
                if (e instanceof StopThreadException) {
                    setTimeout(e.callback, 0);
                    running = !1;
                    return;
                }
                running = !1;
                throw e;
            }
            timeoutId = requestFrame(run, 0);
            Playground.startDeferringEvents();
        }, start = function() {
            running = !0;
            lastRun = new Date().getTime();
            timeoutId = setTimeout(run, 0);
        }, stop = function(callback) {
            callback = callback || function() {};
            if (running) {
                if (null === timeoutId) throw new StopThreadException(callback);
                yieldFrame(timeoutId);
                timeoutId = null;
                Playground.stopDeferringEvents();
                running = !1;
                callback();
            } else callback();
        }, startGame = function() {
            Playground.startScene(firstScene = Settings.scene);
        };
        System.bind("start", startGame);
        System.bind("stopLoop", stop);
        System.bind("startLoop", start);
        return {
            restartGame: function() {
                stop(startGame);
            }
        };
    });
    define("core/input", [ "core/draw", "core/playground", "core/settings", "core/system", "utils/dom-utils", "utils/environment", "utils/has-prop" ], function(Draw, Playground, Settings, System, DomUtils, Environment, hasProp) {
        var views, i, downkeys = {}, pressedkeys = {}, releasedkeys = {}, rkeys = {}, Mouse = {
            x: 0,
            y: 0,
            screen: {
                x: 0,
                y: 0
            },
            view: null,
            views: [],
            lastView: 0
        }, keys = {
            any: "any",
            none: "none",
            mouse1: "mouseLeft",
            mouse2: "mouseMiddle",
            mouse3: "mouseRight",
            8: "backspace",
            9: "tab",
            12: "clear",
            13: "enter",
            16: "lshift",
            17: "ctrl",
            18: "alt",
            19: "pause",
            20: "rshift",
            27: "esc",
            32: "space",
            33: "pagegup",
            34: "pagedown",
            35: "end",
            36: "home",
            37: "left",
            38: "up",
            39: "right",
            40: "down",
            45: "insert",
            46: "delete",
            91: "windows",
            93: "contextmenu",
            106: "*",
            107: "+",
            109: "-",
            110: ".",
            111: "/",
            144: "numlock",
            186: "é",
            187: "ó",
            188: ",",
            189: "/",
            190: ".",
            191: "ü",
            192: "ö",
            219: "ő",
            220: "ű",
            221: "ú",
            222: "á",
            226: "í"
        }, isKeyIn = function(key, keySet) {
            var i;
            if ("any" === key || "none" === key) {
                for (i in keySet) if (hasProp(keySet, i)) return "any" === key;
                return "none" === key;
            }
            return hasProp(keySet, rkeys[key]);
        }, isReserved = function(key) {
            var i, res = Settings.reservedKeys;
            for (i = res.length; --i >= 0; ) if (res[i] === key) return !0;
            return !1;
        }, dispatchKeys = function(keyset, evname) {
            var keyNum = 0;
            for (var i in keyset) if (hasProp(keyset, i)) {
                0 === keyNum && Playground.dispatch(evname + ".any", i);
                ++keyNum;
                Playground.dispatch(evname + "." + keys[i]);
            }
            0 === keyNum && Playground.dispatch(evname + ".none");
        }, resetKeys = function() {
            pressedkeys = {};
            releasedkeys = {};
            downkeys = {};
        }, calculateMouse = function() {
            var i, view;
            if (views) {
                Mouse.views = [];
                for (i = views.length; --i >= 0; ) {
                    view = views[i];
                    Mouse.views[i] = {
                        x: (Mouse.screen.x - view.calculated.left) / view.zoom + view.x - view.calculated.originX,
                        y: (Mouse.screen.y - view.calculated.top) / view.zoom + view.y - view.calculated.originY
                    };
                }
                i = Mouse.views[Mouse.lastView];
                Mouse.x = i.x;
                Mouse.y = i.y;
            }
        };
        Settings.reservedKeys = Settings.reservedKeys || [];
        for (i = 65; 90 >= i; ++i) keys[i] = String.fromCharCode(i).toLowerCase();
        for (i = 0; 9 >= i; ++i) keys[i + 48] = i;
        for (i = 0; 9 >= i; ++i) keys[i + 96] = "num" + i;
        for (i = 1; 12 >= i; ++i) keys[i + 111] = "f" + i;
        for (i in keys) rkeys[keys[i]] = i;
        System.bind("init", function() {
            if (Environment.browser && !Settings.headless) {
                DomUtils.bind(document, "keydown", function(event) {
                    var key = DomUtils.getKeyCode(event);
                    downkeys[key] || (pressedkeys[key] = !0);
                    downkeys[key] = !0;
                    (isReserved("any") || isReserved(keys[key])) && DomUtils.preventDefault(event);
                });
                DomUtils.bind(document, "keyup", function(event) {
                    var key = DomUtils.getKeyCode(event);
                    if (hasProp(downkeys, key)) {
                        delete downkeys[key];
                        releasedkeys[key] = !0;
                    }
                });
                document.oncontextmenu = function(event) {
                    DomUtils.contains(Draw.Protected.getScreen(), DomUtils.getTarget(event)) && DomUtils.preventDefault(event);
                };
                DomUtils.bind(document, "mousedown", function(event) {
                    var screen = Draw.Protected.getScreen(), target = DomUtils.getTarget(event);
                    if (screen === target || DomUtils.contains(screen, target)) {
                        var key = "mouse" + DomUtils.getKeyCode(event);
                        hasProp(downkeys, key) || (pressedkeys[key] = !0);
                        downkeys[key] = !0;
                        DomUtils.preventDefault(event);
                    }
                });
                DomUtils.bind(document, "mouseup", function(event) {
                    var key = "mouse" + DomUtils.getKeyCode(event);
                    if (hasProp(downkeys, key)) {
                        delete downkeys[key];
                        releasedkeys[key] = !0;
                    }
                });
                DomUtils.bind(document, "mousemove", function(event) {
                    var target = DomUtils.getTarget(event), rect = Draw.Protected.getScreen().getBoundingClientRect();
                    event = DomUtils.getRealEvent(event);
                    Mouse.view = null;
                    for (;;) {
                        if (target === window.document) break;
                        if (DomUtils.hasClass(target, "Grape-view")) {
                            i = 0;
                            for (;null !== target.previousSibling; ) {
                                target = target.previousSibling;
                                ++i;
                            }
                            Mouse.view = Mouse.lastView = i;
                            break;
                        }
                        target = target.parentNode;
                    }
                    Mouse.screen.x = event.pageX - rect.left;
                    Mouse.screen.y = event.pageY - rect.top;
                    calculateMouse();
                });
            }
        });
        System.bind("recalculateViews", function(v) {
            views = v;
            calculateMouse();
        });
        System.bind("handleInput", function() {
            dispatchKeys(pressedkeys, "keyPress");
            dispatchKeys(downkeys, "keyDown");
            dispatchKeys(releasedkeys, "keyRelease");
            pressedkeys = {};
            releasedkeys = {};
        });
        return {
            Mouse: Mouse,
            resetKeys: resetKeys,
            alert: function(message) {
                alert(message);
                resetKeys();
            },
            isPressed: function(key) {
                return isKeyIn(key, pressedkeys);
            },
            isReleased: function(key) {
                return isKeyIn(key, releasedkeys);
            },
            isDown: function(key) {
                return isKeyIn(key, downkeys);
            }
        };
    });
    define("core/select", [ "core/logger", "core/playground", "utils/extend", "utils/format", "utils/has-prop", "utils/trim" ], function(Logger, Playground, extend, format, hasProp, trim, undefined) {
        function InstanceArray() {}
        function makeQueries(str) {
            var i, max, from, where, part, parts = str.split(","), queries = [];
            for (i = 0, max = parts.length; max > i; ++i) {
                part = parts[i] = trim(parts[i]);
                where = part.split(" ");
                from = where[0];
                where.shift();
                queries.push({
                    from: from,
                    where: where
                });
            }
            return queries;
        }
        function parseFrom(query) {
            var i, max, j, max2, name, allDerived, from = query.from, added = {}, result = [];
            if ("string" == typeof from) {
                from = from.split(",");
                for (i = 0, max = from.length; max > i; ++i) from[i] = trim(from[i]);
            } else from = query;
            for (i = 0, max = from.length; max > i; ++i) {
                name = from[i];
                if ('"' === name[0] || "'" === name[0]) result.push(name.substring(1, name.length - 1)); else if ("*" === name) {
                    allDerived = Playground.getTypes();
                    for (j in allDerived) hasProp(allDerived, j) && result.push(j);
                } else {
                    result.push(name);
                    if ((allDerived = Playground.getDerivedTypes(name)) === undefined) continue;
                    for (j = 0, max2 = allDerived.length; max2 > j; ++j) if (!added[allDerived[j]]) {
                        added[allDerived[j]] = !0;
                        result.push(allDerived[j]);
                    }
                }
            }
            return result;
        }
        function parseWhere(where) {
            var i, max, condition;
            if (where === undefined) return [];
            where = where instanceof Array ? where.slice() : [ where ];
            for (i = 0, max = where.length; max > i; ++i) {
                condition = where[i];
                if ("string" == typeof condition) {
                    condition = '"' === condition[0] || "'" === condition[0] ? function(name) {
                        return function() {
                            return this.Component.name === name;
                        };
                    }(condition.substring(1, condition.length - 1)) : function(name) {
                        return function() {
                            return this.Component.name === name || this.Component.inheritedSet[name] === !0;
                        };
                    }(condition);
                    where[i] = condition;
                }
            }
            return where;
        }
        function match(el, where) {
            var i, max;
            for (i = 0, max = where.length; max > i; ++i) if (!where[i].call(el)) return !1;
            return !0;
        }
        function select(queries, limit) {
            var i, max, query, from, current, where, j, max2, el, id, selected = {}, addedTypes = {}, result = new InstanceArray();
            queries || (queries = "*");
            "string" == typeof queries ? queries = makeQueries(queries) : queries instanceof Array || (queries = [ queries ]);
            for (i = 0, max = queries.length; max > i; ++i) {
                query = queries[i];
                from = parseFrom(query);
                if (0 !== (max2 = from.length)) {
                    where = parseWhere(query.where);
                    for (j = 0; max2 > j; ++j) if (!addedTypes[from[j]]) {
                        current = Playground.getInstancesByTypes(from[j]);
                        if (current === undefined) continue;
                        current = current.first;
                        for (;null !== (current = current[2]) && null !== (el = current[1]); ) if (!selected[id = el._id] && match(el, where)) {
                            selected[id] = !0;
                            result.push(el);
                            if (limit && 0 === --limit) return result;
                        }
                        0 === where.length && (addedTypes[from[j]] = !0);
                    }
                }
            }
            return result;
        }
        function selectOne(queries) {
            return select(queries, 1)[0];
        }
        var CALL_UNDEFINED = 'Call undefined function "%1"';
        select.fn = InstanceArray.prototype = [];
        extend(InstanceArray.prototype, {
            filter: function(callback) {
                for (var el, i = 0, max = this.length, filtered = new InstanceArray(); max > i; ++i) callback.call(el = this[i], i, el) && filtered.push(el);
                return filtered;
            },
            call: function(which) {
                for (var result, method, params = Array.prototype.slice.call(arguments, 1), i = 0, max = this.length; max > i; ++i) {
                    (method = this[i][which]) === undefined && Logger.error(format(CALL_UNDEFINED, which));
                    result = method.apply(this[i], params);
                }
                return result;
            },
            isEmpty: function() {
                return 0 === this.length;
            },
            each: function(callback) {
                for (var el, i = 0, max = this.length; max > i && callback.call(el = this[i], i, el) !== !1; ++i) ;
                return this;
            },
            attr: function(name, newVal) {
                var i = 0, max = this.length;
                if (1 === arguments.length) return this[0] === undefined ? undefined : this[0][name];
                for (;max > i; ++i) this[i][name] = newVal;
                return this;
            },
            eq: function(i) {
                var result = new InstanceArray();
                this[i] && result.push(this[i]);
                return result;
            },
            get: function(i) {
                return this[i];
            },
            one: function() {
                return this[0];
            },
            size: function() {
                return this.length;
            },
            bind: function(event, callback) {
                for (var i = 0, max = this.length; max > i; ++i) this[i].bind(event, callback);
                return this;
            },
            unbind: function(event, callback) {
                for (var i = 0, max = this.length; max > i; ++i) this[i].unbind(event, callback);
                return this;
            },
            dispatch: function(event, data) {
                for (var i = 0, max = this.length; max > i; ++i) this[i].dispatch(event, data);
                return this;
            },
            destroy: function() {
                for (var i = 0, max = this.length; max > i; ++i) this[i].destroy();
                return this;
            },
            empty: function() {
                return new InstanceArray();
            }
        });
        return {
            select: select,
            selectOne: selectOne
        };
    });
    define("core/position", [ "core/select", "core/playground" ], function(select) {
        function isFree(x, y) {
            return !isAt(x, y, "*");
        }
        function isAt(x, y, checker) {
            return 0 !== instancesAt(x, y, checker).length;
        }
        function instancesAt(x, y, queries) {
            return select(queries).filter(function() {
                return this.x === x && this.y === y;
            });
        }
        select = select.select;
        return {
            isFree: isFree,
            isAt: isAt,
            instancesAt: instancesAt
        };
    });
    define("core/sound", [ "core/logger", "core/loader", "utils/ajax", "utils/environment", "utils/extend", "utils/format", "utils/unique-generator" ], function(Logger, Loader, ajax, Environment, extend, format, UniqueGenerator) {
        function sound(name, opts, url1, url2, url3) {
            var def, url = null, i = 0, urls = [ url1, url2, url3 ], max = urls.length;
            if (1 === arguments.length) return sounds[name];
            if ("string" == typeof opts) return sound(name, {}, opts, url1, url2);
            name || (name = unique());
            for (;max > i; ++i) if (urls[i] && canPlay[urls[i].substring(urls[i].length - 3)]) {
                url = urls[i];
                break;
            }
            null === url && Logger.warning(format(NOT_SUPPORTED_FORMAT, name));
            def = {
                preloadAll: !0
            };
            extend(def, {
                url: url
            });
            sounds[name] = def;
            null !== url && Loader.add("sound", (def.preloadAll ? "1" : "0") + "\n" + url, def);
            return name;
        }
        var FAILED_TO_LOAD = "Failed to load sound from URL: %1", NOT_SUPPORTED_FORMAT = 'Sound "%1" cannot be load, because there is no supported file format defined.', SOUND_NOT_DEFINED = 'Sound "%1" is not defined.', sounds = {}, context = Environment.webAudio ? new webkitAudioContext() : null, unique = UniqueGenerator.create("anonymus-sound"), canPlay = function() {
            var extensions, formats, i, max, canPlayTypes, audio, can;
            if (Environment.audio) {
                extensions = [ "mp3", "wav", "ogg" ];
                formats = [ "audio/mpeg", 'audio/wav; codecs="1"', 'audio/ogg; codecs="vorbis"' ];
                audio = new Audio();
                canPlayTypes = {};
                for (i = 0, max = extensions.length; max > i; ++i) {
                    can = audio.canPlayType(formats[i]);
                    ("maybe" === can || "probably" === can) && (canPlayTypes[extensions[i]] = !0);
                }
                return canPlayTypes;
            }
            return {};
        }(), playSound = null === context || "file:" === window.location.protocol ? function(sound) {
            var snd = sounds[sound];
            if (!snd) {
                Logger.error(format(SOUND_NOT_DEFINED, sound));
                return null;
            }
            if ("undefined" == typeof Media) {
                if ("undefined" != typeof Audio) {
                    snd = new Audio(snd.url);
                    snd.play();
                    return snd;
                }
                return null;
            }
            var src = "/android_asset/www/" + snd.url, media = new Media(src, function() {
                media.release();
            }, function(a) {
                Logger.warning(JSON.stringify(a));
            });
            media.play();
        } : function(sound) {
            var source;
            sound = sounds[sound];
            if (sound) {
                source = context.createBufferSource();
                source.buffer = sound.buffer;
                source.connect(context.destination);
                source.noteOn(0);
                return source;
            }
            Logger.error(format(SOUND_NOT_DEFINED, sound));
            return null;
        }, loader = Environment.browser ? function(url, finish) {
            if ("file:" === window.location.protocol) finish(); else {
                url = url.split("\n");
                if ("1" === url[0]) ajax(url[1], {
                    responseType: "arraybuffer",
                    success: function(response) {
                        context ? context.decodeAudioData(response, function(buffer) {
                            finish(buffer);
                        }) : finish(response);
                    }
                }); else {
                    var a = new Audio();
                    a.addEventListener("canplaythrough", function() {
                        finish(a);
                    }, !1);
                    a.addEventListener("error", function() {
                        Logger.error(format(FAILED_TO_LOAD, url));
                    }, !1);
                    a.src = url[1];
                }
            }
        } : function(url, finish) {
            finish();
        };
        Loader.register("sound", loader, function(sound, buffer) {
            sound.buffer = buffer;
        });
        return {
            sound: sound,
            playSound: playSound
        };
    });
    define("core/tile", [ "core/sprite", "utils/has-prop" ], function(sprite, hasProp) {
        return function(resx, resy, url, data) {
            var width, height, names = {};
            for (var name in data) if (hasProp(data, name)) {
                width = data[name][3] || 1;
                height = data[name][4] || 1;
                names[name] = name;
                sprite(name, url, {
                    width: resx * width,
                    height: resy * height,
                    left: data[name][0] * resx,
                    top: data[name][1] * resy,
                    subimages: data[name][2] || 1
                });
            }
            return names;
        };
    });
    define("core/main", [ "core/component", "core/draw", "core/gameloop", "core/input", "core/loader", "core/logger", "core/playground", "core/position", "core/scene", "core/select", "core/settings", "core/sound", "core/sprite", "core/system", "core/tile" ], function(component, Draw, Gameloop, Input, Loader, Logger, Playground, Position, scene, Select, Settings, Sound, sprite, System, tile) {
        var Grape = Select.select;
        System.bind("newPlayground", function(playground) {
            Playground.playground = Grape.playground = playground;
        });
        Grape.component = Grape.c = component;
        Grape.Draw = Draw.Public;
        Grape.setCursor = Draw.Protected.setCursor;
        Grape.restartGame = Gameloop.restartGame;
        Grape.Input = Input;
        Grape.alert = Input.alert;
        Grape.Mouse = Input.Mouse;
        Grape.Loader = Loader;
        Grape.Logger = Logger;
        Grape.startScene = Playground.startScene;
        Grape.restartScene = Playground.restartScene;
        Grape.nextScene = Playground.nextScene;
        Grape.previousScene = Playground.previousScene;
        Grape.createInstance = Grape.i = Playground.createInstance;
        Grape.dispatch = Playground.dispatch;
        Grape.getView = Playground.getView;
        Grape.setViews = Playground.setViews;
        Grape.isFree = Position.isFree;
        Grape.isAt = Position.isAt;
        Grape.instancesAt = Position.instancesAt;
        Grape.scene = scene;
        Grape.select = Select.select;
        Grape.selectOne = Select.selectOne;
        Grape.Settings = Settings;
        Grape.sound = Sound.sound;
        Grape.playSound = Sound.playSound;
        Grape.sprite = sprite;
        Grape.start = System.start;
        Grape.tile = tile;
        return Grape;
    });
    define("std/misc", [ "core/component", "core/input", "core/playground", "utils/has-prop" ], function(component, Input, Playground, hasProp, undefined) {
        var detectMouseOver = function(el) {
            var b = el.getBounds();
            if (Input.Mouse.x >= b.left && Input.Mouse.x < b.right && Input.Mouse.y >= b.top && Input.Mouse.y < b.bottom) {
                if (!el._mouseOver) {
                    el._mouseOver = !0;
                    el.dispatch("mouseOver");
                }
            } else if (el._mouseOver) {
                el._mouseOver = !1;
                el.dispatch("mouseOut");
            }
        };
        component("Size", {}, {
            getLeft: function() {
                return this.x;
            },
            getTop: function() {
                return this.y;
            }
        }, {
            getWidth: !0,
            getHeight: !0,
            getBounds: !0
        });
        component("Mouse", "Size", {
            create: function() {
                detectMouseOver(this);
            },
            frame: function() {
                detectMouseOver(this);
            },
            keyPress: {
                mouseLeft: function() {
                    this._mouseOver && this.dispatch("localPress.mouseLeft");
                },
                mouseRight: function() {
                    this._mouseOver && this.dispatch("localPress.mouseRight");
                }
            },
            keyRelease: {
                mouseLeft: function() {
                    this._mouseOver && this.dispatch("localRelease.mouseLeft");
                },
                mouseRight: function() {
                    this._mouseOver && this.dispatch("localRelease.mouseRight");
                }
            },
            keyDown: {
                mouseLeft: function() {
                    this._mouseOver && this.dispatch("localDown.mouseLeft");
                },
                mouseRight: function() {
                    this._mouseOver && this.dispatch("localDown.mouseRight");
                }
            }
        }, {
            isMouseOver: function() {
                return this._mouseOver;
            },
            isMouseOverInView: function(id) {
                return Input.Mouse.view === id && this._mouseOver;
            }
        }, {
            isMouseOver: !1,
            isMouseOverInView: !1,
            getWidth: !0,
            getHeight: !0,
            getBounds: !0
        });
        component("Alarm", {
            create: function() {
                this._alarms = {};
            },
            frame: function() {
                var id;
                for (id in this._alarms) if (hasProp(this._alarms, id) && 0 >= --this._alarms[id]) {
                    delete this._alarms[id];
                    this.dispatch("alarm", id);
                    this.dispatch("alarm." + id);
                }
            }
        }, {
            setAlarm: function(id, frames) {
                this._alarms[id] = frames;
            },
            getAlarm: function(id) {
                return this._alarms[id];
            },
            increaseAlarm: function(id, frames) {
                this._alarms[id] ? this._alarms[id] += frames : this._alarms[id] = frames;
            },
            hasAlarm: function(id) {
                return this._alarms[id] !== undefined;
            }
        }, {
            setAlarm: !1,
            getAlarm: !1,
            increaseAlarm: !1,
            hasAlarm: !1
        });
        component("Outside", "Size", {
            frame: function() {
                var o = this.isOutside();
                null !== o && this.dispatch("outside", o);
            }
        }, {
            teleport: function(fromside) {
                var playground = Playground.playground, w = this.getWidth(), h = this.getHeight();
                switch (fromside) {
                  case "left":
                    this.x += w + playground.width;
                    break;

                  case "right":
                    this.x -= w + playground.width;
                    break;

                  case "top":
                    this.y += h + playground.height;
                    break;

                  case "bottom":
                    this.y -= h + playground.height;
                }
            },
            isOutside: function(x, y, relative, stickOut) {
                var w = this.getWidth(), h = this.getHeight();
                if (x === undefined) {
                    x = this.x;
                    y = this.y;
                } else if (relative) {
                    x += this.x;
                    y += this.y;
                }
                return stickOut ? 0 > x ? "left" : 0 > y ? "top" : x + w > Playground.playground.width ? "right" : y + h > Playground.playground.height ? "bottom" : null : 0 >= x + w ? "left" : 0 >= y + h ? "top" : x > Playground.playground.width ? "right" : y > Playground.playground.height ? "bottom" : null;
            },
            stickingOut: function(x, y, relative) {
                return this.isOutside(x, y, relative, !0);
            }
        }, {
            getWidth: !0,
            getHeight: !0,
            getBounds: !0
        });
    });
    define("std/collidable", [ "core/component", "core/playground", "core/system", "std/misc", "utils/has-prop" ], function(component, Playground, System, misc, hasProp) {
        var cells, deleted = {}, block = 64, intersect = function(a, b) {
            return a[1] >= b[0] && b[1] >= a[0] && a[3] >= b[2] && b[3] >= a[2];
        }, addObject = function(instance, bounds) {
            var i, j, cellHash, cellItems, k, item, instance2, inherited, max, boundsArray = [ bounds.left, bounds.right, bounds.top, bounds.bottom ], leftCell = bounds.left / block >> 0, rightCell = bounds.right / block >> 0, topCell = bounds.top / block >> 0, bottomCell = bounds.bottom / block >> 0, collisions = {}, id = instance._id;
            for (i = leftCell; rightCell >= i; ++i) for (j = topCell; bottomCell >= j; ++j) if (cellItems = cells[cellHash = i + ";" + j]) {
                for (k = cellItems.length; --k >= 0; ) {
                    item = cellItems[k];
                    intersect(boundsArray, item[2]) && (collisions[item[1]] = item[0]);
                }
                cellItems.push([ instance, id, boundsArray ]);
            } else cells[cellHash] = cellItems = [ [ instance, instance._id, boundsArray ] ];
            for (i in collisions) if (hasProp(collisions, i)) {
                instance2 = collisions[i];
                inherited = instance2.Component.inheritedAndMe;
                for (j = 0, max = inherited.length; max > j && !deleted[i] && !deleted[id]; ++j) instance.dispatch("collision." + inherited[j], instance2);
                inherited = instance.Component.inheritedAndMe;
                for (j = 0, max = inherited.length; max > j && !deleted[i] && !deleted[id]; ++j) instance2.dispatch("collision." + inherited[j], instance);
            }
        };
        System.bind("collision", function() {
            cells = {};
            deleted = {};
            Playground.dispatch("collisionCheck");
        });
        component("Collidable", "Size", {
            collisionCheck: function() {
                addObject(this, this.getBounds());
            },
            destroy: function() {
                deleted[this._id] = 1;
            }
        }, {}, {
            getWidth: !0,
            getHeight: !0,
            getBounds: !0
        });
    });
    define("std/physical", [ "core/component", "core/playground", "core/system" ], function(component, Playground, System) {
        System.bind("physics", function() {
            Playground.dispatch("physics");
        });
        var dirs = {
            left: 180,
            right: 0,
            up: 90,
            down: 270
        };
        component("Physical", {
            create: function() {
                this.vspeed = this.hspeed = this.vacc = this.hacc = this.friction = 0;
            },
            physics: function() {
                this.hspeed += this.hacc;
                this.vspeed += this.vacc;
                var ns = this.getSpeed() - this.friction;
                this.setSpeed(ns > 0 ? ns : 0);
                this.x += this.hspeed;
                this.y += this.vspeed;
            }
        }, {
            getSpeed: function() {
                return Math.sqrt(this.vspeed * this.vspeed + this.hspeed * this.hspeed);
            },
            setSpeed: function(speed) {
                var s = this.getSpeed();
                if (0 !== s) {
                    this.vspeed *= speed / s;
                    this.hspeed *= speed / s;
                } else this.hspeed = speed;
                return this;
            },
            setDirection: function(direction) {
                if ("string" == typeof direction) this.setDirection(dirs[direction] || 0); else {
                    direction %= 360;
                    var speed = this.getSpeed();
                    this.vspeed = -Math.sin(direction / 180 * Math.PI) * speed;
                    this.hspeed = Math.cos(direction / 180 * Math.PI) * speed;
                }
                return this;
            },
            getDirection: function() {
                return (180 * (Math.atan2(this.hspeed, this.vspeed) / Math.PI) + 270) % 360;
            },
            accelerate: function(plus) {
                var s = this.getSpeed();
                if (0 !== s) {
                    this.vspeed *= (s + plus) / s;
                    this.hspeed *= (s + plus) / s;
                } else this.setSpeed(plus);
                return this;
            },
            stop: function() {
                this.vspeed = this.hspeed = 0;
                return this;
            },
            moveTo: function(x, y, speed) {
                void 0 === speed && (speed = this.getSpeed());
                this.hspeed = x - this.x;
                this.vspeed = y - this.y;
                this.setSpeed(speed);
            },
            bounceAgainst: function(instance) {
                var b1, b2;
                b1 = this.inherits("Size") ? this.getBounds() : {
                    left: this.x,
                    right: this.x
                };
                b2 = instance.inherits("Size") ? instance.getBounds() : {
                    left: instance.x,
                    right: instance.x
                };
                var smallerRight = b1.right < b2.right ? b1.right : b2.right, biggerLeft = b1.left > b2.left ? b1.left : b2.left, smallerBottom = b1.bottom < b2.bottom ? b1.bottom : b2.bottom, biggerTop = b1.top > b2.top ? b1.top : b2.top;
                smallerBottom - biggerTop > smallerRight - biggerLeft ? this.hspeed *= -1 : this.vspeed *= -1;
            },
            reverse: function(dir) {
                switch (dir) {
                  case "left":
                  case "right":
                    this.hspeed *= -1;
                    break;

                  default:
                    this.vspeed *= -1;
                }
            }
        });
    });
    define("std/rendering", [ "core/component", "core/draw", "core/sprite", "std/misc" ], function(component, Draw, sprite) {
        Draw = Draw.Public;
        component("Renderable", {}, {}, {
            render: !0
        });
        component("AutoRendered", "Renderable", {
            create: function() {
                this.z = 0;
                this.alpha = 1;
                this.visible = !0;
            },
            draw: function() {
                if (this.visible) {
                    Draw.z = this.z;
                    Draw.alpha = this.alpha;
                    this.render();
                }
            }
        }, {}, {
            render: !0
        });
        component("Sprite", "Renderable,Size", {
            create: function() {
                this.sprite = null;
                this.subimage = 0;
            }
        }, {
            getSprite: function() {
                return sprite(this.sprite);
            },
            getLeft: function() {
                var s = this.getSprite();
                return this.x - s.originX + s.leftBounding;
            },
            getTop: function() {
                var s = this.getSprite();
                return this.x - s.originY + s.topBounding;
            },
            getWidth: function() {
                var s = this.getSprite();
                return s.rightBounding - s.leftBounding;
            },
            getHeight: function() {
                var s = this.getSprite();
                return s.bottomBounding - s.topBounding;
            },
            getBounds: function() {
                if (!this.sprite) return {
                    left: this.x,
                    top: this.y,
                    right: this.x,
                    bottom: this.y
                };
                var s = this.getSprite(), l = this.x - s.originX, t = this.y - s.originY;
                return {
                    left: l + s.leftBounding,
                    top: t + s.topBounding,
                    right: l + s.rightBounding,
                    bottom: t + s.bottomBounding
                };
            },
            render: function() {
                Draw.sprite(this.x, this.y, this.sprite, this.subimage);
            }
        }, {
            getSprite: !1
        });
        component("Animated", "Sprite", {
            create: function() {
                this.imageSpeed = 1;
            },
            frame: function() {
                var subimages = this.getSprite().subimages, nextSubimage = this.subimage + this.imageSpeed;
                if (nextSubimage >= subimages) {
                    this.subimage = nextSubimage % subimages;
                    this.dispatch("animationEnd");
                } else this.subimage = nextSubimage;
            }
        });
        component("Text", "Renderable", {
            create: function() {
                this.text = "";
                this.textColor = "#f00";
                this.textSize = 22;
            }
        }, {
            render: function() {
                Draw.text(this.x, this.y, this.text, {
                    color: this.textColor,
                    size: this.textSize
                });
            }
        });
        component("Rectangle", "Renderable,Size", {
            create: function() {
                this.width = this.height = 0;
                this.borderWidth = 1;
                this.backgroundColor = "#fff";
                this.borderColor = "#000";
            }
        }, {
            getWidth: function() {
                return this.width;
            },
            getHeight: function() {
                return this.height;
            },
            getBounds: function() {
                return {
                    left: this.x,
                    top: this.y,
                    right: this.x + this.width,
                    bottom: this.y + this.height
                };
            },
            render: function() {
                Draw.rectangle(this.x, this.y, this.width, this.height, {
                    backgroundColor: this.backgroundColor,
                    borderColor: this.borderColor,
                    borderWidth: this.borderWidth
                });
            }
        });
    });
    define("std/main", [ "std/collidable", "std/misc", "std/physical", "std/rendering" ], function() {});
    define("utils/main", [ "utils/ajax", "utils/dom-utils", "utils/doubly-linked-list", "utils/environment", "utils/extend", "utils/format", "utils/has-prop", "utils/json", "utils/trim" ], function(ajax, DomUtils, DoublyLinkedList, Environment, extend, format, hasProp, JSON, trim) {
        return {
            ajax: ajax,
            DomUtils: DomUtils,
            DoublyLinkedList: DoublyLinkedList,
            Environment: Environment,
            extend: extend,
            format: format,
            hasProp: hasProp,
            JSON: JSON,
            trim: trim
        };
    });
    define("main", [ "core/main", "std/main", "utils/main" ], function(Grape, std, Utils) {
        Grape.Utils = Utils;
        Grape.define = define;
        Grape.require = require;
        return Grape;
    });
    define("global-namespace", [ "main" ], function(Grape) {
        var global = Function("return this")();
        global.Grape = Grape;
        "function" == typeof global.define && global.define !== define && global.define([], function() {
            return Grape;
        });
        return Grape;
    });
    require("global-namespace");
})("function" == typeof require ? require : null);