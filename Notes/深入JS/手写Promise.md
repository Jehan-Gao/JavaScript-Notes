##  1.写在前面的话
      手写  Promise是大厂经常出的一个题，网上有各个不同的版本，实现思路大同小异，都是根据Promise/A+规范实现的。然而在面试过程中短时间内实现一个符合规范的Promise,还是有一定难度的，接下来我们会根据规范逐步分析实现原理，形成一个最终版本。
        

##  2.什么是Promise/A+规范
        为实现者提供一个健全的、可互操作的  JavaScript  promise  的开放标准。

###  规范的基本要求
####  1.Promise的状态
一个Promise的当前状态必须是以下三种状态的一种：
-  等待状态（pending）
-  执行状态  （fulfilled）
-  拒绝状态  （rejected）

#####  等待状态（Pending）
-  可以改变成执行状态或者拒绝状态

#####  执行状态（Fulfilled）
-  当promise处于执行状态的时候，不能修改为其他状态
-  必须拥有一个不可变的终值（value）

#####  拒绝状态
-  当promise处于拒绝状态的时候，不能修改为其他状态
-  必须拥有一个不可变的拒绝的原因（reason）


####  2.  Then方法
一个promise必须提供一个then方法可以访问其当前值、终值和拒因。

promise的then方法接收两个参数
```
promise.then(onFulfilled,  onRejected)
```
#####  参数可选
onFulfilled和onRejected都是可选参数
-  如果onFulfilled不是函数，其必须被忽略
-  如果onRejected不是函数，其必须被忽略

#####  onFulfilled
如果onFulfilled是函数：
-  当promise执行结束后必须被调用，其第一个参数为promise的终值
-  在promise执行结束前不可被调用
-  其调用次数不超过一次

#####  onRejected
如果onRejected是函数:
-  当promise执行结束后必须被调用，其第一个参数为promise的拒因
-  在promise执行结束前不可被调用
-  其调用次数不超过一次

#####  调用时机
onFulfilled  和  onRejected  只有在执行环境堆栈仅包含平台代码时才可被调用。这里的平台代码指的是引擎、环境以及  promise  的实施代码。实践中要确保  onFulfilled  和  onRejected  方法异步执行，且应该在  then  方法被调用的那一轮事件循环之后的新执行栈中执行。
这个事件队列可以采用“宏任务（macro  -  task）”机制或者“微任务（micro  -  task）”机制来实现。
由于  promise  的实施代码本身就是平台代码（译者注：即都是  JavaScript），故代码自身在处理在处理程序时可能已经包含一个任务调度队列。

#####  调用要求
onFulfilled  和  onRejected  必须被作为函数调用

#####  多次调用
then  方法可以被同一个  promise  调用多次
-  当promise  成功执行时，所有的  onFulfilled需要按照其注册顺序依次回调

-  当  promise  被拒绝执行时，所有的  onRejected  需按照其注册顺序依次回调



#####  （以上规范要求参考于掘金）


##  3.  简单版本的Promise

