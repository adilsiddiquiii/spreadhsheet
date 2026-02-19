import { DependencyGraph } from './dependencyGraph.js'
import { evaluateExpression } from './evaluator.js'

export class SpreadsheetEngine {
  constructor(rows = 50, cols = 50) {
    this.rows = rows
    this.cols = cols
    this.cells = new Map()
    this.graph = new DependencyGraph()
    this.dirty = new Set()
    this.cache = new Map()
  }

  getCellKey(row, col) {
    return this.indexToCell(row, col)
  }

  getCellCoords(cellKey) {
    const match = cellKey.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    const col = this.colToIndex(match[1])
    const row = parseInt(match[2]) - 1
    return { row, col }
  }

  colToIndex(col) {
    let index = 0
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
    }
    return index - 1
  }

  indexToCell(row, col) {
    let colStr = ''
    let colNum = col + 1
    while (colNum > 0) {
      colNum--
      colStr = String.fromCharCode(65 + (colNum % 26)) + colStr
      colNum = Math.floor(colNum / 26)
    }
    return colStr + (row + 1)
  }

  getCell(row, col) {
    const key = this.getCellKey(row, col)
    const cell = this.cells.get(key)
    if (!cell) {
      return { raw: '', computed: null, error: null }
    }
    return { ...cell }
  }

  setCell(row, col, raw) {
    const key = this.getCellKey(row, col)
    const oldCell = this.cells.get(key)
    
    this.graph.removeAllDependencies(key)
    this.cache.delete(key)
    
    if (!raw || raw.trim() === '') {
      this.cells.delete(key)
      this.markDirty(key)
      return
    }

    if (raw.startsWith('=')) {
      this.cells.set(key, { raw, computed: null, error: null })
      this.updateDependencies(key, raw)
      if (this.graph.hasCycle(key)) {
        this.graph.removeAllDependencies(key)
        this.cells.set(key, { raw, computed: null, error: '#CYCLE!' })
        this.markDirty(key)
        return
      }
    } else {
      this.cells.set(key, { raw, computed: null, error: null })
    }
    
    this.markDirty(key)
  }

  updateDependencies(cell, formula) {
    const deps = this.extractDependencies(formula)
    for (const dep of deps) {
      if (this.isValidCell(dep)) {
        this.graph.addDependency(cell, dep)
      }
    }
  }

  extractDependencies(formula) {
    const deps = new Set()
    const cellRegex = /([A-Z]+\d+)/g
    let match
    
    while ((match = cellRegex.exec(formula)) !== null) {
      deps.add(match[1])
    }
    
    return deps
  }

  isValidCell(cellKey) {
    const coords = this.getCellCoords(cellKey)
    if (!coords) return false
    return coords.row >= 0 && coords.row < this.rows && 
           coords.col >= 0 && coords.col < this.cols
  }

  markDirty(cell) {
    this.dirty.add(cell)
    const dependents = this.graph.getAllDependents(cell)
    for (const dep of dependents) {
      this.dirty.add(dep)
    }
  }

  getCellValue(cellKey, visited = new Set()) {
    if (visited.has(cellKey)) {
      return '#CYCLE!'
    }
    visited.add(cellKey)

    if (this.cache.has(cellKey)) {
      const cached = this.cache.get(cellKey)
      visited.delete(cellKey)
      return cached.error || cached.computed
    }

    const cell = this.cells.get(cellKey)
    if (!cell || !cell.raw) {
      visited.delete(cellKey)
      return 0
    }

    if (!cell.raw.startsWith('=')) {
      const num = parseFloat(cell.raw)
      const value = isNaN(num) ? cell.raw : num
      visited.delete(cellKey)
      return value
    }

    const result = evaluateExpression(cell.raw, (key) => {
      return this.getCellValue(key, visited)
    })

    visited.delete(cellKey)
    
    if (result.error) {
      this.cache.set(cellKey, { computed: null, error: result.error })
      return result.error
    }

    this.cache.set(cellKey, { computed: result.value, error: null })
    return result.value
  }

  recalculate() {
    const startTime = performance.now()
    let recalcCount = 0

    if (this.dirty.size === 0) {
      return { count: 0, time: 0 }
    }

    const affected = new Set(this.dirty)
    const sorted = this.graph.topologicalSort(affected)

    for (const cell of sorted) {
      if (this.dirty.has(cell)) {
        this.cache.delete(cell)
        this.getCellValue(cell)
        recalcCount++
      }
    }

    for (const cell of affected) {
      if (!sorted.includes(cell)) {
        this.cache.delete(cell)
        this.getCellValue(cell)
        recalcCount++
      }
    }

    this.dirty.clear()
    const endTime = performance.now()

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Engine] Recalculated ${recalcCount} cells in ${(endTime - startTime).toFixed(2)}ms`)
    }

    return { count: recalcCount, time: endTime - startTime }
  }

  checkCycle(cell) {
    this.updateDependencies(cell, this.cells.get(cell)?.raw || '')
    const hasCycle = this.graph.hasCycle(cell)
    this.graph.removeAllDependencies(cell)
    return hasCycle
  }

  insertRow(atIndex) {
    const snapshot = new Map()
    for (const [key, cell] of this.cells.entries()) {
      snapshot.set(key, { ...cell })
    }

    this.cells.clear()
    this.graph.clear()
    this.cache.clear()
    this.dirty.clear()

    for (const [key, cell] of snapshot.entries()) {
      const coords = this.getCellCoords(key)
      if (!coords) continue

      if (coords.row >= atIndex) {
        const newRow = coords.row + 1
        const newKey = this.getCellKey(newRow, coords.col)
        const shifted = this.shiftReferences(cell.raw, 1, 0, atIndex)
        this.cells.set(newKey, { ...cell, raw: shifted })
      } else {
        const shifted = this.shiftReferences(cell.raw, 1, 0, atIndex)
        this.cells.set(key, { ...cell, raw: shifted })
      }
    }

    this.rows++

    for (const [key, cell] of this.cells.entries()) {
      if (cell.raw.startsWith('=')) {
        this.updateDependencies(key, cell.raw)
      }
    }

    this.markAllDirty()
  }

  deleteRow(atIndex) {
    const snapshot = new Map()
    for (const [key, cell] of this.cells.entries()) {
      snapshot.set(key, { ...cell })
    }

    this.cells.clear()
    this.graph.clear()
    this.cache.clear()
    this.dirty.clear()

    for (const [key, cell] of snapshot.entries()) {
      const coords = this.getCellCoords(key)
      if (!coords) continue

      if (coords.row === atIndex) {
        continue
      } else if (coords.row > atIndex) {
        const newRow = coords.row - 1
        const newKey = this.getCellKey(newRow, coords.col)
        const shifted = this.shiftReferences(cell.raw, -1, 0, atIndex)
        this.cells.set(newKey, { ...cell, raw: shifted })
      } else {
        const shifted = this.shiftReferences(cell.raw, -1, 0, atIndex)
        this.cells.set(key, { ...cell, raw: shifted })
      }
    }

    this.rows--

    for (const [key, cell] of this.cells.entries()) {
      if (cell.raw.startsWith('=')) {
        this.updateDependencies(key, cell.raw)
      }
    }

    this.markAllDirty()
  }

  insertColumn(atIndex) {
    const snapshot = new Map()
    for (const [key, cell] of this.cells.entries()) {
      snapshot.set(key, { ...cell })
    }

    this.cells.clear()
    this.graph.clear()
    this.cache.clear()
    this.dirty.clear()

    for (const [key, cell] of snapshot.entries()) {
      const coords = this.getCellCoords(key)
      if (!coords) continue

      if (coords.col >= atIndex) {
        const newCol = coords.col + 1
        const newKey = this.getCellKey(coords.row, newCol)
        const shifted = this.shiftReferences(cell.raw, 0, 1, atIndex, true)
        this.cells.set(newKey, { ...cell, raw: shifted })
      } else {
        const shifted = this.shiftReferences(cell.raw, 0, 1, atIndex, true)
        this.cells.set(key, { ...cell, raw: shifted })
      }
    }

    this.cols++

    for (const [key, cell] of this.cells.entries()) {
      if (cell.raw.startsWith('=')) {
        this.updateDependencies(key, cell.raw)
      }
    }

    this.markAllDirty()
  }

  deleteColumn(atIndex) {
    const snapshot = new Map()
    for (const [key, cell] of this.cells.entries()) {
      snapshot.set(key, { ...cell })
    }

    this.cells.clear()
    this.graph.clear()
    this.cache.clear()
    this.dirty.clear()

    for (const [key, cell] of snapshot.entries()) {
      const coords = this.getCellCoords(key)
      if (!coords) continue

      if (coords.col === atIndex) {
        continue
      } else if (coords.col > atIndex) {
        const newCol = coords.col - 1
        const newKey = this.getCellKey(coords.row, newCol)
        const shifted = this.shiftReferences(cell.raw, 0, -1, atIndex, true)
        this.cells.set(newKey, { ...cell, raw: shifted })
      } else {
        const shifted = this.shiftReferences(cell.raw, 0, -1, atIndex, true)
        this.cells.set(key, { ...cell, raw: shifted })
      }
    }

    this.cols--

    for (const [key, cell] of this.cells.entries()) {
      if (cell.raw.startsWith('=')) {
        this.updateDependencies(key, cell.raw)
      }
    }

    this.markAllDirty()
  }

  shiftReferences(formula, rowShift, colShift, atIndex, isCol = false) {
    if (!formula || !formula.startsWith('=')) {
      return formula
    }

    return formula.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
      const colIdx = this.colToIndex(col)
      const rowIdx = parseInt(row) - 1

      let newRow = rowIdx
      let newCol = colIdx

      if (isCol) {
        if (colIdx >= atIndex) {
          newCol = colIdx + colShift
        }
      } else {
        if (rowIdx >= atIndex) {
          newRow = rowIdx + rowShift
        }
      }

      if (newRow < 0 || newCol < 0) {
        return match
      }

      return this.indexToCell(newRow, newCol)
    })
  }

  markAllDirty() {
    for (const key of this.cells.keys()) {
      this.dirty.add(key)
    }
  }

  getAllCells() {
    const result = []
    for (let r = 0; r < this.rows; r++) {
      const row = []
      for (let c = 0; c < this.cols; c++) {
        const cell = this.getCell(r, c)
        const value = this.getCellValue(this.getCellKey(r, c))
        row.push({
          raw: cell.raw,
          computed: typeof value === 'number' ? value : null,
          error: typeof value === 'string' && value.startsWith('#') ? value : null
        })
      }
      result.push(row)
    }
    return result
  }

  getSnapshot() {
    const snapshot = new Map()
    for (const [key, cell] of this.cells.entries()) {
      snapshot.set(key, { ...cell })
    }
    return snapshot
  }

  restoreSnapshot(snapshot) {
    this.cells.clear()
    for (const [key, cell] of snapshot.entries()) {
      this.cells.set(key, { ...cell })
    }
    this.graph.clear()
    this.cache.clear()
    this.dirty.clear()

    for (const [key, cell] of this.cells.entries()) {
      if (cell.raw.startsWith('=')) {
        this.updateDependencies(key, cell.raw)
      }
    }

    this.markAllDirty()
  }
}
