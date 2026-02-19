import { parse } from './parser.js'

export function evaluate(ast, getCellValue, visited = new Set()) {
  if (!ast) return 0

  if (ast.type === 'number') {
    return ast.value
  }

  if (ast.type === 'cell') {
    const key = ast.value
    if (visited.has(key)) {
      throw new Error('CIRCULAR')
    }
    visited.add(key)
    const value = getCellValue(ast.value, visited)
    visited.delete(key)
    return value
  }

  if (ast.type === 'range') {
    throw new Error('VALUE')
  }

  if (ast.type === 'binary') {
    const left = evaluate(ast.left, getCellValue, visited)
    const right = evaluate(ast.right, getCellValue, visited)
    
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error('VALUE')
    }

    switch (ast.operator) {
      case '+': return left + right
      case '-': return left - right
      case '*': return left * right
      case '/': 
        if (right === 0) throw new Error('VALUE')
        return left / right
      default: throw new Error('VALUE')
    }
  }

  if (ast.type === 'function') {
    const range = ast.range
    const cells = parseRange(range.start, range.end)
    const values = cells.map(cell => {
      const key = cell
      if (visited.has(key)) {
        throw new Error('CIRCULAR')
      }
      visited.add(key)
      const val = getCellValue(cell, visited)
      visited.delete(key)
      const num = parseFloat(val)
      return isNaN(num) ? 0 : num
    })

    switch (ast.name) {
      case 'SUM':
        return values.reduce((a, b) => a + b, 0)
      case 'AVG':
        if (values.length === 0) return 0
        return values.reduce((a, b) => a + b, 0) / values.length
      case 'MIN':
        if (values.length === 0) return 0
        return Math.min(...values)
      case 'MAX':
        if (values.length === 0) return 0
        return Math.max(...values)
      default:
        throw new Error('VALUE')
    }
  }

  throw new Error('VALUE')
}

function parseRange(start, end) {
  const startMatch = start.match(/^([A-Z]+)(\d+)$/)
  const endMatch = end.match(/^([A-Z]+)(\d+)$/)
  
  if (!startMatch || !endMatch) {
    throw new Error('REF')
  }

  const startCol = colToIndex(startMatch[1])
  const startRow = parseInt(startMatch[2]) - 1
  const endCol = colToIndex(endMatch[1])
  const endRow = parseInt(endMatch[2]) - 1

  const cells = []
  for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
    for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
      cells.push(indexToCell(r, c))
    }
  }
  return cells
}

function colToIndex(col) {
  let index = 0
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return index - 1
}

function indexToCell(row, col) {
  let colStr = ''
  let colNum = col + 1
  while (colNum > 0) {
    colNum--
    colStr = String.fromCharCode(65 + (colNum % 26)) + colStr
    colNum = Math.floor(colNum / 26)
  }
  return colStr + (row + 1)
}

export function evaluateExpression(expression, getCellValue) {
  try {
    if (!expression || expression.trim() === '') {
      return { value: '', error: null }
    }

    if (!expression.startsWith('=')) {
      return { value: expression, error: null }
    }

    const expr = expression.slice(1).trim()
    if (expr === '') {
      return { value: '', error: null }
    }

    const ast = parse(expr)
    const result = evaluate(ast, getCellValue)
    
    if (typeof result === 'number') {
      return { value: result, error: null }
    }
    
    return { value: result, error: null }
  } catch (error) {
    if (error.message === 'CIRCULAR') {
      return { value: null, error: '#CYCLE!' }
    }
    if (error.message === 'REF') {
      return { value: null, error: '#REF!' }
    }
    if (error.message === 'VALUE') {
      return { value: null, error: '#VALUE!' }
    }
    return { value: null, error: '#PARSE!' }
  }
}