```js
//  定义三种状态
        const  PENDING  =  'pending'
        const  FULFILLED  =  'fulfilled'
        const  REJECTED  =  'rejected'

        class  MyPromise  {
            constructor(fn)  {
                //  定义初始化状态
                this.state  =  PENDING
                //  定义终值
                this.value  =  null
                //  定义拒因
                this.reason  =  null
                //  成功状态的回调队列
                this.fulfilledCallbacks  =  []
                //  失败状态的回调队列
                this.rejectedCallbacks  =  []


                const  resolve  =  (value)  =>  {
                    //  使用macro-task(setTimout),保证fulfilled异步执行
                    setTimeout(()  =>  {
                        //  判断状态，确保只调用一次
                        if  (this.state  ===  PENDING)  {
                            //  修改状态
                            this.state  =  FULFILLED
                            //  保存终值
                            this.value  =  value
                            this.fulfilledCallbacks.forEach(cb  =>  this.value  =  cb(this.value))
                        }
                    })
                }

                const  reject  =  (reason)  =>  {
                    //  使用macro-task(setTimout),保证onRejected异步执行
                    setTimeout(()  =>  {
                        //  判断状态，确保只调用一次
                        if  (this.state  ===  PENDING)  {
                            //  修改状态
                            this.state  =  REJECTED
                            //  保存拒因
                            this.reason  =  reason
                            this.rejectedCallbacks.forEach(cb  =>  this.reason  =  cb(this.value))
                        }
                    })
                }

                try  {
                    //  调用传入的参数函数，传入resolve、reject
                    fn(resolve,  reject)
                }  catch  (e)  {
                    //  如果抛出异常  就调用reject(),接收拒因
                    reject(e)
                }
            }

            then(onFulfilled,  onRejected)  {
                //  判断传入的参数是否是函数，如果是将成功和失败的回调函数推入到队列中
                type of onFulfilled === 'function' && this.fulfilledCallbacks.push(onFulfilled)
        typeof onRejected === 'function' && this.rejectedCallbacks.push(onRejected)

        // 根据规范： then 方法可以被同一个 promise 调用多次，所以这里将this返回
        return this
      }
    }


    new MyPromise((resolve, reject) => {
      setTimeout(() => {
        resolve('data')
      }, 1000)
    })
    .then(res => {
      console.log('onFulfilled', res)
      return 'data2'
    })
    .then(res => {
      console.log('onFulfilled2', res)
    })

    // delay 1s ....
    // onFulfilled data
    // onFulfilled2 data2
```


到这里，我们已经根据规范的部分要求，实现了一个简单版本的Promise,这在大多数的手撕Promise场景中，已经可以满足要求。但是想要真正实现符合规范的Promise，我们还有很多细节要去实现。接下来我们根据规范一步一步分析。


## 4.进阶版

##### 规范对于then方法的要求：
- 1.then方法必须返回一个promise对象


- 2.如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)


- 3.如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e。


- 4.如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值。


- 5.如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因。


- 6.不论 promise1 被 reject 还是被 resolve 时 promise2 都会被 resolve，只有出现异常时才会被 rejected。

接下来我们去一一实现：

1. then方法必须返回一个promise对象

```js
then(onFulfilled, onRejected) {
    // 1.then方法必须返回一个promise对象
    let newPromise 
    return (newPromise = new MyPromise((resolve, reject) => {
    
    }))
}
```

2. 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)。

> 注解：
根据规范，我们需要接收onFulfilled 和 onRejected的返回值，并将新的promise和回调函数返回的值交给resolvePromise函数去处理。resolvePromise函数是用来处理新的promise的值的问题以及循环引用、以及不同版本的promise兼容等问题。

```js
then(onFulfilled, onRejected) {
    let newPromise 
    return (newPromise = new MyPromise((resolve, reject) => {
      this.fulfilledCallbacks.push(value => {
        // 2.如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)
        const x = onFulfilled(value)
        // Promise解决过程
        resolvePromise(newPromise, x)
      })
    
      this.rejectedCallbacks.push(reason => {
        const x = onRejected(this.reason)
         // Promise解决过程
        resolvePromise(newPromise, x)
      })
    }))
}

functon resolvePromise (promise2, x, resolve, reject) { ... }
```

3. 如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e。

```js
then(onFulfilled, onRejected) {
    let newPromise 
    return (newPromise = new MyPromise((resolve, reject) => {
      this.fulfilledCallbacks.push(value => {
        // 3.如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e。
        try {
          const x = onFulfilled(value)
          resolvePromise(newPromise, x)
        } catch (e) {
          reject(e)
        }
      })

      this.rejectedCallbacks.push(reason => {
        try {
          const x = onRejected(this.reason)
          resolvePromise(newPromise, x)
        } catch (e) {
          reject(e)
        }
      })
    }))
}
```

4. 如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值。

5. 如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因。

> 注解：
根据规范，当onFufilled不是函数的时候，我们需要为onFufilled指定一个函数，并将传入的值返回，用x接收，传入给resolvePromise，resolvePromise最终返回相同的值。
当onRejected不是函数的时候，我们需要为onRejected函数指定一个函数，并且抛出错误，直接到catch里，执行promise2(新的promise)的reject.


