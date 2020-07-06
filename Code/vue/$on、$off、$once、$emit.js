
// Vue init 初始化的时候 会生成一个事件对象 

function Vue () {

}

const vm = new Vue()

// 以null为原型创建一个对象，防止到时候添加进来的事件名在Object的原型中可以找到？？
vm._events = Object.create(null) 

/**
* @params {string | Array<string} event
* @params {Function} fn
*/
Vue.prototype.$on = function (event, fn) {
  const vm = this
  // 判断是数组的情况,如果是数组，还是通过this.$on这个方法本身去添加事件监听
  if (Array.isArray(event)) {
    for (let i =0, len = event.length; i < len; i++) {
      this.$on(event[i], fn)
    }
  } else {
    // 事件名对应的是数组，将fn都添加到对应的数组中去
    (vm._events[event] || (vm._events[event] = [])).push(fn)
  }
  return vm
}


/**
 * @params {string | Array<string>} event
 * @params {Function} fn
 * 不传任何参数，取消当前实例所有事件监听
 * 只传一个参数, 取消该事件名的所有监听
 * 如果两个都传，只移除这个fn回调的监听
*/
Vue.prototype.$off = function (event, fn) {
  const vm = this
  if (!arguments.length) {
    return vm._events = Object.create(null)
  }

  if (Array.isArray(event)) {
    for (let i =0, len = event.length; i < len; i++) {
      this.$off(event[i], fn)
    }
    return vm
  }

  // 如果找不到对应的事件名 直接退出
  const cbs = vm._events[event]
  if (!cbs) {
    return vm
  }

  if (arguments.length === 1) {
    vm._events[event] = null
    return vm
  }

  if (fn) {
    const cbs = vm._events[event]
    let cb
    let i = cbs.length
    /*注意细节：从后往前遍历的时候，删除一个元素，不会导致未遍历到的元素的位置改变，
    如果是从前往后遍历，删除一个元素，那么未遍历到的元素会往前移动，
    那么下次循环的时候就会跳过一个元素。
    */
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
  }

  return vm
}