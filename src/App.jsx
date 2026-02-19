import { useState, useRef, useCallback, useMemo } from 'react'
import './App.css'
import { useSpreadsheet } from './ui/hooks.js'
import { Grid } from './ui/Grid.jsx'
import { FormulaBar } from './ui/FormulaBar.jsx'
import { Toolbar } from './ui/Toolbar.jsx'

const ROWS = 50
const COLS = 50

function makeEmptyCellStyles() {
  return {}
}

export default function App() {
  const spreadsheet = useSpreadsheet(ROWS, COLS)
  const [selectedCell, setSelectedCell] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [cellStyles, setCellStyles] = useState(makeEmptyCellStyles)
  const inputRef = useRef(null)

  const getCellStyle = useCallback((r, c) => {
    const key = `${r},${c}`
    return cellStyles[key] || {
      bold: false,
      italic: false,
      underline: false,
      bg: 'white',
      color: '#202124',
      align: 'left',
      fontSize: 13
    }
  }, [cellStyles])

  const updateCellStyle = useCallback((r, c, updater) => {
    const key = `${r},${c}`
    setCellStyles(prev => ({
      ...prev,
      [key]: {
        ...getCellStyle(r, c),
        ...updater
      }
    }))
  }, [getCellStyle])

  const startEdit = useCallback((r, c) => {
    setSelectedCell({ r, c })
    setEditingCell({ r, c })
    const cell = spreadsheet.getCell(r, c)
    setEditValue(cell.raw)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [spreadsheet])

  const handleCellClick = useCallback((r, c) => {
    if (editingCell && (editingCell.r !== r || editingCell.c !== c)) {
      commitEdit(editingCell.r, editingCell.c)
    }
    if (!editingCell || editingCell.r !== r || editingCell.c !== c) {
      startEdit(r, c)
    }
  }, [editingCell])

  const commitEdit = useCallback((r, c) => {
    spreadsheet.setCell(r, c, editValue)
    setEditingCell(null)
  }, [spreadsheet, editValue])

  const handleKeyDown = useCallback((e, r, c) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(Math.min(r + 1, spreadsheet.rows - 1), c)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(r, Math.min(c + 1, spreadsheet.cols - 1))
    } else if (e.key === 'Escape') {
      const cell = spreadsheet.getCell(r, c)
      setEditValue(cell.raw)
      setEditingCell(null)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(Math.min(r + 1, spreadsheet.rows - 1), c)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(Math.max(r - 1, 0), c)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(r, Math.max(c - 1, 0))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      commitEdit(r, c)
      startEdit(r, Math.min(c + 1, spreadsheet.cols - 1))
    }
  }, [spreadsheet, commitEdit, startEdit])

  const handleFormulaBarKeyDown = useCallback((e) => {
    if (!editingCell) return
    handleKeyDown(e, editingCell.r, editingCell.c)
  }, [editingCell, handleKeyDown])

  const handleFormulaBarFocus = useCallback(() => {
    if (selectedCell && !editingCell) {
      setEditingCell(selectedCell)
      const cell = spreadsheet.getCell(selectedCell.r, selectedCell.c)
      setEditValue(cell.raw)
    }
  }, [selectedCell, editingCell, spreadsheet])

  const handleFormulaBarChange = useCallback((value) => {
    if (!editingCell && selectedCell) {
      setEditingCell(selectedCell)
    }
    setEditValue(value)
  }, [editingCell, selectedCell])

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

  const setFontSize = useCallback((size) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { fontSize: size })
  }, [selectedCell, updateCellStyle])

  const setAlign = useCallback((align) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { align })
  }, [selectedCell, updateCellStyle])

  const setFontColor = useCallback((color) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { color })
  }, [selectedCell, updateCellStyle])

  const setBgColor = useCallback((color) => {
    if (!selectedCell) return
    updateCellStyle(selectedCell.r, selectedCell.c, { bg: color })
  }, [selectedCell, updateCellStyle])

  const clearCell = useCallback(() => {
    if (!selectedCell) return
    spreadsheet.setCell(selectedCell.r, selectedCell.c, '')
    const key = `${selectedCell.r},${selectedCell.c}`
    setCellStyles(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setEditValue('')
  }, [selectedCell, spreadsheet])

  const clearAll = useCallback(() => {
    for (let r = 0; r < spreadsheet.rows; r++) {
      for (let c = 0; c < spreadsheet.cols; c++) {
        spreadsheet.setCell(r, c, '')
      }
    }
    setCellStyles(makeEmptyCellStyles())
    setSelectedCell(null)
    setEditingCell(null)
    setEditValue('')
  }, [spreadsheet])

  const handleInsertRow = useCallback(() => {
    if (!selectedCell) return
    spreadsheet.insertRow(selectedCell.r)
    setSelectedCell({ r: selectedCell.r + 1, c: selectedCell.c })
  }, [selectedCell, spreadsheet])

  const handleDeleteRow = useCallback(() => {
    if (!selectedCell) return
    spreadsheet.deleteRow(selectedCell.r)
    if (selectedCell.r >= spreadsheet.rows) {
      setSelectedCell({ r: spreadsheet.rows - 1, c: selectedCell.c })
    }
  }, [selectedCell, spreadsheet])

  const handleInsertColumn = useCallback(() => {
    if (!selectedCell) return
    spreadsheet.insertColumn(selectedCell.c)
    setSelectedCell({ r: selectedCell.r, c: selectedCell.c + 1 })
  }, [selectedCell, spreadsheet])

  const handleDeleteColumn = useCallback(() => {
    if (!selectedCell) return
    spreadsheet.deleteColumn(selectedCell.c)
    if (selectedCell.c >= spreadsheet.cols) {
      setSelectedCell({ r: selectedCell.r, c: spreadsheet.cols - 1 })
    }
  }, [selectedCell, spreadsheet])

  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null
    return getCellStyle(selectedCell.r, selectedCell.c)
  }, [selectedCell, getCellStyle])

  return (
    <div className="app-wrapper">
      <div className="app-header">
        <h2 className="app-title">📊 Spreadsheet App</h2>
      </div>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">File</h3>
            <button className="sidebar-btn">New</button>
            <button className="sidebar-btn">Open</button>
            <button className="sidebar-btn">Save</button>
            <button className="sidebar-btn">Export</button>
          </div>
          
          <div className="sidebar-section">
            <h3 className="sidebar-title">Format</h3>
            <button className="sidebar-btn">Number</button>
            <button className="sidebar-btn">Currency</button>
            <button className="sidebar-btn">Date</button>
            <button className="sidebar-btn">Percent</button>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Insert</h3>
            <button className="sidebar-btn">Row</button>
            <button className="sidebar-btn">Column</button>
            <button className="sidebar-btn">Chart</button>
            <button className="sidebar-btn">Image</button>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">View</h3>
            <button className="sidebar-btn">Zoom In</button>
            <button className="sidebar-btn">Zoom Out</button>
            <button className="sidebar-btn">Fit to Screen</button>
          </div>
        </aside>

        <div className="main-content">
          <Toolbar
            selectedCell={selectedCell}
            cellData={selectedCellData}
            onBold={toggleBold}
            onItalic={toggleItalic}
            onUnderline={toggleUnderline}
            onFontSize={setFontSize}
            onAlign={setAlign}
            onFontColor={setFontColor}
            onBgColor={setBgColor}
            onClearCell={clearCell}
            onClearAll={clearAll}
            onUndo={spreadsheet.undo}
            onRedo={spreadsheet.redo}
            canUndo={spreadsheet.canUndo}
            canRedo={spreadsheet.canRedo}
            onInsertRow={handleInsertRow}
            onDeleteRow={handleDeleteRow}
            onInsertColumn={handleInsertColumn}
            onDeleteColumn={handleDeleteColumn}
          />

          <FormulaBar
            selectedCell={selectedCell}
            editValue={editingCell ? editValue : (selectedCell ? spreadsheet.getCell(selectedCell.r, selectedCell.c).raw : '')}
            onEditChange={handleFormulaBarChange}
            onKeyDown={handleFormulaBarKeyDown}
            onFocus={handleFormulaBarFocus}
          />

          <Grid
            rows={spreadsheet.rows}
            cols={spreadsheet.cols}
            getCell={spreadsheet.getCell}
            selectedCell={selectedCell}
            editingCell={editingCell}
            editValue={editValue}
            onCellClick={handleCellClick}
            onEditChange={setEditValue}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            cellStyles={cellStyles}
          />

          <p className="footer-hint">
            Click a cell to edit · Enter/Tab/Arrow keys to navigate · Formulas: =A1+B1 · =SUM(A1:A5) · =AVG(A1:A5) · =MAX(A1:A5) · =MIN(A1:A5)
          </p>
        </div>
      </div>
    </div>
  )
}