```js
then(onFulfilled, onRejected) {
    let newPromise 
    // 4.如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值。
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    // 5.如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因。
    onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}
    
    return (newPromise = new MyPromise((resolve, reject) => {
      this.fulfilledCallbacks.push(value => {
        try {
          const x = onFulfilled(value)
          resolvePromise(newPromise, x)
        } catch (e) {
          reject(e)
        }
      })

      this.rejectedCallbacks.push(reason => {
        try {
          const x = onRejected(reason)
          resolvePromise(newPromise, x)
        } catch (e) {
          reject(e)
        }
      })
    }))
}
```

6. 不论 promise1 被 reject 还是被 resolve 时 promise2 都会被 resolve，只有出现异常时才会被 rejected

> 注解：根据规范，之前的promise无论执行了resolve还是reject，都要被promise2(新的promsie)resolve,只有之前的promise抛异常的时候，才会被catch抓到，执行rejected。

```js
举例：
new Promise(reject(1))
.then(res => {}, e => {return 3})
.then(res => {console.log(res)}) 
// 3
即使第一个promise状态是失败的，调用了失败的回调函数，但是then返回的新的promise都会调用resolve,从而执行新的promise指定的成功的回调函数
```

```js
then(onFulfilled, onRejected) {
    let newPromise 
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}
    return (newPromise = new MyPromise((resolve, reject) => {
      this.fulfilledCallbacks.push(value => {
        try {
          const x = onFulfilled(value)
          // 6. 将resolve, reject作为参数传入
          resolvePromise(newPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })

      this.rejectedCallbacks.push(reason => {
        try {
          const x = onRejected
          // 将resolve, reject作为参数传入
          resolvePromise(newPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    }))
}
```

7. 这这里，then方法我们已经完成一大半了，但是我们还需要注意一点：
根据规范，一个promise可以多次调用then方法，当调用完第一次then方法的时候，promise的状态已经被修改为fulfilled或者rejected状态，那么再调用then的时候，也要异步执行onFulfilled或onRejected。所以我们还需要在then方法中对promise的状态进行判断。

```js
then(onFulfilled, onRejected) {
    let newPromise
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
    if (this.state === PENDING) {
      return (newPromise = new MyPromise((resolve, reject) => {
        this.fulfilledCallbacks.push(value => {
          try {
            const x = onFulfilled(value)
            resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })

        this.rejectedCallbacks.push(reason => {
          try {
            const x = onRejected(reason)
            resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }))
    }
    if (this.state === FULFILLED) {
      return (newPromise = new MyPromise((resolve, reject) => {
      // 异步执行onFulfilled
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value)
            resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }))
    }
    if (this.state === REJECTED) {
      return (newPromise = new MyPromise((resolve, reject) => {
      // 异步执行onRejected
        setTimeout(() => {
          try {
            const x = onRejected(this.reason)
            resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }))
    }
}
```

到这里，我们已经完成了完整的then方法。


## 5.Promise的解决过程

Promise的解决过程理解起来相对复杂。我们先要了解Promise的解决过程要做哪些事情：

> Promise 解决过程是一个抽象的操作，其需输入一个 promise 和一个值，我们表示为 [[Resolve]](promise, x)，如果 x 有 then 方法且看上去像一个 Promise ，解决程序即尝试使 promise 接受 x 的状态；否则其用 x 的值来执行 promise 。

通过解读上面这段话，说明只要遵循Promise/A+规范，实现了一个对象拥有then方法，看起来像一个promise对象就可以，这样做的好处就是我们可以兼容不同版本的promise,而不单单是es6规范的promise(比如jQuery中的promise:Deferred和ES6中的promise)
。

### [[Resolve]](promise, x)的执行步骤：

#### 1. x 与 promise相等
如果x与promise是同一对象，用TypeError为拒因拒绝执行promise

```js
function resolvePromise(promise2, x, resolve, reject) {
    // 如果onFulfilled中返回的值是promise2本身，则会循环引用，报错
    // 如果x与promise是同一对象，用TypeError为拒因拒绝执行promise
      if (x === promise2) {
        reject(new TypeError('循环引用'))
      }
}
```

