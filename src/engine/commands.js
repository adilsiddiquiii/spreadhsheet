export class Command {
  execute() {}
  undo() {}
}

export class SetCellCommand extends Command {
  constructor(engine, row, col, newValue, oldValue) {
    super()
    this.engine = engine
    this.row = row
    this.col = col
    this.newValue = newValue
    this.oldValue = oldValue
  }

  execute() {
    this.engine.setCell(this.row, this.col, this.newValue)
    this.engine.recalculate()
  }

  undo() {
    this.engine.setCell(this.row, this.col, this.oldValue)
    this.engine.recalculate()
  }
}

export class InsertRowCommand extends Command {
  constructor(engine, atIndex) {
    super()
    this.engine = engine
    this.atIndex = atIndex
    this.snapshot = null
  }

  execute() {
    this.snapshot = this.engine.getSnapshot()
    this.engine.insertRow(this.atIndex)
    this.engine.recalculate()
  }

  undo() {
    if (this.snapshot) {
      this.engine.restoreSnapshot(this.snapshot)
      this.engine.rows--
      this.engine.recalculate()
    }
  }
}

export class DeleteRowCommand extends Command {
  constructor(engine, atIndex) {
    super()
    this.engine = engine
    this.atIndex = atIndex
    this.snapshot = null
  }

  execute() {
    this.snapshot = this.engine.getSnapshot()
    this.engine.deleteRow(this.atIndex)
    this.engine.recalculate()
  }

  undo() {
    if (this.snapshot) {
      this.engine.restoreSnapshot(this.snapshot)
      this.engine.rows++
      this.engine.recalculate()
    }
  }
}

export class InsertColumnCommand extends Command {
  constructor(engine, atIndex) {
    super()
    this.engine = engine
    this.atIndex = atIndex
    this.snapshot = null
  }

  execute() {
    this.snapshot = this.engine.getSnapshot()
    this.engine.insertColumn(this.atIndex)
    this.engine.recalculate()
  }

  undo() {
    if (this.snapshot) {
      this.engine.restoreSnapshot(this.snapshot)
      this.engine.cols--
      this.engine.recalculate()
    }
  }
}

export class DeleteColumnCommand extends Command {
  constructor(engine, atIndex) {
    super()
    this.engine = engine
    this.atIndex = atIndex
    this.snapshot = null
  }

  execute() {
    this.snapshot = this.engine.getSnapshot()
    this.engine.deleteColumn(this.atIndex)
    this.engine.recalculate()
  }

  undo() {
    if (this.snapshot) {
      this.engine.restoreSnapshot(this.snapshot)
      this.engine.cols++
      this.engine.recalculate()
    }
  }
}

export class CommandManager {
  constructor() {
    this.undoStack = []
    this.redoStack = []
    this.maxSize = 100
  }

  execute(command) {
    command.execute()
    this.undoStack.push(command)
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo() {
    if (this.undoStack.length === 0) return false
    const command = this.undoStack.pop()
    command.undo()
    this.redoStack.push(command)
    return true
  }

  redo() {
    if (this.redoStack.length === 0) return false
    const command = this.redoStack.pop()
    command.execute()
    this.undoStack.push(command)
    return true
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}
