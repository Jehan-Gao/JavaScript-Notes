Function.prototype._call = function (context) {
  context = context || window  // ① 
  let fn = Symbol('fn')   // ②
  context[fn] = this  // ③
  let args = [] // ④
  for (let i = 1, len = arguments.length; i < len; i++) {
    args.push('arguments[' + i +']') // ⑤
  }
  let result = eval('context[fn](' + args + ')') // ⑥
  delete context[fn]// ⑦
  return result   // ⑧
}

let obj = {name: 1, fn: 2222}

function foo (num) {
  console.log(num, 'foo()')
}

foo._call(obj, [1,2,3])
console.log(obj)