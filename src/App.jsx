import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import './App.css'
import { createEngine } from './engine/core.js'

const TOTAL_ROWS = 50
const TOTAL_COLS = 50

export default function App() {
  // Engine instance is created once and reused across renders
  // Note: The engine maintains its own internal state, so React state is only used for UI updates
  const [engine] = useState(() => {
    let core;
    try {
      const saved = localStorage.getItem("spreadsheet-data")
      if (saved) {
        const data = JSON.parse(saved)
        core = createEngine(data.rows || TOTAL_ROWS, data.cols || TOTAL_COLS)
        if (data.cells) {
          for (const cell of data.cells) {
            core.setCell(cell.r, cell.c, cell.raw)
          }
        }
      }
    } catch (e) {
      console.error("Corrupted local storage data", e)
    }
    if (!core) core = createEngine(TOTAL_ROWS, TOTAL_COLS)
    
    // Wrapper to handle grouped undo/redo from the UI side transparently
    const undoSizes = []
    const redoSizes = []
    let isBatching = false
    let currentBatch = 0
    
    return {
      get rows() { return core.rows },
      get cols() { return core.cols },
      getCell: (r, c) => core.getCell(r, c),
      
      startBatch: () => { isBatching = true; currentBatch = 0 },
      endBatch: () => { 
        if (currentBatch > 0) {
          undoSizes.push(currentBatch)
          redoSizes.length = 0
        }
        isBatching = false 
      },
      
      setCell: (r, c, val) => {
        const prev = core.getCell(r, c).raw
        if (prev !== val) {
          core.setCell(r, c, val)
          if (isBatching) {
            currentBatch++
          } else {
            undoSizes.push(1)
            redoSizes.length = 0
          }
        }
      },
      insertRow: (i) => { core.insertRow(i); undoSizes.push(1); redoSizes.length = 0 },
      deleteRow: (i) => { core.deleteRow(i); undoSizes.push(1); redoSizes.length = 0 },
      insertColumn: (i) => { core.insertColumn(i); undoSizes.push(1); redoSizes.length = 0 },
      deleteColumn: (i) => { core.deleteColumn(i); undoSizes.push(1); redoSizes.length = 0 },
      
      undo: () => {
        const size = undoSizes.pop()
        if (!size) return false
        let success = false
        for (let i = 0; i < size; i++) if (core.undo()) success = true
        if (success) redoSizes.push(size)
        return success
      },
      redo: () => {
        const size = redoSizes.pop()
        if (!size) return false
        let success = false
        for (let i = 0; i < size; i++) if (core.redo()) success = true
        if (success) undoSizes.push(size)
        return success
      },
      canUndo: () => undoSizes.length > 0,
      canRedo: () => redoSizes.length > 0
    }
  })
  const [version, setVersion] = useState(0)
  const [selectedCell, setSelectedCell] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  // Cell styles are stored separately from engine data
  // Format: { "row,col": { bold: bool, italic: bool, ... } }
  const [cellStyles, setCellStyles] = useState(() => {
    try {
      const saved = localStorage.getItem("spreadsheet-data")
      if (saved) {
        const data = JSON.parse(saved)
        return data.styles || {}
      }
    } catch {
      // Ignore if local storage is corrupted
    }
    return {}
  })
  // Sorting state
const [sortState, setSortState] = useState({
  column: null,
  direction: null // "asc" | "desc" | null
})

// Filtering state
const [filters, setFilters] = useState({})
const [openFilter, setOpenFilter] = useState(null)
  const cellInputRef = useRef(null)

  const forceRerender = useCallback(() => setVersion(v => v + 1), [])

  // ────── Cell style helpers ──────

  const getCellStyle = useCallback((row, col) => {
    const key = `${row},${col}`
    return cellStyles[key] || {
      bold: false, italic: false, underline: false,
      bg: 'white', color: '#202124', align: 'left', fontSize: 13
    }
  }, [cellStyles])

  const updateCellStyle = useCallback((row, col, updates) => {
    const key = `${row},${col}`
    setCellStyles(prev => ({
      ...prev,
      [key]: { ...getCellStyle(row, col), ...updates }
    }))
  }, [getCellStyle])

  // ────── Cell editing ──────

  const startEditing = useCallback((row, col) => {
    setSelectedCell({ r: row, c: col })
    setEditingCell({ r: row, c: col })
    const cellData = engine.getCell(row, col)
    setEditValue(cellData.raw)
    setTimeout(() => cellInputRef.current?.focus(), 0)
  }, [engine])

  const commitEdit = useCallback((row, col) => {
    // Only commit if the value actually changed to avoid unnecessary recalculations
    const currentCell = engine.getCell(row, col)
    if (currentCell.raw !== editValue) {
      engine.setCell(row, col, editValue)
      forceRerender()
    }
    setEditingCell(null)
  }, [engine, editValue, forceRerender])

  const handleCellClick = useCallback((row, col) => {
    if (editingCell && (editingCell.r !== row || editingCell.c !== col)) {
      commitEdit(editingCell.r, editingCell.c)
    }
    if (!editingCell || editingCell.r !== row || editingCell.c !== col) {
      startEditing(row, col)
    }
  }, [editingCell, commitEdit, startEditing])

  // ────── Keyboard navigation ──────

  const handleKeyDown = useCallback((event, row, col) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit(row, col)
      startEditing(Math.min(row + 1, engine.rows - 1), col)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      commitEdit(row, col)
      startEditing(row, Math.min(col + 1, engine.cols - 1))
    } else if (event.key === 'Escape') {
      setEditValue(engine.getCell(row, col).raw)
      setEditingCell(null)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      commitEdit(row, col)
      startEditing(Math.min(row + 1, engine.rows - 1), col)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      commitEdit(row, col)
      startEditing(Math.max(row - 1, 0), col)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      commitEdit(row, col)
      if (col > 0) {
        startEditing(row, col - 1)
      } else if (row > 0) {
        startEditing(row - 1, engine.cols - 1)
      }
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      commitEdit(row, col)
      startEditing(row, Math.min(col + 1, engine.cols - 1))
    }
  }, [engine, commitEdit, startEditing])

  // ────── Formula bar handlers ──────

  const handleFormulaBarKeyDown = useCallback((event) => {
    if (!editingCell) return
    handleKeyDown(event, editingCell.r, editingCell.c)
  }, [editingCell, handleKeyDown])

  const handleFormulaBarFocus = useCallback(() => {
    if (selectedCell && !editingCell) {
      setEditingCell(selectedCell)
      setEditValue(engine.getCell(selectedCell.r, selectedCell.c).raw)
    }
  }, [selectedCell, editingCell, engine])

  const handleFormulaBarChange = useCallback((value) => {
    if (!editingCell && selectedCell) setEditingCell(selectedCell)
    setEditValue(value)
  }, [editingCell, selectedCell])

  // ────── Undo / Redo ──────

  const handleUndo = useCallback(() => { if (engine.undo()) forceRerender() }, [engine, forceRerender])
  const handleRedo = useCallback(() => { if (engine.redo()) forceRerender() }, [engine, forceRerender])

  // ────── Formatting toggles ──────

  const toggleBold = useCallback(() => {
    if (!selectedCell) return
    const style = getCellStyle(selectedCell.r, selectedCell.c)
    updateCellStyle(selectedCell.r, selectedCell.c, { bold: !style.bold })
  }, [selectedCell, getCellStyle, updateCellStyle])

  const toggleItalic = useCallback(() => {
    if (!selectedCell) return
    const style = getCellStyle(selectedCell.r, selectedCell.c)
    updateCellStyle(selectedCell.r, selectedCell.c, { italic: !style.italic })
  }, [selectedCell, getCellStyle, updateCellStyle])

  const toggleUnderline = useCallback(() => {
    if (!selectedCell) return
    const style = getCellStyle(selectedCell.r, selectedCell.c)
    updateCellStyle(selectedCell.r, selectedCell.c, { underline: !style.underline })
  }, [selectedCell, getCellStyle, updateCellStyle])

  const changeFontSize = useCallback((size) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { fontSize: size })
  }, [selectedCell, updateCellStyle])

  const changeAlignment = useCallback((align) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { align })
  }, [selectedCell, updateCellStyle])

  const changeFontColor = useCallback((color) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { color })
  }, [selectedCell, updateCellStyle])

  const changeBackgroundColor = useCallback((color) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { bg: color })
  }, [selectedCell, updateCellStyle])

  // ────── Clear operations ──────

  const clearSelectedCell = useCallback(() => {
    if (!selectedCell) return
    engine.setCell(selectedCell.r, selectedCell.c, '')
    forceRerender()
    // Remove style entry for cleared cell
    // Note: This deletes the style object entirely - if you need to preserve default styles,
    // you may want to set them explicitly rather than deleting
    const key = `${selectedCell.r},${selectedCell.c}`
    setCellStyles(prev => { const next = { ...prev }; delete next[key]; return next })
    setEditValue('')
  }, [selectedCell, engine, forceRerender])

  const clearAllCells = useCallback(() => {
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        engine.setCell(r, c, '')
      }
    }
    forceRerender()
    setCellStyles({})
    setSelectedCell(null)
    setEditingCell(null)
    setEditValue('')
  }, [engine, forceRerender])

  // ────── Row / Column operations ──────

  const insertRow = useCallback(() => {
    if (!selectedCell) return
    engine.insertRow(selectedCell.r)
    forceRerender()
    setSelectedCell({ r: selectedCell.r + 1, c: selectedCell.c })
  }, [selectedCell, engine, forceRerender])

  const deleteRow = useCallback(() => {
    if (!selectedCell) return
    engine.deleteRow(selectedCell.r)
    forceRerender()
    if (selectedCell.r >= engine.rows) {
      setSelectedCell({ r: engine.rows - 1, c: selectedCell.c })
    }
  }, [selectedCell, engine, forceRerender])

  const insertColumn = useCallback(() => {
    if (!selectedCell) return
    engine.insertColumn(selectedCell.c)
    forceRerender()
    setSelectedCell({ r: selectedCell.r, c: selectedCell.c + 1 })
  }, [selectedCell, engine, forceRerender])

  const deleteColumn = useCallback(() => {
    if (!selectedCell) return
    engine.deleteColumn(selectedCell.c)
    forceRerender()
    if (selectedCell.c >= engine.cols) {
      setSelectedCell({ r: selectedCell.r, c: engine.cols - 1 })
    }
  }, [selectedCell, engine, forceRerender])




  // handle-sort

  const handleSort = useCallback((colIndex) => {
  setSortState(prev => {
    if (prev.column !== colIndex) {
      return { column: colIndex, direction: "asc" }
    }

    if (prev.direction === "asc") {
      return { column: colIndex, direction: "desc" }
    }

    if (prev.direction === "desc") {
      return { column: null, direction: null }
    }

    return { column: colIndex, direction: "asc" }
  })
}, [])



  const getColumnValues = useCallback((colIndex) => {
    const values = new Set()
    for (let r = 0; r < engine.rows; r++) {
      const cell = engine.getCell(r, colIndex)
      let value = cell.computed
      if (value === null || value === '') value = cell.raw
      values.add(value ?? "")
    }
    return Array.from(values)
  }, [engine])

  // ────── Filter helpers ──────
  const toggleFilter = useCallback((colIndex) => {
    setOpenFilter(prev => prev === colIndex ? null : colIndex)
  }, [])

  const toggleFilterValue = useCallback((colIndex, val) => {
    setFilters(prev => {
      const next = { ...prev };
      if (!next[colIndex]) {
        next[colIndex] = new Set(getColumnValues(colIndex));
      }
      const allowed = new Set(next[colIndex]);
      if (allowed.has(val)) {
        allowed.delete(val);
      } else {
        allowed.add(val);
      }
      next[colIndex] = allowed;
      return next;
    });
  }, [getColumnValues])

  const selectAllFilterValues = useCallback((colIndex) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[colIndex]; 
      return next;
    });
  }, [])

  const clearFilterValues = useCallback((colIndex) => {
    setFilters(prev => {
      const next = { ...prev };
      next[colIndex] = new Set();
      return next;
    });
  }, [])

  // Close filter dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-btn')) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ────── Clipboard (Copy / Paste) ──────
  useEffect(() => {
    const handleCopy = (e) => {
      // Allow default copy in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
         return;
      }
      if (!selectedCell) return
      
      const cell = engine.getCell(selectedCell.r, selectedCell.c)

      let valueToCopy
      if (cell.error) {
        valueToCopy = cell.error
      } else if (cell.computed !== null && cell.computed !== '') {
        valueToCopy = cell.computed
      } else {
        valueToCopy = cell.raw
      }
      
      e.clipboardData.setData('text/plain', String(valueToCopy ?? ''))
      e.preventDefault()
    }

    const handlePaste = (e) => {
      // Allow default paste in the formula bar, but intercept inside the actual grid
      if (e.target.classList && e.target.classList.contains('formula-bar-input')) {
         return;
      }
      if (!selectedCell) return
      
      e.preventDefault()
      
      // If we were inside the active cell edit mode (input blinking), exit it to prevent grid lock
      if (editingCell) {
        setEditingCell(null)
      }

      const text = e.clipboardData.getData('text/plain')
      if (!text) return

      const rowsData = text.replace(/\r?\n$/, '').split(/\r?\n/)

      engine.startBatch && engine.startBatch()
      
      rowsData.forEach((rowData, i) => {
        // First check if string seems tab-separated
        // If it strictly contains tabs, prioritize splitting exclusively on tabs
        // otherwise default to multiple spaces fallback so we don't accidentally consume adjacent empty tab columns
        const separator = rowData.includes('\t') ? '\t' : /\s+/;
        const colsData = rowData.split(separator)

        colsData.forEach((value, j) => {
          // Bounds checking restricts pasting cells that extend beyond the spreadsheet's maximum grid size
          if (selectedCell.r + i < engine.rows && selectedCell.c + j < engine.cols) {
            engine.setCell(selectedCell.r + i, selectedCell.c + j, value.trim())
          }
        })
      })
      
      engine.endBatch && engine.endBatch()
      forceRerender()
    }

    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
    }
  }, [selectedCell, editingCell, engine, forceRerender])

  // ────── Global Undo/Redo Keyboard Listeners ──────
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (engine.undo()) {
          forceRerender()
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (engine.redo()) {
           forceRerender()
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [engine, forceRerender])

  // ────── Persistence (Autosave) ──────
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        const data = {
          rows: engine.rows,
          cols: engine.cols,
          cells: [],
          styles: cellStyles
        }
        for (let r = 0; r < engine.rows; r++) {
          for (let c = 0; c < engine.cols; c++) {
            const raw = engine.getCell(r, c).raw
            if (raw) {
              data.cells.push({ r, c, raw })
            }
          }
        }
        localStorage.setItem("spreadsheet-data", JSON.stringify(data))
      } catch (e) {
        console.error("Failed to autosave spreadsheet data", e)
      }
    }, 500)

    return () => clearTimeout(saveTimer)
  }, [version, cellStyles, engine])


  // ────── Derived state ──────

  const visibleRows = useMemo(() => {
    let rows = Array.from({ length: engine.rows }, (_, i) => i)

    // Apply filtering
    Object.entries(filters).forEach(([col, allowedValues]) => {
      rows = rows.filter(row => {
        const cell = engine.getCell(row, Number(col))
        let value = cell.computed
        if (value === null || value === '') value = cell.raw
        value = value ?? ""
        return allowedValues.has(value)
      })
    })

    // Apply sorting
    if (sortState.column !== null) {
      rows = [...rows].sort((a, b) => {
        const cellA = engine.getCell(a, sortState.column)
        let valA = cellA.computed
        if (valA === null || valA === '') valA = cellA.raw

        const cellB = engine.getCell(b, sortState.column)
        let valB = cellB.computed
        if (valB === null || valB === '') valB = cellB.raw

        valA = valA ?? ""
        valB = valB ?? ""

        if (valA === valB) return 0
        if (valA === "") return 1 // push empty to bottom
        if (valB === "") return -1

        const numA = Number(valA)
        const numB = Number(valB)
        const isNumA = !isNaN(numA) && valA !== ""
        const isNumB = !isNaN(numB) && valB !== ""

        let cmp = 0
        if (isNumA && isNumB) {
          cmp = numA - numB
        } else {
          cmp = String(valA).toLowerCase() < String(valB).toLowerCase() ? -1 : 1
        }

        return sortState.direction === "asc" ? cmp : -cmp
      })
    }

    return rows
  }, [engine, sortState, filters])



  const selectedCellStyle = useMemo(() => {
    return selectedCell ? getCellStyle(selectedCell.r, selectedCell.c) : null
  }, [selectedCell, getCellStyle])

  const getColumnLabel = useCallback((col) => {
    let label = ''
    let num = col + 1
    while (num > 0) {
      num--
      label = String.fromCharCode(65 + (num % 26)) + label
      num = Math.floor(num / 26)
    }
    return label
  }, [])

  const selectedCellLabel = selectedCell
    ? `${getColumnLabel(selectedCell.c)}${selectedCell.r + 1}`
    : 'No cell'

  // Formula bar shows the raw formula text, not the computed value
  // When editing, show the current editValue; otherwise show the cell's raw content
  // Note: This is different from the cell display, which shows computed values
  const formulaBarValue = editingCell
    ? editValue
    : (selectedCell ? engine.getCell(selectedCell.r, selectedCell.c).raw : '')

  // ────── Render ──────

  return (
    <div className="app-wrapper">
      <div className="app-header">
        <h2 className="app-title">📊 Spreadsheet App</h2>
      </div>

      <div className="main-content">

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="toolbar-group">
            <button className={`toolbar-btn bold-btn ${selectedCellStyle?.bold ? 'active' : ''}`} onClick={toggleBold} title="Bold">B</button>
            <button className={`toolbar-btn italic-btn ${selectedCellStyle?.italic ? 'active' : ''}`} onClick={toggleItalic} title="Italic">I</button>
            <button className={`toolbar-btn underline-btn ${selectedCellStyle?.underline ? 'active' : ''}`} onClick={toggleUnderline} title="Underline">U</button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">Size:</span>
            <select className="toolbar-select" value={selectedCellStyle?.fontSize || 13} onChange={(e) => changeFontSize(parseInt(e.target.value))}>
              {[8, 10, 11, 12, 13, 14, 16, 18, 20, 24].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-group">
            <button className={`align-btn ${selectedCellStyle?.align === 'left' ? 'active' : ''}`} onClick={() => changeAlignment('left')} title="Align Left">⬤←</button>
            <button className={`align-btn ${selectedCellStyle?.align === 'center' ? 'active' : ''}`} onClick={() => changeAlignment('center')} title="Align Center">⬤</button>
            <button className={`align-btn ${selectedCellStyle?.align === 'right' ? 'active' : ''}`} onClick={() => changeAlignment('right')} title="Align Right">⬤→</button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">Text:</span>
            <input
              type="color"
              value={selectedCellStyle?.color || '#000000'}
              onChange={(e) => changeFontColor(e.target.value)}
              title="Font color"
              style={{ width: '32px', height: '32px', border: '1px solid #dadce0', cursor: 'pointer', borderRadius: '4px' }}
            />
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">Fill:</span>
            <select className="toolbar-select" value={selectedCellStyle?.bg || 'white'} onChange={(e) => changeBackgroundColor(e.target.value)}>
              <option value="white">White</option>
              <option value="#ffff99">Yellow</option>
              <option value="#99ffcc">Green</option>
              <option value="#ffcccc">Red</option>
              <option value="#cce5ff">Blue</option>
              <option value="#e0ccff">Purple</option>
              <option value="#ffd9b3">Orange</option>
              <option value="#f0f0f0">Gray</option>
            </select>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={handleUndo} disabled={!engine.canUndo()} title="Undo">↶ Undo</button>
            <button className="toolbar-btn" onClick={handleRedo} disabled={!engine.canRedo()} title="Redo">↷ Redo</button>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={insertRow} title="Insert Row">+ Row</button>
            <button className="toolbar-btn" onClick={deleteRow} title="Delete Row">- Row</button>
            <button className="toolbar-btn" onClick={insertColumn} title="Insert Column">+ Col</button>
            <button className="toolbar-btn" onClick={deleteColumn} title="Delete Column">- Col</button>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn danger" onClick={clearSelectedCell}>✕ Cell</button>
            <button className="toolbar-btn danger" onClick={clearAllCells}>✕ All</button>
          </div>
        </div>

        {/* ── Formula Bar ── */}
        <div className="formula-bar">
          <span className="formula-bar-label">{selectedCellLabel}</span>
          <input
            className="formula-bar-input"
            value={formulaBarValue}
            onChange={(e) => handleFormulaBarChange(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            onFocus={handleFormulaBarFocus}
            placeholder="Select a cell then type, or enter a formula like =SUM(A1:A5)"
          />
        </div>

        {/* ── Grid ── */}
        <div className="grid-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="col-header-blank"></th>
                {Array.from({ length: engine.cols }, (_, colIndex) => (
                  <th
                    key={colIndex}
                    className="col-header"
                    style={{ position: "relative" }}
                  >
                    <div className="col-header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span onClick={() => handleSort(colIndex)} style={{ cursor: "pointer", flex: 1, textAlign: 'center' }}>
                        {getColumnLabel(colIndex)}
                        {sortState.column === colIndex && (
                          sortState.direction === "asc" ? " ▲" :
                          sortState.direction === "desc" ? " ▼" : ""
                        )}
                      </span>
                      <button 
                        className="filter-btn" 
                        onClick={() => toggleFilter(colIndex)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '10px' }}
                      >
                        ▼
                      </button>
                    </div>

                    {openFilter === colIndex && (
                      <div className="filter-dropdown" style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'white',
                        border: '1px solid #ccc',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        zIndex: 10,
                        padding: '8px',
                        textAlign: 'left',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '150px',
                        color: 'black',
                        fontWeight: 'normal'
                      }}>
                        <div style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                          <button onClick={() => selectAllFilterValues(colIndex)} style={{ marginRight: '4px', fontSize: '11px', padding: '2px 4px' }}>All</button>
                          <button onClick={() => clearFilterValues(colIndex)} style={{ fontSize: '11px', padding: '2px 4px' }}>Clear</button>
                        </div>
                        {getColumnValues(colIndex).map((val, idx) => {
                          const displayVal = val === '' ? '(Blanks)' : val;
                          const allowed = filters[colIndex] ? filters[colIndex].has(val) : true;
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: '2px 0' }}>
                              <input 
                                type="checkbox" 
                                checked={allowed} 
                                onChange={() => toggleFilterValue(colIndex, val)}
                                style={{ margin: 0 }}
                              />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayVal}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((rowIndex) => (
                <tr key={rowIndex}>
                  <td className="row-header">{rowIndex + 1}</td>
                  {Array.from({ length: engine.cols }, (_, colIndex) => {
                    const isSelected = selectedCell?.r === rowIndex && selectedCell?.c === colIndex
                    const isEditing = editingCell?.r === rowIndex && editingCell?.c === colIndex
                    const cellData = engine.getCell(rowIndex, colIndex)
                    const style = cellStyles[`${rowIndex},${colIndex}`] || {}
                    const displayValue = cellData.error
                      ? cellData.error
                      : (cellData.computed !== null && cellData.computed !== '' ? String(cellData.computed) : cellData.raw)

                    return (
                      <td
                        key={colIndex}
                        className={`cell ${isSelected ? 'selected' : ''}`}
                        style={{ background: style.bg || 'white' }}
                        onMouseDown={(e) => {
                          if (e.button === 2) {
                            setSelectedCell({ r: rowIndex, c: colIndex });
                            // Force explicit native browser text highlight over this <td>
                            // This ensures the browser context menu recognizes highlight text and offers the "Copy" context menu explicitly
                            try {
                              const range = document.createRange();
                              range.selectNodeContents(e.currentTarget);
                              const sel = window.getSelection();
                              sel.removeAllRanges();
                              sel.addRange(range);
                            } catch {
                              // Ignore selection errors
                            }
                            return;
                          }
                          e.preventDefault();
                          handleCellClick(rowIndex, colIndex);
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="cell-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(rowIndex, colIndex)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                            ref={isSelected ? cellInputRef : undefined}
                            style={{
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              textDecoration: style.underline ? 'underline' : 'none',
                              color: style.color || '#202124',
                              fontSize: (style.fontSize || 13) + 'px',
                              textAlign: style.align || 'left',
                              background: style.bg || 'white',
                            }}
                          />
                        ) : (
                          <div
                            className={`cell-display align-${style.align || 'left'} ${cellData.error ? 'error' : ''}`}
                            style={{
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              textDecoration: style.underline ? 'underline' : 'none',
                              color: cellData.error ? '#d93025' : (style.color || '#202124'),
                              fontSize: (style.fontSize || 13) + 'px',
                              // Allow explicit user selection on text so context menu activates "Copy"
                              userSelect: 'text',
                              WebkitUserSelect: 'text'
                            }}
                          >
                            {displayValue}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="footer-hint">
          Click a cell to edit · Enter/Tab/Arrow keys to navigate · Formulas: =A1+B1 · =SUM(A1:A5) · =AVG(A1:A5) · =MAX(A1:A5) · =MIN(A1:A5)
        </p>
      </div>
    </div>
  )
}
