/* Copyright (c) 2011 Marcello Bastéa-Forte (marcello@cellosoft.com)
Modified by Xander Victory (x@xandervictory.id.au) 2015 (string minification)

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not be
    misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution. */
module.exports = function (object, filter, indent, startingIndent,stringsCB) {
  var seen = []
  return walk(object, filter, indent === undefined ? '  ' : (indent || ''), startingIndent || '', seen)

  function walk (object, filter, indent, currentIndent, seen) {
    var nextIndent = currentIndent + indent
    object = filter ? filter(object) : object

    switch (typeof object) {
      case 'string':
        return stringsCB ? stringsCB(object) : JSON.stringify(object)
      case 'boolean':
      case 'number':
      case 'undefined':
        return '' + object
      case 'function':
        return object.toString()
    }

    if (object === null) {
      return 'null'
    }
    if (object instanceof RegExp) {
      return stringifyRegExp(object)
    }
    if (object instanceof Date) {
      return 'new Date(' + object.getTime() + ')'
    }

    var seenIndex = seen.indexOf(object) + 1
    if (seenIndex > 0) {
      return '{$circularReference:' + seenIndex + '}'
    }
    seen.push(object)

    function join (elements) {
      return indent.slice(1) + elements.join(',' + (indent && '\n') + nextIndent) + (indent ? ' ' : '')
    }

    if (Array.isArray(object)) {
      return '[' + join(object.map(function (element) {
        return walk(element, filter, indent, nextIndent, seen.slice(), stringsCB)
      })) + ']'
    }
    var keys = Object.keys(object)
    return keys.length ? '{' + join(keys.map(function (key) {
      return (legalKey(key) ? key : JSON.stringify(key)) + ':' + walk(object[key], filter, indent, nextIndent, seen.slice(), stringsCB)
    })) + '}' : '{}'
  }
}

var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/

function legalKey (string) {
  return /^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string)
}

// Node.js 0.10 doesn't escape slashes in re.toString() or re.source
// when they were not escaped initially.
// Here we check if the workaround is needed once and for all,
// then apply it only for non-escaped slashes.
var isRegExpEscaped = (new RegExp('/')).source === '\\/'

function stringifyRegExp (re) {
  if (isRegExpEscaped) {
    return re.toString()
  }
  var source = re.source.replace(/\//g, function (found, offset, str) {
    if (offset === 0 || str[offset - 1] !== '\\') {
      return '\\/'
    }
    return '/'
  })
  var flags = (re.global && 'g' || '') + (re.ignoreCase && 'i' || '') + (re.multiline && 'm' || '')
  return '/' + source + '/' + flags
}
