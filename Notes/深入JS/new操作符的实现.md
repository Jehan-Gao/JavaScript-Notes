### new 操作符的实现原理


```js
// 通过函数来实现new 操作符
/*
* @param {function} fn     构造函数
* @param {any}      args  调用构造函数的参数
* @return {object}  实例对象
*/
function newF (fn, ..args) {
  // 创建一个空对象
  var obj = {}

 // 将空对象的隐式原型指向构造函数的原型对象
 obj.__proto__ = fn.prototype

 // 用obj来调用构造函数，来改变构造函数中this的指向，并且同时还要将 调用构造函数时的参数传入
 var res = fn.apply(obj, args)

 // 返回实例对象 
 // 在构造函数中，我们可以去return返回一个值，当这个值的类型是 object的时候，那么就将这个
 // 返回值当作构造函数的实例对象，否则就忽略这个返回值，把obj当作构造函数的返回值
 return typeof res === 'object' ? res : obj
}
```