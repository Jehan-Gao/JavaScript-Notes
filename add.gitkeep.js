const fs = require('fs')
const path = require('path')
const baseurl = path.resolve(__dirname)
const ignoreDir = ['.git', '.vscode', 'node_modules']
addGitkeep(baseurl)
function addGitkeep(url) {
 fs.readdir(url, {withFileTypes: true}, (err, files) => {
  err && console.log(err)
  //该目录下没有文件
  if (!files.length) {
   return fs.writeFile(url + '/.gitkeep', null, err => {
    err && console.log(err)
   })
  }
  files.forEach(dirent => {
   if (!ignoreDir.includes(dirent.name) && dirent.isDirectory()) {
    addGitkeep(url + '/' + dirent.name)
   }
  })
 })
}
