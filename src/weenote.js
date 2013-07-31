var marked = require("marked")
var highlight = require("./highlighter").highlight

function readURI(uri, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", uri, true)
  xhr.onloadend = function() {
    callback(xhr.error, xhr.responseText)
  }
  xhr.onerror = function() {
    callback(xhr.error)
  }
  xhr.send()
}

function parseEnv() {
  return window.location.search.substr(1).split("&").reduce(function(env, part) {
    var pair = part.split("=")
    env[decodeURIComponent(pair.shift())] = decodeURIComponent(pair.shift())
    return env
  }, {})
}

function reflow() {
  var el = document.body.firstChild
  var style = el.style
  var i = 1000
  var top
  var left

  style.display  = "block"
  style.fontSize = i + "em"
  style.position = "absolute"
  style.padding = 0;
  style.margin = 0;

  while (1) {
    left = innerWidth - el.offsetWidth
    top  = innerHeight - el.offsetHeight

    if (top > 0 && left > 0) break

    style.fontSize = (i -= i * 0.05) + "em"
  }

  style.display = "block"
  style.top     = top / 2 + "px"
  style.left    = left / 2 + "px"
}


function makeSwitch(slides) {
  return function() {
    var body = document.body
    var id = location.hash.match(/\d+/)
    var source = slides[id] || slides[0]
    body.innerHTML = source
    reflow()
  }
}

function main() {
  var env = parseEnv();
  readURI(env.uri, function(error, content) {
    var slides = marked.lexer(content).map(function(node) {
      return node.type === "code" ? highlight(node.text) :
                           marked.parse(node.text.trim())
    });
    var render = makeSwitch(slides)
    window.onhashchange = render
    render()
  })
}

function swapSlide(diff) {
  var index = 0 | parseInt(location.hash.match(/\d+/)) + diff
  location.hash = index <= 0 ? 0 : index;
}

function keyNavigation(e) {
  if (e.which === 39) swapSlide(1)
  else if (e.which === 37) swapSlide(-1)
}

function touchNavigation(e) {
  if (e.target.href) return
  swapSlide(e.touches[0].pageX > innerWidth / 2 ? 1 : -1)
}

function fullscreen(e) {
  // Full screen shortcut ⌥ P
  if (e.altKey && e.which === 960) {
    if (document.body.requestFullScreen)
      document.body.requestFullScreen()
    else if (document.body.mozRequestFullScreen)
      document.body.mozRequestFullScreen()
    else if (document.body.webkitRequestFullScreen)
      document.body.webkitRequestFullScreen()
    location.hash = location.hash
  }
}

window.addEventListener("DOMContentLoaded", main);
document.onkeydown = keyNavigation
document.ontouchstart = touchNavigation
document.onkeypress = fullscreen
window.onresize = reflow
