export function tokenize(expression) {
  const tokens = []
  let i = 0
  const len = expression.length

  while (i < len) {
    const char = expression[i]

    if (char === ' ') {
      i++
      continue
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      i++
      continue
    }

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === ',') {
      tokens.push({ type: 'operator', value: char })
      i++
      continue
    }

    if (char === ':') {
      tokens.push({ type: 'range', value: ':' })
      i++
      continue
    }

    if (char >= '0' && char <= '9' || char === '.') {
      let num = ''
      while (i < len && ((expression[i] >= '0' && expression[i] <= '9') || expression[i] === '.')) {
        num += expression[i]
        i++
      }
      tokens.push({ type: 'number', value: parseFloat(num) })
      continue
    }

    if ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')) {
      let ident = ''
      while (i < len && ((expression[i] >= 'A' && expression[i] <= 'Z') || 
                         (expression[i] >= 'a' && expression[i] <= 'z') ||
                         (expression[i] >= '0' && expression[i] <= '9'))) {
        ident += expression[i].toUpperCase()
        i++
      }

      if (i < len && expression[i] === ':') {
        tokens.push({ type: 'cell', value: ident })
      } else {
        const cellMatch = ident.match(/^([A-Z]+)(\d+)$/)
        if (cellMatch) {
          tokens.push({ type: 'cell', value: ident })
        } else {
          tokens.push({ type: 'function', value: ident })
        }
      }
      continue
    }

    throw new Error(`Unexpected character: ${char}`)
  }

  return tokens
}
