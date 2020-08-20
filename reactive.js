// vue2.0 响应式缺陷：
// 1. 默认递归，性能较差
// 2. 不支持数组length
// 3. 不支持对象没有初始化的属性

// vue3.0 响应式原理

// 注意：
// 需要做记录。如果原对象代理过了，或者本身是proxy对象，不再重复代理，否则会new多次或者多层代理
// 解决方法：弱引用映射表
let toProxyMap = new WeakMap() // {原对象：被代理过的对象}
let toRayMap = new WeakMap() // {被代理过的对象：原对象}


// 1. 判断是不是对象
function isObject(target) {
    if (Object.prototype.toString.call(target) === "[object Object]") {
        return true
    } else {
        return false
    }
}

// 2. 响应式的核心方法
function reactive(target) {
    return createReactiveObj(target)
}

// 3. 创建响应式对象
function createReactiveObj(target) {
    if (!isObject(target)) {
        // 如果不是对象，直接返回
        return target
    }

    if (toProxyMap.get(target)) {
        // 如果映射中的target键有值，说明target已经代理过，直接返回target的代理结果
        return toProxyMap.get(target)
    }
    if (toRayMap.has(target)) {
        // 如果映射中有target键，说明target本身就是被代理过的proxy对象，直接返回
        return target
    }

    // 配置proxy的handler，即要劫持的方法
    let handler = {
        // 访问
        // @params receiver 当前proxy对象，一般不用
        get(target, key, receiver) {
            console.log('访问属性', target, key)
            // return target[key]
            let result = Reflect.get(target, key, receiver)

            if (isObject(result)) {
                return reactive(result) // 递归
            }
            return result
        },
        // 设置
        set(target, key, newVal, receiver) {
            console.log('设置属性', target, key, newVal)
            // 写法一：如果设置没成功，比如是只读属性，没有任何提示。不用该写法
            // target[key] = newVal
            // 写法二：设置成功失败都有返回值，布尔类型
            const bool = Reflect.set(target, key, newVal, receiver)
            console.log('设置结果', bool)
            return bool
        },
        // 删除
        deleteProperty(target, key) {
            console.log('删除属性', target, key)
            // 写法一问题同set
            // delete target[key]
            // 采用写法二
            const bool = Reflect.deleteProperty(target, key)
            console.log('删除结果', bool)
            return bool
        }
    }

    let observed = new Proxy(target, handler)
    // 记录映射
    toProxyMap.set(target, observed) // 原对象：代理过的对象
    toRayMap.set(observed, target) // 代理过的对象：原对象

    return observed
}

const proxy = reactive({
    name: 'Truman',
    age: 27,
    hobby: {
        run: true,
        swim: true,
        dance: false
    }
})

console.log('-----单层对象-----')
let name = proxy.name // 访问
proxy.name = 'Gao' // 设置
delete proxy.name // 删除
console.log("操作对象结果", JSON.parse(JSON.stringify(proxy)))

console.log('-----多层对象-----')
let run = proxy.hobby.run // // 访问，多层代理用get方法判断
proxy.hobby.swim = false // // 设置
delete proxy.hobby.dance // // 删除
console.log("操作对象结果", JSON.parse(JSON.stringify(proxy)))


// 附注：
// 1. WeakMap结构与Map结构基本类似，唯一的区别是它只接受对象作为键名（null除外），不接受其他类型的值作为键名，而且键名所指向的对象，不计入垃圾回收机制。
// 2. WeakMap的设计目的在于，键名是对象的弱引用（垃圾回收机制不将该引用考虑在内），所以其所对应的对象可能会被自动回收。当对象被回收后，WeakMap自动移除对应的键值对。
// 3. 典型应用是，一个对应DOM元素的WeakMap结构，当某个DOM元素被清除，其所对应的WeakMap记录就会自动被移除。基本上，WeakMap的专用场合就是，它的键所对应的对象，可能会在将来消失。WeakMap结构有助于防止内存泄漏。
// 4. WeakMap与Map在API上的区别主要是两个，一是没有遍历操作（即没有key()、values()和entries()方法），也没有size属性；二是无法清空，即不支持clear方法。这与WeakMap的键不被计入引用、被垃圾回收机制忽略有关。
// 5. WeakMap只有四个方法可用：get()、set()、has()、delete()。

// @TODO 33分暂停