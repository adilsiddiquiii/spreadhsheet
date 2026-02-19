# 📊 Spreadsheet App — Intern Coding Challenge

A browser-based spreadsheet application built with React and Vite.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## What's Working Right Now

### Cell Editing
- Click any cell to start editing
- Type text or numbers directly
- Press **Enter** to confirm and move down
- Press **Tab** to confirm and move right
- Press **Escape** to cancel editing
- Formula bar shows the raw content of the selected cell

### Keyboard Navigation
- **Arrow keys** move between cells (commits current edit first)
- **Enter** moves down, **Tab** moves right

### Formula Engine
- Supports basic arithmetic: `=A1+B1`, `=A1*2`, `=10/3`
- Supports parentheses: `=(A1+B1)*2`
- Built-in functions:
  - `=SUM(A1:A5)` — sum of a range
  - `=AVG(A1:A5)` — average of a range
  - `=MIN(A1:A5)` — minimum value in a range
  - `=MAX(A1:A5)` — maximum value in a range
- Circular reference detection (shows `#CYCLE!`)
- Error display: `#VALUE!`, `#REF!`, `#PARSE!`
- Automatic dependency tracking and recalculation

### Cell Formatting
- **Bold**, **Italic**, **Underline** toggles
- Font size selector (8–24px)
- Text alignment: left, center, right
- Font color picker
- Background color (8 preset colors)

### Undo / Redo
- Undo and Redo buttons in the toolbar
- Supports undoing cell edits, row/column insertions and deletions

### Row & Column Operations
- Insert row at current position
- Delete current row
- Insert column at current position
- Delete current column
- All operations auto-shift formula references

### Clear Operations
- **✕ Cell** — clears the selected cell's value and formatting
- **✕ All** — clears the entire spreadsheet

---

## 🧪 Challenge Tasks

You have **3 days** to complete as many of the following tasks as you can. Quality matters more than quantity. Your code will be evaluated on correctness, edge-case handling, code readability, and how well you understood the existing codebase before modifying it.

> **Important**: Do NOT use AI tools (ChatGPT, Copilot, etc.) to generate code. We will review your commit history and discuss your implementation in a follow-up interview. You must be able to explain every line you wrote.

---

### Task 1: Column Sort & Filter

**Goal**: Add the ability to sort and filter data by column.

**Requirements**:
1. Clicking a column header should toggle sort: ascending → descending → no sort
2. Sorting must work on **computed values** (not raw formula text). A column with `=A1+1` should sort by the numeric result.
3. Add a small filter icon/dropdown on each column header that lets the user select which values to show (like Excel's auto-filter)
4. When a filter is active, rows that don't match should be **hidden** (not deleted)
5. Sorting and filtering must be reversible — the user should be able to return to the original order
6. Formulas must continue to reference the **original** cell positions. Sorting is a view-layer operation only.
7. The sort/filter controls should be visually clean and consistent with the existing UI

**Hints**: Think carefully about whether sorting should modify the data model or just the view. Consider how `=SUM(A1:A5)` should behave when rows are sorted — should it still sum the same cells?

---

### Task 2: Multi-Cell Copy & Paste (Clipboard Integration)

**Goal**: Support copying cells from Excel or Google Sheets and pasting them into this spreadsheet.

**Requirements**:
1. **Ctrl+V** should paste tab-separated clipboard content into the grid starting from the currently selected cell
2. The paste must handle **multi-row, multi-column** data (tabs separate columns, newlines separate rows)
3. If the pasted area extends beyond the current grid, either expand the grid or show an error
4. Pasting should create an undo-able operation — a single **Ctrl+Z** should undo the entire paste
5. **Ctrl+C** on a selected cell should copy its **computed value** (not the formula) to the system clipboard
6. Support **internal copy-paste**: Ctrl+C on a cell, then Ctrl+V on another cell should paste the value
7. If a cell containing a formula is copied internally, the formula references should be **adjusted relative** to the new position (e.g., copying `=A1+B1` from C1 to C3 should become `=A3+B3`)

**Hints**: Look into the `navigator.clipboard` API and the `paste` event. Tab-separated values (TSV) are the standard clipboard format for spreadsheet data.

---

### Task 3: Local Storage Persistence

**Goal**: Implement automatic saving and loading of spreadsheet data using browser local storage.

**Requirements**:
1. The spreadsheet should **automatically save** to local storage whenever any cell value, formula, or formatting changes
2. On page load, the spreadsheet should **automatically restore** the last saved state (including cell values, formulas, and formatting)
3. Cell styles (bold, italic, underline, colors, alignment, font size) must be persisted and restored
4. The undo/redo history should **NOT** be persisted (start fresh on each page load)
5. Row and column insertions/deletions must be persisted (the grid dimensions should match the saved state)
6. If local storage is empty or corrupted, the spreadsheet should start with a clean 50x50 grid
7. The save operation should be **debounced** (wait 500ms after the last change before saving) to avoid excessive writes
8. Handle edge cases: very large spreadsheets (consider storage limits), invalid JSON, and browser storage quota exceeded errors
9. The persistence should work seamlessly — users shouldn't notice any performance impact

**Hints**: Consider what data structure to save. You'll need to persist both the engine's cell data and the React component's cell styles. Think about how to serialize and deserialize the engine state. The `createEngine` function returns an object with methods — you may need to add a way to export/import the internal state.

---

## Evaluation Criteria

| Criteria | Weight |
|---|---|
| **Correctness** — Does the feature work as specified? | 30% |
| **Edge Cases** — Does it handle empty cells, formulas, large data? | 20% |
| **Code Quality** — Is the code readable, well-structured? | 20% |
| **Codebase Understanding** — Did you work with the existing patterns? | 15% |
| **UI/UX** — Is the feature visually consistent and intuitive? | 15% |

## Submission

1. Fork this repository
2. Create a branch for each task (e.g., `task-1-sort-filter`)
3. Make clean, atomic commits with descriptive messages
4. Submit a pull request with a brief description of your approach

## Project Structure

```
src/
├── engine/
│   └── core.js          # Spreadsheet engine (formulas, dependencies, undo/redo, row/col ops)
├── App.jsx              # Main application component (all UI in one file)
├── App.css              # Styles
├── index.css            # Base styles
└── main.jsx             # Entry point
```
