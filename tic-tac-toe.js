(() => {
  const createTicTacToe = root => {
    const boardEl = root.querySelector('.ttt-board')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const resetEl = root.querySelector('.reset')

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const HUMAN = 'X'
    const AI = 'O'
    const LINES = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ]

    const cells = []
    for (let index = 0; index < 9; index++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'ttt-cell'
      cell.addEventListener('click', () => playHuman(index))
      boardEl.appendChild(cell)
      cells[index] = cell
    }

    let board = Array(9).fill('')
    let shown = Array(9).fill('')
    let finished = false
    let busy = false
    let timeoutId = null
    let humanStarts = false
    let lastFocusedIndex = 4
    let stats = { wins: 0, draws: 0, losses: 0 }

    const updateStats = () => {
      window.ui.writeStats(metaEl, [
        { label: 'Wins', value: stats.wins },
        { label: 'Draws', value: stats.draws },
        { label: 'Losses', value: stats.losses }
      ])
    }

    const winnerOf = state => {
      for (const line of LINES) {
        const [a, b, c] = line
        if (state[a] && state[a] === state[b] && state[a] === state[c]) {
          return { player: state[a], line }
        }
      }
      if (state.every(value => value)) return { player: 'draw', line: [] }
      return null
    }

    const minimax = (state, depth, maximizing) => {
      const result = winnerOf(state)
      if (result) {
        if (result.player === AI) return 10 - depth
        if (result.player === HUMAN) return depth - 10
        return 0
      }
      if (maximizing) {
        let best = -Infinity
        for (let index = 0; index < 9; index++) {
          if (state[index]) continue
          state[index] = AI
          best = Math.max(best, minimax(state, depth + 1, false))
          state[index] = ''
        }
        return best
      }
      let best = Infinity
      for (let index = 0; index < 9; index++) {
        if (state[index]) continue
        state[index] = HUMAN
        best = Math.min(best, minimax(state, depth + 1, true))
        state[index] = ''
      }
      return best
    }

    const bestMove = state => {
      const emptyIndices = []
      for (let index = 0; index < 9; index++) {
        if (!state[index]) emptyIndices.push(index)
      }

      if (Math.random() < 0.25) {
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
      }

      for (let index = 0; index < 9; index++) {
        if (state[index]) continue
        state[index] = AI
        const winCheck = winnerOf(state)
        state[index] = ''
        if (winCheck && winCheck.player === AI) return index
      }

      if (Math.random() < 0.6) {
        for (let index = 0; index < 9; index++) {
          if (state[index]) continue
          state[index] = HUMAN
          const blockCheck = winnerOf(state)
          state[index] = ''
          if (blockCheck && blockCheck.player === HUMAN) return index
        }
      }

      let bestScore = -Infinity
      let choices = []
      for (const index of emptyIndices) {
        state[index] = AI
        const score = minimax(state, 1, false)
        state[index] = ''
        if (score > bestScore) {
          bestScore = score
          choices = [index]
        } else if (score === bestScore) {
          choices.push(index)
        }
      }

      return choices[Math.floor(Math.random() * choices.length)]
    }

    const render = result => {
      for (let index = 0; index < 9; index++) {
        const cell = cells[index]
        const mark = board[index]
        const row = Math.floor(index / 3) + 1
        const col = (index % 3) + 1
        if (mark !== shown[index]) {
          cell.replaceChildren()
          if (mark) {
            const span = document.createElement('span')
            span.className = 'mark'
            span.textContent = mark
            cell.appendChild(span)
          }
          shown[index] = mark
        }
        cell.classList.toggle('p-x', mark === HUMAN)
        cell.classList.toggle('p-o', mark === AI)
        cell.classList.toggle('win', Boolean(result) && result.line.includes(index))
        cell.disabled = Boolean(mark) || finished || busy
        const labelState = mark === HUMAN ? 'X (You)' : mark === AI ? 'O (Engine)' : 'Empty'
        cell.setAttribute('aria-label', `Row ${row}, Column ${col}: ${labelState}`)
      }
    }

    const finish = () => {
      const result = winnerOf(board)
      if (!result) return false
      finished = true
      if (result.player === HUMAN) {
        stats.wins += 1
      } else if (result.player === AI) {
        stats.losses += 1
      } else {
        stats.draws += 1
      }
      render(result)
      updateStats()
      if (result.player === HUMAN) setStatus('You win.', true)
      else if (result.player === AI) setStatus('Engine wins.', true)
      else setStatus('Draw.', true)
      window.ui.repairFocus(cells, lastFocusedIndex, resetEl)
      return true
    }

    const engineTurn = () => {
      timeoutId = null
      const move = bestMove(board)
      if (move !== undefined) {
        board[move] = AI
      }
      busy = false
      render(null)
      if (finish()) return
      setStatus('Your turn (X).')
      window.ui.repairFocus(cells, lastFocusedIndex, resetEl)
    }

    const playHuman = index => {
      if (finished || busy || board[index]) return
      lastFocusedIndex = index
      board[index] = HUMAN
      busy = true
      render(null)
      if (finish()) {
        busy = false
        return
      }
      setStatus('Engine is thinking…')
      timeoutId = window.setTimeout(engineTurn, 240)
    }

    const reset = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      humanStarts = !humanStarts
      board = Array(9).fill('')
      for (const cell of cells) cell.replaceChildren()
      shown = Array(9).fill('')
      finished = false
      window.ui.clearStats(metaEl)
      if (humanStarts) {
        busy = false
        render(null)
        setStatus('Your turn (X).')
      } else {
        busy = true
        render(null)
        setStatus('Engine starts…')
        timeoutId = window.setTimeout(engineTurn, 260)
      }
    }

    const activate = () => {
      if (busy && !finished && !timeoutId) {
        setStatus('Engine is thinking…')
        timeoutId = window.setTimeout(engineTurn, 240)
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

  window.createTicTacToe = createTicTacToe
})()
