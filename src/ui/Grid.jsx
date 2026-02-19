import { memo, useCallback } from 'react'

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

export const Grid = memo(function Grid({
  rows,
  cols,
  getCell,
  selectedCell,
  editingCell,
  editValue,
  onCellClick,
  onEditChange,
  onKeyDown,
  onBlur,
  cellStyles
}) {
  const handleCellClick = useCallback((r, c) => {
    onCellClick(r, c)
  }, [onCellClick])

  return (
    <div className="grid-scroll">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="col-header-blank"></th>
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} className="col-header">
                {getColumnLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <td className="row-header">{r + 1}</td>
              {Array.from({ length: cols }, (_, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c
                const isEditing = editingCell?.r === r && editingCell?.c === c
                const cell = getCell(r, c)
                const style = cellStyles?.[`${r},${c}`] || {}
                const displayValue = cell.error || (cell.computed !== null ? String(cell.computed) : cell.raw)

                return (
                  <td
                    key={c}
                    className={`cell ${isSelected ? 'selected' : ''}`}
                    style={{ background: style.bg || 'white' }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleCellClick(r, c)
                    }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        className="cell-input"
                        value={editValue}
                        onChange={(e) => onEditChange(e.target.value)}
                        onBlur={() => onBlur(r, c)}
                        onKeyDown={(e) => onKeyDown(e, r, c)}
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
                        className={`cell-display align-${style.align || 'left'} ${cell.error ? 'error' : ''}`}
                        style={{
                          fontWeight: style.bold ? 'bold' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal',
                          textDecoration: style.underline ? 'underline' : 'none',
                          color: cell.error ? '#d93025' : (style.color || '#202124'),
                          fontSize: (style.fontSize || 13) + 'px',
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
  )
})
