export class DependencyGraph {
  constructor() {
    this.forward = new Map()
    this.reverse = new Map()
  }

  addDependency(cell, dependency) {
    if (!this.forward.has(cell)) {
      this.forward.set(cell, new Set())
    }
    if (!this.reverse.has(dependency)) {
      this.reverse.set(dependency, new Set())
    }
    this.forward.get(cell).add(dependency)
    this.reverse.get(dependency).add(cell)
  }

  removeDependency(cell, dependency) {
    if (this.forward.has(cell)) {
      this.forward.get(cell).delete(dependency)
      if (this.forward.get(cell).size === 0) {
        this.forward.delete(cell)
      }
    }
    if (this.reverse.has(dependency)) {
      this.reverse.get(dependency).delete(cell)
      if (this.reverse.get(dependency).size === 0) {
        this.reverse.delete(dependency)
      }
    }
  }

  removeAllDependencies(cell) {
    const deps = this.forward.get(cell)
    if (deps) {
      for (const dep of deps) {
        if (this.reverse.has(dep)) {
          this.reverse.get(dep).delete(cell)
          if (this.reverse.get(dep).size === 0) {
            this.reverse.delete(dep)
          }
        }
      }
      this.forward.delete(cell)
    }

    const dependents = this.reverse.get(cell)
    if (dependents) {
      for (const dependent of dependents) {
        if (this.forward.has(dependent)) {
          this.forward.get(dependent).delete(cell)
          if (this.forward.get(dependent).size === 0) {
            this.forward.delete(dependent)
          }
        }
      }
      this.reverse.delete(cell)
    }
  }

  getDependencies(cell) {
    return this.forward.get(cell) || new Set()
  }

  getDependents(cell) {
    return this.reverse.get(cell) || new Set()
  }

  getAllDependents(cell, visited = new Set()) {
    if (visited.has(cell)) return new Set()
    visited.add(cell)
    
    const dependents = new Set()
    const direct = this.getDependents(cell)
    
    for (const dep of direct) {
      dependents.add(dep)
      const indirect = this.getAllDependents(dep, visited)
      for (const ind of indirect) {
        dependents.add(ind)
      }
    }
    
    return dependents
  }

  hasCycle(cell) {
    const visited = new Set()
    const recStack = new Set()
    
    const dfs = (node) => {
      if (recStack.has(node)) {
        return true
      }
      if (visited.has(node)) {
        return false
      }
      
      visited.add(node)
      recStack.add(node)
      
      const deps = this.getDependencies(node)
      for (const dep of deps) {
        if (dfs(dep)) {
          return true
        }
      }
      
      recStack.delete(node)
      return false
    }
    
    return dfs(cell)
  }

  topologicalSort(affectedCells) {
    const inDegree = new Map()
    const queue = []
    const result = []

    for (const cell of affectedCells) {
      inDegree.set(cell, 0)
    }

    for (const cell of affectedCells) {
      const deps = this.getDependencies(cell)
      for (const dep of deps) {
        if (affectedCells.has(dep)) {
          inDegree.set(cell, (inDegree.get(cell) || 0) + 1)
        }
      }
    }

    for (const cell of affectedCells) {
      if (inDegree.get(cell) === 0) {
        queue.push(cell)
      }
    }

    while (queue.length > 0) {
      const cell = queue.shift()
      result.push(cell)

      const dependents = this.getDependents(cell)
      for (const dependent of dependents) {
        if (affectedCells.has(dependent)) {
          inDegree.set(dependent, inDegree.get(dependent) - 1)
          if (inDegree.get(dependent) === 0) {
            queue.push(dependent)
          }
        }
      }
    }

    return result
  }

  clear() {
    this.forward.clear()
    this.reverse.clear()
  }
}