#### 2. x为Promise
- 如果 x 为 Promise ，则使 promise 接受 x 的状态。

- 如果 x 处于等待态， promise 需保持为等待态直至 x 被执行或拒绝。
- 如果 x 处于执行态，用相同的值执行 promise。
- 如果 x 处于拒绝态，用相同的据因拒绝 promise。


```js
function resolvePromise(promise2, x, resolve, reject) {
      if (x === promise2) {
        reject(new TypeError('循环引用'))
      }
      // 如果x是promise
      if (x instanceof MyPromise) {
      // 调用then方法，传入成功回调和失败回调
        x.then(
          y => {
            // 递归调用，用同样的逻辑解析y
            resolvePromise(promise2, y, resolve, reject)
          },
          resaon => {
            reject(reason)
          }
        )
      } 
}
```

#### 3. x 为对象或函数
- 如果 x 为对象或者函数：

- 把 x.then 赋值给 then。

- 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise。


- 如果 then 是函数，将 x 作为函数的作用域 this 调用之。传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise:

    - 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
    - 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
    - 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
    如果调用 then 方法抛出了异常 e：

        - 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
        - 否则以 e 为据因拒绝 promise


- 如果 then 不是函数，以 x 为参数执行 promise



- 如果 x 不为对象或者函数，以 x 为参数执行 promise


```js
function resolvePromise(promise2, x, resolve, reject) {
      if (x === promise2) {
        reject(new TypeError('循环引用'))
      }
      if (x instanceof MyPromise) {
        x.then(
          y => {
            resolvePromise(promise2, y, resolve, reject)
          },
          resaon => {
            reject(reason)
          }
        )
      } else if (x && (typeof x === 'object' || typeof x === 'function')) {
        // 一个变量标识，避免既调用成功的回调，又调用失败的回调
        let called = false 
        try {
          // 将then取出进行判断
          let then = x.then
          // 如果then是函数
          if (typeof then === 'function') {
            // 让x来调用它的then方法
            then.call(
              x, 
              // 指定一个成功的回调
              y => {
                // 这里对called判断是因为如果x内部既调用了成功的回调，也调用了失败的回调，那么只对最先调用的函数做处理
                if (called) return
                called = true
                // 同样还是递归处理，解析y，直至把y解析成普通值
                resolvePromise(promise2, y, resolve, reject)
              },
              // 指定一个失败的回调
              reason => {
                if (called) return
                called = true
                // 用这个拒因拒绝promise
                reject(reason)
              }
            )
          } else {
            // 如果then不是函数，则以x为参数，执行promise
            resolve(x)
          }
        } catch (e) {
          // 如果x.then抛出异常，并且上面指定的成功的回调或者失败的回调已经调用，则忽略
          // 否则用e为拒因拒绝执行promise
          if (called) return
          called = true
          reject(e)
        }        
      } else { // 如果x不是对象或函数，则用x为参数执行promise
        resolve(x)
      }
}
```


以上我们就完成了对resolvePromise的实现，个人觉得这里理解起来比较费劲，需要从宏观的角度去考虑，而不单单局限于es6版本的promise。



