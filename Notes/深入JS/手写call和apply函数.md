
### [Function.property.call()](（https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/call）)
>MDN: call() 方法使用一个指定的 this 值和单独给出的一个或多个参数来调用一个函数。

```js
Function.prototype.call = function (context) {
  context = context || window  // ① 
  let fn = Symbol('fn')   // ②
  context[fn] = this  // ③
  let args = [] // ④
  for (let i = 1, len = arguments.length; i < len; i++) {
    args.push('arguments[' + i + ']') // ⑤
  }
  let result = eval('context[fn](' + args + ')') // ⑥
  delete context[fn] // ⑦
  return result   // ⑧
}
```
① 判断是否传入了要绑定this的对象，如果没有传入或者传入的是null, 则表示要用window这个全局对象来调用函数，也就是最普通的全局调用。

② 通过Symbol创建一个唯一的值，为的是防止直接覆盖掉context中同名的属性值。

③ 将this(也就是调用call方法的函数)保存到context对象中。

④ 创建一个args数组，用于保存调用call方法时的剩余参数。

⑤ 循环参数列表，进行`arguments[i]`字符串的拼接，然后都推入args数组中, args最终是： `['arguments[1]', 'arguments[2]', 'arguments[3]', ...]`。

⑥ eval函数会将字符串当做js代码来执行，并且 `'context[fn](' + args + ')'` 这个拼接字符串的过程会调用数组的toString(),将数组转换为用 ，连接的字符串，最终执行的是： `context[fn](arguments1, arguments2, argument3, ...)`。

这里通过context来调用fn就是遵循了谁调用函数，那么函数的this就是谁的原则。

⑦ 将fn从context中删除，避免给context添加额外的方法。

⑧ 如果fn有返回值，将返回值返回。



### [Function.prototype.apply()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
> MDN: call()方法的作用和 apply() 方法类似，区别就是call()方法接受的是参数列表，而apply()方法接受的是一个参数数组。

apply方法的实现和call很类似：
```js
Function.property.apply = function (context, arr) {
  context = context || window
  let fn = Symbol('fn')
  context[fn] = this
  let result 
  if (!arr) {
    context[fn]()
  } else {
    let args = []
    for (let i = 0, len = arr.length; i < len; i++) {
      args.push('arr[' + i + ']' )
    }
    result = eval('context[fn](' + args + ')')
  }
  delete context[fn]
  return result
}
```

### End 
这里只是模拟call和apply的实现，并没有对边界情况做处理，如果想实现完整的call和apply，还需要参考v8引擎源码的实现，有时间再继续完善。



