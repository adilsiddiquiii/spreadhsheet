import { memo } from 'react'

export const Toolbar = memo(function Toolbar({
  selectedCell,
  cellData,
  onBold,
  onItalic,
  onUnderline,
  onFontSize,
  onAlign,
  onFontColor,
  onBgColor,
  onClearCell,
  onClearAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn
}) {
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

  const cellLabel = selectedCell 
    ? `${getColumnLabel(selectedCell.c)}${selectedCell.r + 1}`
    : ''

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button 
          className={`toolbar-btn bold-btn ${cellData?.bold ? 'active' : ''}`} 
          onClick={onBold} 
          title="Bold"
        >
          B
        </button>
        <button 
          className={`toolbar-btn italic-btn ${cellData?.italic ? 'active' : ''}`} 
          onClick={onItalic} 
          title="Italic"
        >
          I
        </button>
        <button 
          className={`toolbar-btn underline-btn ${cellData?.underline ? 'active' : ''}`} 
          onClick={onUnderline} 
          title="Underline"
        >
          U
        </button>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">Size:</span>
        <select 
          className="toolbar-select" 
          value={cellData?.fontSize || 12} 
          onChange={(e) => onFontSize(parseInt(e.target.value))}
        >
          {[8, 10, 11, 12, 14, 16, 18, 20, 24].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="toolbar-group">
        <button 
          className={`align-btn ${cellData?.align === 'left' ? 'active' : ''}`} 
          onClick={() => onAlign('left')} 
          title="Left"
        >
          ⬤←
        </button>
        <button 
          className={`align-btn ${cellData?.align === 'center' ? 'active' : ''}`} 
          onClick={() => onAlign('center')} 
          title="Center"
        >
          ⬤
        </button>
        <button 
          className={`align-btn ${cellData?.align === 'right' ? 'active' : ''}`} 
          onClick={() => onAlign('right')} 
          title="Right"
        >
          ⬤→
        </button>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">Text:</span>
        <input 
          type="color" 
          value={cellData?.color || '#000000'} 
          onChange={(e) => onFontColor(e.target.value)} 
          title="Font color"
          style={{ width: '32px', height: '32px', border: '1px solid #dadce0', cursor: 'pointer', borderRadius: '4px' }} 
        />
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">Fill:</span>
        <select 
          className="toolbar-select" 
          value={cellData?.bg || 'white'} 
          onChange={(e) => onBgColor(e.target.value)}
        >
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
        <button 
          className="toolbar-btn" 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo"
        >
          ↶ Undo
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo"
        >
          ↷ Redo
        </button>
      </div>

      <div className="toolbar-group">
        <button 
          className="toolbar-btn" 
          onClick={onInsertRow}
          title="Insert Row"
        >
          + Row
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onDeleteRow}
          title="Delete Row"
        >
          - Row
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onInsertColumn}
          title="Insert Column"
        >
          + Col
        </button>
        <button 
          className="toolbar-btn" 
          onClick={onDeleteColumn}
          title="Delete Column"
        >
          - Col
        </button>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn danger" onClick={onClearCell}>✕ Cell</button>
        <button className="toolbar-btn danger" onClick={onClearAll}>✕ All</button>
      </div>

      {selectedCell && (
        <span className="cell-info">
          {cellLabel}
          {cellData?.raw ? ` = ${cellData.raw}` : ''}
        </span>
      )}
    </div>
  )
})
