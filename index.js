module.exports = function (babel) {
  let t = babel.types

  let preCode = function () {
    var _Op = (function () {
      'bpo disable'

      return {
        add(a, b) {
          return a.operatorAdd ? a.operatorAdd(b) : a + b
        },

        sub(a, b) {
          return a.operatorSub ? a.operatorSub(b) : a - b
        },

        mul(a, b) {
          return a.operatorMul ? a.operatorMul(b) : a * b
        },

        div(a, b) {
          return a.operatorDiv ? a.operatorDiv(b) : a / b
        },

        pow(a, b) {
          return a.operatorPow ? a.operatorPow(b) : a ** b
        },

        binaryAnd(a, b) {
          return a.operatorBinaryAnd ? a.operatorBinaryAnd(b) : a & b
        },

        binaryOr(a, b) {
          return a.operatorBinaryOr ? a.operatorBinaryOr(b) : a | b
        },

        binaryXor(a, b) {
          return a.operatorBinaryXor ? a.operatorBinaryXor(b) : a ^ b
        },

        binaryLShift(a, b) {
          return a.operatorBinaryLShift ? a.operatorBinaryLShift(b) : a << b
        },

        binaryRShift(a, b) {
          return a.operatorBinaryRShift ? a.operatorBinaryRShift : a >> b
        },

        binaryZRShift(a, b) {
          return a.operatorBinaryZRShift ? a.operatorZBinaryRShift : a >>> b
        },

        less(a, b) {
          if (a.operatorLess) return a.operatorLess(b)
          else if (b.operatorGreater) return b.operatorGreater(a)
          else if (a.operatorGreaterEqual) return !a.operatorGreaterEqual(b)
          else return a < b
        },

        greater(a, b) {
          if (a.operatorGreater) return a.operatorGreater(b)
          else if (b.operatorLess) return b.operatorLess(a)
          else if (a.operatorLessEqual) return !a.operatorLessEqual(b)
          else return a > b
        },

        lessEqual(a, b) {
          if (a.operatorLessEqual) return a.operatorLessEqual(b)
          else if (b.operatorGreaterEqual) return b.operatorGreaterEqual(a)
          else if (a.operatorGreater) return !a.operatorGreater(b)
          else return a <= b
        },

        greaterEqual(a, b) {
          if (a.operatorGreaterEqual) return a.operatorGreaterEqual(b)
          else if (b.operatorLessEqual) return b.operatorLessEqual(a)
          else if (a.operatorLess) return !a.operatorLess(b)
          else return a >= b
        },

        equal(a, b) {
          if (a.operatorEqual) return a.operatorEqual(b)
          else if (a.operatorNotEqual) return !a.operatorNotEqual(b)
          else if (b.operatorEqual) return b.operatorEqual(a)
          else if (b.operatorNotEqual) return !b.operatorNotEqual(a)
          else return a == b
        },

        notEqual(a, b) {
          if (a.operatorNotEqual) return a.operatorNotEqual(b)
          else if (a.operatorEqual) return !a.operatorEqual(b)
          else if (b.operatorNotEqual) return b.operatorNotEqual(a)
          else if (b.operatorEqual) return !b.operatorEqual(a)
          else return a != b
        },

        unaryNegation(a) {
          return a.operatorUnaryNegation
            ? a.operatorUnaryNegation()
            : a.operatorMul
            ? a.operatorMul(-1)
            : -a
        },
      }
    })()
  }.toString()

  let preCodeIn = preCode.slice(preCode.indexOf('{') + 1, preCode.lastIndexOf('}'))

  let preCodeAST = babel.template(preCodeIn)({})

  let initStatus = path => {
    let firstBlockStatement = path.findParent(
      path => t.isBlockStatement(path.node) || t.isProgram(path.node)
    )
    if (firstBlockStatement) {
      for (let directiveID in firstBlockStatement.node.directives) {
        let directive = firstBlockStatement.node.directives[directiveID]
        if (directive.value.value == 'bpo disable') {
          path.node.BPO_HAVE_DEFAULT = true
          path.node.BPO_STATUS = false
          break
        } else if (directive.value.value == 'bpo enable') {
          path.node.BPO_HAVE_DEFAULT = true
          path.node.BPO_STATUS = true
          break
        }
      }
      if (!path.node.BPO_HAVE_DEFAULT && firstBlockStatement.node.BPO_HAVE_DEFAULT) {
        path.node.BPO_HAVE_DEFAULT = true
        path.node.BPO_STATUS = firstBlockStatement.node.BPO_STATUS
      }
    }
    if (!path.node.BPO_HAVE_DEFAULT) {
      path.node.BPO_HAVE_DEFAULT = true
      path.node.BPO_STATUS = false
    }
  }

  return {
    visitor: {
      Program(path) {
        path.unshiftContainer('body', preCodeAST)
      },
      BlockStatement(path) {
        initStatus(path)
      },
      BinaryExpression(path) {
        initStatus(path)
        if (!path.node.BPO_STATUS) {
          return
        }

        let tab = {
          '+': 'add',
          '-': 'sub',
          '*': 'mul',
          '/': 'div',
          '**': 'pow',

          '&': 'binaryAnd',
          '|': 'binaryOr',
          '^': 'binaryXor',
          '<<': 'binaryLShift',
          '>>': 'binaryRShift',
          '>>>': 'binaryZRShift',

          '<': 'less',
          '>': 'greater',
          '<=': 'lessEqual',
          '>=': 'greaterEqual',
          '==': 'equal',
          '!=': 'notEqual',
        }

        let method = tab[path.node.operator]

        if (method == null) {
          return
        }

        path.replaceWith(
          t.callExpression(
            t.MemberExpression(t.identifier('_Op'), t.identifier(method)),
            [path.node.left, path.node.right]
          )
        )
      },
      UnaryExpression(path) {
        initStatus(path)
        if (!path.node.BPO_STATUS) {
          return
        }

        var tab = {
          '-': 'unaryNegation',
        }

        let method = tab[path.node.operator]

        if (method == null) {
          return
        }

        path.replaceWith(
          t.callExpression(
            t.MemberExpression(t.identifier('_Op'), t.identifier(method)),
            [path.node.argument]
          )
        )
      },
    },
  }
}