### 6.最终版
```js
// 定义三种状态
    const PENDING = 'pending'
    const FULFILLED = 'fulfilled'
    const REJECTED = 'rejected'

    class MyPromise {
      constructor(fn) {
        this.state = PENDING
        this.value = null
        this.reason = null
        this.fulfilledCallbacks = []
        this.rejectedCallbacks = []

        const reject = (reason) => {
          setTimeout(() => {
            if (this.state === PENDING) {
              this.state = REJECTED
              this.reason = reason
              this.rejectedCallbacks.forEach(cb => this.reason = cb(this.value))
            }
          })
        }

        const resolve = (value) => {
          // 新增： 如果在第一次new Promise的过程中，resolve传入的value是另外一个promise对象，
          // 那么需要对这个value进行处理，拿到另外一个promise对象的value值，作为本次promise的value的值进行传递
          if (value instanceof MyPromise) {
            return value.then(resolve,reject)
          }
          setTimeout(() => {
            if (this.state === PENDING) {
              this.state = FULFILLED
              this.value = value
              this.fulfilledCallbacks.forEach(cb => this.value = cb(this.value))
            }
          })
        }

        try {
          fn(resolve, reject)
        } catch (e) {
          reject(e)
        }
      }

      then(onFulfilled, onRejected) {
        let newPromise
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
        if (this.state === PENDING) {
          return (newPromise = new MyPromise((resolve, reject) => {
            this.fulfilledCallbacks.push(value => {
              try {
                const x = onFulfilled(value)
                resolvePromise(newPromise, x, resolve, reject)
              } catch (e) {
                reject(e)
              }
            })

            this.rejectedCallbacks.push(reason => {
              try {
                const x = onRejected(reason)
                resolvePromise(newPromise, x, resolve, reject)
              } catch (e) {
                reject(e)
              }
            })
          }))
        }
        if (this.state === FULFILLED) {
          return (newPromise = new MyPromise((resolve, reject) => {
            setTimeout(() => {
              try {
                const x = onFulfilled(this.value)
                resolvePromise(newPromise, x, resolve, reject)
              } catch (e) {
                reject(e)
              }
            })
          }))
        }
        if (this.state === REJECTED) {
          return (newPromise = new MyPromise((resolve, reject) => {
            setTimeout(() => {
              try {
                const x = onRejected(this.reason)
                resolvePromise(newPromise, x, resolve, reject)
              } catch (e) {
                reject(e)
              }
            })
          }))
        }
      }
    }

    function resolvePromise(promise2, x, resolve, reject) {
      if (x === promise2) {
        reject(new TypeError('循环引用'))
      }
      if (x instanceof MyPromise) {
        x.then(
          y => {
            resolvePromise(promise2, y, resolve, reject)
          },
          resaon => {
            reject(reason)
          }
        )
      } else if (x && (typeof x === 'object' || typeof x === 'function')) {
        let called = false 
        try {
          let then = x.then
          if (typeof then === 'function') {
            then.call(
              x, 
              y => {
                if (called) return
                called = true
                resolvePromise(promise2, y, resolve, reject)
              },
              reason => {
                if (called) return
                called = true
                reject(reason)
              }
            )
          } else {
            resolve(x)
          }
        } catch (e) {
          if (called) return
          called = true
          reject(e)
        }        
      } else { 
        resolve(x)
      }
}

    const p2 = new MyPromise((resolve, reject) => {
      resolve('p2')
    })

    new MyPromise((resolve, reject) => {
      setTimeout(() => {
      // 这里resolve传入的也是一个promise对象，所以要对resolve传入的vlaue进行处理，达到值的透传的效果(见resolve中新增的注释)
        resolve(p2)
      }, 1000)
    })
      .then(res => {
        console.log('onFulfilled', res)
        return 'data2'
      })
      .then(res => {
        console.log('onFulfilled2', res)
      })

    // delay 1s ....
    // onFulfilled p2
    // onFulfilled2 data2
```


### 7. Promise其他方法的实现

#### 1.Promise.resove 和 Promise.reject
```js
MyPromise.resolve = function (value) {
    return new Mypromise((resolve, reject) => {
        resolve(value)
    })
}

MyPromise.reject = function (reason) {
    return new MyPromise((resolve, reject) => {
        reject(reason)
    })
}
```

#### 2. promise.catch 

```js
MyPromise.property.catch = function (onRejected) {
    return this.then(null, onRejected)
}
```

#### 3.Promise.all 和 Promise.race

```js
MyPromise.all = function (promise) {
    return new MyPromise((resolve, reject) => {
        let result = [], count = 0
        for (let i = 0, len = promise.length; i < len; i++) {
            const p = promise[i]
            p.then(((data) => {
                processData(i, data)
            }), reject)
        }
        
        function processData(index, data) {
            result[index] = data
            if (++count == promise.length) {
                resolve(result)
            }
        }
    })
}


MyPromise.race = function (promise) {
    return new MyPromise((resolve, reject) => {
        for (let i = 0, len = promise.length; i < len; i++) {
            const p = promise[i]
            p.then(resolve, reject)
        }
    })
}
```






