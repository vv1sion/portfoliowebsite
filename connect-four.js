(() => {
  const createConnectFour = root => {
    const dropsEl = root.querySelector('.c4-drops')
    const gridEl = root.querySelector('.c4-grid')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const resetEl = root.querySelector('.reset')

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const COLS = 7
    const ROWS = 6
    const EMPTY = 0
    const HUMAN = 1
    const AI = 2
    const SEARCH_DEPTH = 3
    const WIN_SCORE = 100000

    const createGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY))

    const validColumns = grid => {
      const columns = []
      for (let col = 0; col < COLS; col++) {
        if (grid[ROWS - 1][col] === EMPTY) columns.push(col)
      }
      return columns
    }

    const landingRow = (grid, col) => {
      for (let row = 0; row < ROWS; row++) {
        if (grid[row][col] === EMPTY) return row
      }
      return -1
    }

    const findWinner = grid => {
      const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const player = grid[row][col]
          if (player === EMPTY) continue
          for (const [dRow, dCol] of directions) {
            const cells = [[row, col]]
            for (let step = 1; step < 4; step++) {
              const nextRow = row + dRow * step
              const nextCol = col + dCol * step
              if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS || grid[nextRow][nextCol] !== player) {
                cells.length = 0
                break
              }
              cells.push([nextRow, nextCol])
            }
            if (cells.length === 4) return { player, cells }
          }
        }
      }
      return null
    }

    const scoreWindow = (grid, coords) => {
      let mine = 0
      let theirs = 0
      let emptyPlayable = 0
      for (const [r, c] of coords) {
        const val = grid[r][c]
        if (val === AI) mine++
        else if (val === HUMAN) theirs++
        else if (r === 0 || grid[r - 1][c] !== EMPTY) emptyPlayable++
      }
      if (mine > 0 && theirs > 0) return 0
      if (mine === 3) return emptyPlayable > 0 ? 180 : 110
      if (mine === 2) return 14
      if (mine === 1) return 1
      if (theirs === 3) return emptyPlayable > 0 ? -240 : -150
      if (theirs === 2) return -16
      if (theirs === 1) return -1
      return 0
    }

    const evaluate = grid => {
      let score = 0
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (col + 3 < COLS) {
            score += scoreWindow(grid, [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]])
          }
          if (row + 3 < ROWS) {
            score += scoreWindow(grid, [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]])
          }
          if (col + 3 < COLS && row + 3 < ROWS) {
            score += scoreWindow(grid, [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]])
          }
          if (col + 3 < COLS && row - 3 >= 0) {
            score += scoreWindow(grid, [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]])
          }
        }
      }
      for (let row = 0; row < ROWS; row++) {
        if (grid[row][3] === AI) score += 6
        else if (grid[row][3] === HUMAN) score -= 6
      }
      return score
    }

    const orderedColumns = grid => validColumns(grid).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b))

    const minimax = (grid, depth, alpha, beta, maximizing) => {
      const winner = findWinner(grid)
      if (winner) return winner.player === AI ? WIN_SCORE + depth : -WIN_SCORE - depth
      if (validColumns(grid).length === 0) return 0
      if (depth === 0) return evaluate(grid)

      if (maximizing) {
        let best = -Infinity
        for (const col of orderedColumns(grid)) {
          const row = landingRow(grid, col)
          grid[row][col] = AI
          best = Math.max(best, minimax(grid, depth - 1, alpha, beta, false))
          grid[row][col] = EMPTY
          alpha = Math.max(alpha, best)
          if (alpha >= beta) break
        }
        return best
      }

      let best = Infinity
      for (const col of orderedColumns(grid)) {
        const row = landingRow(grid, col)
        grid[row][col] = HUMAN
        best = Math.min(best, minimax(grid, depth - 1, alpha, beta, true))
        grid[row][col] = EMPTY
        beta = Math.min(beta, best)
        if (alpha >= beta) break
      }
      return best
    }

    const chooseColumn = grid => {
      const columns = orderedColumns(grid)

      for (const col of columns) {
        const row = landingRow(grid, col)
        grid[row][col] = AI
        const winCheck = findWinner(grid)
        grid[row][col] = EMPTY
        if (winCheck && winCheck.player === AI) return col
      }

      if (Math.random() < 0.18) {
        return columns[Math.floor(Math.random() * columns.length)]
      }

      let bestScore = -Infinity
      let bestColumns = []
      for (const col of columns) {
        const row = landingRow(grid, col)
        grid[row][col] = AI
        const score = minimax(grid, SEARCH_DEPTH - 1, -Infinity, Infinity, false)
        grid[row][col] = EMPTY
        if (score > bestScore) {
          bestScore = score
          bestColumns = [col]
        } else if (score === bestScore) {
          bestColumns.push(col)
        }
      }
      return bestColumns[Math.floor(Math.random() * bestColumns.length)]
    }

    const cells = []
    const columns = []
    const dropButtons = []

    for (let col = 0; col < COLS; col++) {
      const column = document.createElement('div')
      column.className = 'c4-col'
      cells[col] = []
      for (let row = 0; row < ROWS; row++) {
        const cell = document.createElement('div')
        cell.className = 'c4-cell'
        cell.setAttribute('role', 'gridcell')
        column.appendChild(cell)
        cells[col][row] = cell
      }
      columns[col] = column
      gridEl.appendChild(column)

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'c4-drop'
      button.textContent = '\u2193'
      dropButtons[col] = button
      dropsEl.appendChild(button)

      column.addEventListener('click', () => playHuman(col))
      column.addEventListener('pointerenter', () => {
        if (!button.disabled) button.classList.add('is-hover')
      })
      column.addEventListener('pointerleave', () => {
        button.classList.remove('is-hover')
      })
      button.addEventListener('click', () => playHuman(col))
    }

    let grid = createGrid()
    let finished = false
    let busy = false
    let timeoutId = null
    let lastFocusedCol = 3

    const countCells = player => grid.reduce((total, row) => total + row.filter(value => value === player).length, 0)

    const writeStats = () => {
      window.ui.writeStats(metaEl, [
        { label: 'Your discs', value: countCells(HUMAN) },
        { label: 'Engine discs', value: countCells(AI) }
      ])
    }

    const syncInteractive = () => {
      for (let col = 0; col < COLS; col++) {
        const row = landingRow(grid, col)
        const canDrop = !finished && !busy && row >= 0
        const openSlots = row >= 0 ? ROWS - row : 0
        const button = dropButtons[col]
        button.disabled = !canDrop
        if (!canDrop) button.classList.remove('is-hover')
        button.setAttribute(
          'aria-label',
          row >= 0
            ? `Drop disc in column ${col + 1} (${openSlots} of ${ROWS} open)`
            : `Column ${col + 1} is full`
        )
        columns[col].classList.toggle('is-disabled', !canDrop)
      }
    }

    const render = winner => {
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          const cell = cells[col][row]
          const value = grid[row][col]
          cell.classList.toggle('p1', value === HUMAN)
          cell.classList.toggle('p2', value === AI)
          const inWin = Boolean(winner) && winner.cells.some(([winRow, winCol]) => winRow === row && winCol === col)
          cell.classList.toggle('win', inWin)
          const stateText = value === HUMAN ? 'Your disc (Red)' : value === AI ? 'Engine disc (Yellow)' : 'Empty'
          cell.setAttribute('aria-label', `Row ${ROWS - row}, Column ${col + 1}: ${stateText}`)
        }
      }
      syncInteractive()
    }

    const animateDrop = (row, col) => {
      const cell = cells[col][row]
      cell.classList.remove('drop')
      cell.style.setProperty('--drop-rows', String(ROWS - row))
      void cell.offsetWidth
      cell.classList.add('drop')
      cell.addEventListener('animationend', () => cell.classList.remove('drop'), { once: true })
    }

    const finish = () => {
      const winner = findWinner(grid)
      if (winner) {
        finished = true
        render(winner)
        writeStats()
        setStatus(winner.player === HUMAN ? 'You win.' : 'Engine wins.', true)
        window.ui.repairFocus(dropButtons, lastFocusedCol, resetEl)
        return true
      }
      if (validColumns(grid).length === 0) {
        finished = true
        render(null)
        writeStats()
        setStatus('Draw.', true)
        window.ui.repairFocus(dropButtons, lastFocusedCol, resetEl)
        return true
      }
      return false
    }

    const engineTurn = () => {
      timeoutId = null
      const col = chooseColumn(grid)
      const row = landingRow(grid, col)
      grid[row][col] = AI
      busy = false
      render(null)
      animateDrop(row, col)
      if (finish()) return
      setStatus('Your turn.')
      window.ui.repairFocus(dropButtons, lastFocusedCol, resetEl)
    }

    const playHuman = col => {
      if (finished || busy) return
      const row = landingRow(grid, col)
      if (row < 0) return
      lastFocusedCol = col
      grid[row][col] = HUMAN
      busy = true
      render(null)
      animateDrop(row, col)
      if (finish()) {
        busy = false
        return
      }
      setStatus('Engine is thinking…')
      timeoutId = window.setTimeout(engineTurn, 220)
    }

    const reset = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      grid = createGrid()
      finished = false
      busy = false
      window.ui.clearStats(metaEl)
      render(null)
      setStatus('Your turn.')
    }

    const activate = () => {
      if (busy && !finished && !timeoutId) {
        setStatus('Engine is thinking…')
        timeoutId = window.setTimeout(engineTurn, 220)
      }
    }

    const deactivate = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    resetEl.addEventListener('click', reset)

    reset()
    return { activate, deactivate }
  }

  window.createConnectFour = createConnectFour
})()
