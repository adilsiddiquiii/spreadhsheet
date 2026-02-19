import { tokenize } from './tokenizer.js'

const PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

function isOperator(token) {
  return token && token.type === 'operator' && ['+', '-', '*', '/'].includes(token.value)
}

function isFunction(token) {
  return token && token.type === 'function'
}

export function parse(expression) {
  const tokens = tokenize(expression)
  const output = []
  const operators = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'number' || token.type === 'cell') {
      output.push(token)
      i++
    } else if (token.type === 'function') {
      operators.push(token)
      i++
    } else if (token.type === 'operator') {
      while (operators.length > 0 && 
             operators[operators.length - 1].type === 'operator' &&
             PRECEDENCE[operators[operators.length - 1].value] >= PRECEDENCE[token.value]) {
        output.push(operators.pop())
      }
      operators.push(token)
      i++
    } else if (token.type === 'paren' && token.value === '(') {
      operators.push(token)
      i++
    } else if (token.type === 'paren' && token.value === ')') {
      while (operators.length > 0 && operators[operators.length - 1].value !== '(') {
        output.push(operators.pop())
      }
      if (operators.length > 0 && operators[operators.length - 1].value === '(') {
        operators.pop()
      }
      if (operators.length > 0 && isFunction(operators[operators.length - 1])) {
        const func = operators.pop()
        if (output.length > 0 && output[output.length - 1].type === 'range') {
          const range = output.pop()
          output.push({
            type: 'function',
            name: func.value,
            range: range
          })
        } else {
          output.push(func)
        }
      }
      i++
    } else if (token.type === 'range') {
      if (output.length < 2) {
        throw new Error('Invalid range syntax')
      }
      const end = output.pop()
      const start = output.pop()
      if (start.type !== 'cell' || end.type !== 'cell') {
        throw new Error('Range must be between two cell references')
      }
      output.push({ type: 'range', start: start.value, end: end.value })
      i++
    } else {
      i++
    }
  }

  while (operators.length > 0) {
    if (operators[operators.length - 1].value === '(') {
      throw new Error('Mismatched parentheses')
    }
    output.push(operators.pop())
  }

  return buildAST(output)
}

function buildAST(rpn) {
  const stack = []

  for (const token of rpn) {
    if (token.type === 'number' || token.type === 'cell') {
      stack.push(token)
    } else if (token.type === 'range') {
      stack.push(token)
    } else if (token.type === 'operator') {
      if (stack.length < 2) {
        throw new Error('Invalid expression')
      }
      const right = stack.pop()
      const left = stack.pop()
      stack.push({
        type: 'binary',
        operator: token.value,
        left,
        right
      })
    } else if (token.type === 'function') {
      if (token.range) {
        stack.push(token)
      } else {
        const funcName = token.value
        if (stack.length === 0) {
          throw new Error(`Function ${funcName} requires arguments`)
        }
        const arg = stack.pop()
        if (arg.type === 'range') {
          stack.push({
            type: 'function',
            name: funcName,
            range: arg
          })
        } else {
          throw new Error(`Function ${funcName} requires a range`)
        }
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid expression')
  }

  return stack[0]
}
