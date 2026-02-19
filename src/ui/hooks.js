import { useState, useCallback, useMemo } from 'react'
import { SpreadsheetEngine } from '../engine/spreadsheetEngine.js'
import { CommandManager, SetCellCommand, InsertRowCommand, DeleteRowCommand, InsertColumnCommand, DeleteColumnCommand } from '../engine/commands.js'

export function useSpreadsheet(rows = 50, cols = 50) {
  const [engine] = useState(() => new SpreadsheetEngine(rows, cols))
  const [commandManager] = useState(() => new CommandManager())
  const [version, setVersion] = useState(0)

  const forceUpdate = useCallback(() => {
    setVersion(v => v + 1)
  }, [])

  const setCell = useCallback((row, col, value) => {
    const oldCell = engine.getCell(row, col)
    const oldValue = oldCell.raw
    const command = new SetCellCommand(engine, row, col, value, oldValue)
    commandManager.execute(command)
    forceUpdate()
  }, [engine, commandManager, forceUpdate])

  const getCell = useCallback((row, col) => {
    const cell = engine.getCell(row, col)
    const key = engine.getCellKey(row, col)
    const value = engine.getCellValue(key)
    
    if (typeof value === 'string' && value.startsWith('#')) {
      return { raw: cell.raw, computed: null, error: value }
    }
    
    return { raw: cell.raw, computed: value, error: null }
  }, [engine])

  const insertRow = useCallback((atIndex) => {
    const command = new InsertRowCommand(engine, atIndex)
    commandManager.execute(command)
    forceUpdate()
  }, [engine, commandManager, forceUpdate])

  const deleteRow = useCallback((atIndex) => {
    const command = new DeleteRowCommand(engine, atIndex)
    commandManager.execute(command)
    forceUpdate()
  }, [engine, commandManager, forceUpdate])

  const insertColumn = useCallback((atIndex) => {
    const command = new InsertColumnCommand(engine, atIndex)
    commandManager.execute(command)
    forceUpdate()
  }, [engine, commandManager, forceUpdate])

  const deleteColumn = useCallback((atIndex) => {
    const command = new DeleteColumnCommand(engine, atIndex)
    commandManager.execute(command)
    forceUpdate()
  }, [engine, commandManager, forceUpdate])

  const undo = useCallback(() => {
    if (commandManager.undo()) {
      forceUpdate()
    }
  }, [commandManager, forceUpdate])

  const redo = useCallback(() => {
    if (commandManager.redo()) {
      forceUpdate()
    }
  }, [commandManager, forceUpdate])

  const canUndo = useMemo(() => commandManager.canUndo(), [commandManager, version])
  const canRedo = useMemo(() => commandManager.canRedo(), [commandManager, version])

  return {
    rows: engine.rows,
    cols: engine.cols,
    getCell,
    setCell,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    undo,
    redo,
    canUndo,
    canRedo
  }
}
