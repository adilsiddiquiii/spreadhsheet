import { memo } from 'react'

function getColumnLabel(col) {
  let label = ''
  let colNum = col + 1
  while (colNum > 0) {
    colNum--
    label = String.fromCharCode(65 + (colNum % 26)) + label
    colNum = Math.floor(colNum / 26)
  }
  return label
}

export const FormulaBar = memo(function FormulaBar({ 
  selectedCell, 
  editValue, 
  onEditChange, 
  onKeyDown,
  onFocus 
}) {
  const cellLabel = selectedCell 
    ? `${getColumnLabel(selectedCell.c)}${selectedCell.r + 1}`
    : 'No cell'

  return (
    <div className="formula-bar">
      <span className="formula-bar-label">{cellLabel}</span>
      <input
        className="formula-bar-input"
        value={editValue}
        onChange={(e) => onEditChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        placeholder="Select a cell then type, or enter a formula like =SUM(A1:A5)"
      />
    </div>
  )
})
