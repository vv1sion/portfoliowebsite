(() => {
  const createMinesweeper = root => {
    const boardEl = root.querySelector('.ms-board')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const resetEl = root.querySelector('.reset')
    const flagButton = root.querySelector('.ms-flag')
    const timerEl = root.querySelector('.ms-timer')

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const COLS = 9
    const ROWS = 9
    const MINES = 10
    const TOTAL = ROWS * COLS

    const MINE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.3 16.3l-2.8 2.8"/></g><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>'
    const FLAG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v18"/><path d="M7 4h11l-3 3.5L18 11H7z"/></g></svg>'
    const WRONG_FLAG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v18"/><path d="M7 4h11l-3 3.5L18 11H7z"/><path d="M4 4l16 16M20 4L4 20"/></g></svg>'

    let cells = []
    let buttons = []
    let started = false
    let over = false
    let flagMode = false
    let flags = 0
    let revealedCount = 0
    let elapsedSeconds = 0
    let timerId = null
    let lastFocusedIndex = 40

    const readBest = () => {
      const stored = Number(window.storage.get('minesweeper-best'))
      return Number.isFinite(stored) && stored > 0 ? stored : null
    }

    const formatTime = seconds => `${seconds}s`

    const updateStats = () => {
      const best = readBest()
      window.ui.writeStats(metaEl, [
        { label: 'Time', value: formatTime(elapsedSeconds) },
        { label: 'Best', value: best !== null ? formatTime(best) : '—' },
        { label: 'Tiles opened', value: revealedCount }
      ])
    }

    const startTimer = () => {
      if (timerId || over || !started) return
      timerId = window.setInterval(() => {
        elapsedSeconds += 1
        timerEl.textContent = formatTime(elapsedSeconds)
      }, 1000)
    }

    const stopTimer = () => {
      if (timerId) {
        window.clearInterval(timerId)
        timerId = null
      }
    }

    const indexOf = (row, col) => row * COLS + col

    const neighbors = position => {
      const row = Math.floor(position / COLS)
      const col = position % COLS
      const result = []
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0) continue
          const nextRow = row + dRow
          const nextCol = col + dCol
          if (nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS) {
            result.push(indexOf(nextRow, nextCol))
          }
        }
      }
      return result
    }

    const emptyGrid = () =>
      Array.from({ length: TOTAL }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        triggered: false,
        wrongFlag: false,
        adjacent: 0
      }))

    const placeMines = safe => {
      const safeZone = new Set([safe, ...neighbors(safe)])
      const candidates = []
      for (let position = 0; position < TOTAL; position++) {
        if (!safeZone.has(position)) candidates.push(position)
      }
      window.ui.shuffle(candidates)

      for (let placed = 0; placed < MINES; placed++) {
        cells[candidates[placed]].mine = true
      }
      cells.forEach((cell, position) => {
        if (cell.mine) return
        cell.adjacent = neighbors(position).filter(n => cells[n].mine).length
      })
    }

    const updateLiveStatus = () => {
      if (over) return
      const remaining = Math.max(0, MINES - flags)
      setStatus(`${remaining} ${remaining === 1 ? 'mine' : 'mines'} remaining`)
    }

    const canChord = position => {
      const cell = cells[position]
      if (!cell.revealed || cell.mine || cell.adjacent === 0 || over) return false
      const adj = neighbors(position)
      const hasHiddenUnflagged = adj.some(n => !cells[n].revealed && !cells[n].flagged)
      return hasHiddenUnflagged
    }

    const paint = position => {
      const cell = cells[position]
      const button = buttons[position]
      const row = Math.floor(position / COLS) + 1
      const col = (position % COLS) + 1
      const coordLabel = `Row ${row}, Column ${col}`

      button.className = 'ms-cell'
      button.textContent = ''

      if (cell.wrongFlag) {
        button.classList.add('is-revealed', 'is-wrong-flag')
        button.innerHTML = WRONG_FLAG_ICON
        button.disabled = true
        button.setAttribute('aria-label', `${coordLabel}: False flag`)
        return
      }

      if (cell.revealed) {
        button.classList.add('is-revealed')
        if (cell.mine) {
          button.classList.add('is-mine')
          if (cell.triggered) button.classList.add('is-triggered')
          button.innerHTML = MINE_ICON
          button.disabled = true
          button.setAttribute('aria-label', `${coordLabel}: ${cell.triggered ? 'Exploded mine' : 'Mine'}`)
        } else if (cell.adjacent > 0) {
          button.classList.add(`ms-n${cell.adjacent}`)
          button.textContent = String(cell.adjacent)
          const chordable = canChord(position)
          button.classList.toggle('is-chordable', chordable)
          button.disabled = over
          button.setAttribute('aria-label', `${coordLabel}: Revealed, ${cell.adjacent} adjacent ${cell.adjacent === 1 ? 'mine' : 'mines'}`)
        } else {
          button.disabled = true
          button.setAttribute('aria-label', `${coordLabel}: Revealed, empty`)
        }
        return
      }

      button.disabled = over
      if (cell.flagged) {
        button.classList.add('is-flagged')
        button.innerHTML = FLAG_ICON
        button.setAttribute('aria-label', `${coordLabel}: Flagged`)
      } else {
        button.setAttribute('aria-label', `${coordLabel}: Unopened`)
      }
    }

    const paintAll = () => {
      for (let position = 0; position < TOTAL; position++) {
        paint(position)
      }
    }

    const paintFresh = positions => {
      positions.forEach((position, k) => {
        paint(position)
        const button = buttons[position]
        button.classList.add('is-new')
        button.style.animationDelay = `${Math.min(k * 24, 360)}ms`
        button.addEventListener('animationend', () => {
          button.classList.remove('is-new')
          button.style.animationDelay = ''
        }, { once: true })
      })
    }

    const reveal = from => {
      const stack = [from]
      const fresh = []
      while (stack.length > 0) {
        const position = stack.pop()
        const cell = cells[position]
        if (cell.revealed || cell.flagged) continue

        cell.revealed = true
        revealedCount += 1
        fresh.push(position)

        if (cell.adjacent === 0) {
          for (const n of neighbors(position)) {
            if (!cells[n].revealed) stack.push(n)
          }
        }
      }
      return fresh
    }

    const lose = position => {
      over = true
      stopTimer()
      cells[position].triggered = true
      cells[position].revealed = true
      cells.forEach(cell => {
        if (cell.mine && !cell.flagged) {
          cell.revealed = true
        } else if (!cell.mine && cell.flagged) {
          cell.wrongFlag = true
        }
      })
      paintAll()
      updateStats()
      setStatus('Boom! Mine hit.', true)
      window.ui.repairFocus(buttons, position, resetEl)
    }

    const win = position => {
      over = true
      stopTimer()
      cells.forEach(cell => {
        if (cell.mine && !cell.flagged) {
          cell.flagged = true
        }
      })
      flags = MINES

      const previous = readBest()
      const timeScore = Math.max(1, elapsedSeconds)
      const isNewBest = previous === null || timeScore < previous
      if (isNewBest) {
        window.storage.set('minesweeper-best', String(timeScore))
      }

      paintAll()
      updateStats()
      setStatus(isNewBest ? `Field cleared in ${formatTime(elapsedSeconds)}. New best!` : `Field cleared in ${formatTime(elapsedSeconds)}.`, true)
      window.ui.repairFocus(buttons, position, resetEl)
    }

    const chord = position => {
      const cell = cells[position]
      if (!cell.revealed || cell.adjacent === 0 || over) return
      const adj = neighbors(position)
      const flaggedNeighbors = adj.filter(n => cells[n].flagged).length
      if (flaggedNeighbors !== cell.adjacent) return

      const fresh = []
      for (const n of adj) {
        if (cells[n].flagged || cells[n].revealed) continue
        if (cells[n].mine) {
          lose(n)
          return
        }
        fresh.push(...reveal(n))
      }
      paintFresh(fresh)
      if (revealedCount === TOTAL - MINES) {
        win(position)
      } else {
        window.ui.repairFocus(buttons, position, resetEl)
      }
    }

    const interact = (position, flag) => {
      if (over || position < 0 || position >= TOTAL) return
      lastFocusedIndex = position

      const cell = cells[position]

      if (cell.revealed) {
        if (!flag && cell.adjacent > 0) chord(position)
        return
      }

      if (flag) {
        cell.flagged = !cell.flagged
        flags += cell.flagged ? 1 : -1
        paintAll()
        updateLiveStatus()
        return
      }

      if (cell.flagged) return

      if (!started) {
        placeMines(position)
        started = true
        startTimer()
      }

      if (cell.mine) {
        lose(position)
        return
      }

      paintFresh(reveal(position))
      if (revealedCount === TOTAL - MINES) {
        win(position)
      } else {
        updateLiveStatus()
        window.ui.repairFocus(buttons, position, resetEl)
      }
    }

    const buildBoard = () => {
      boardEl.replaceChildren()
      buttons = cells.map((cell, position) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'ms-cell'
        button.addEventListener('click', () => interact(position, flagMode))
        boardEl.appendChild(button)
        return button
      })
    }

    const syncFlagButton = () => {
      flagButton.setAttribute('aria-pressed', String(flagMode))
      flagButton.textContent = `Flag mode: ${flagMode ? 'On' : 'Off'}`
    }

    const reset = () => {
      stopTimer()
      cells = emptyGrid()
      started = false
      over = false
      flagMode = false
      flags = 0
      revealedCount = 0
      elapsedSeconds = 0
      timerEl.textContent = '0s'
      window.ui.clearStats(metaEl)
      syncFlagButton()
      setStatus(`${MINES} mines remaining`)
      buildBoard()
      paintAll()
    }

    const toggleFlagMode = () => {
      flagMode = !flagMode
      syncFlagButton()
    }

    const activate = () => {
      if (started && !over) startTimer()
    }

    const deactivate = () => {
      stopTimer()
    }

    flagButton.addEventListener('click', toggleFlagMode)
    resetEl.addEventListener('click', reset)
    boardEl.addEventListener('contextmenu', event => {
      const button = event.target.closest('.ms-cell')
      if (!button) return
      event.preventDefault()
      interact(buttons.indexOf(button), true)
    })
    boardEl.addEventListener('keydown', event => {
      if (event.key.toLowerCase() === 'f') {
        const button = event.target.closest('.ms-cell')
        if (!button) return
        event.preventDefault()
        interact(buttons.indexOf(button), true)
      }
    })

    reset()
    return { activate, deactivate }
  }

  window.createMinesweeper = createMinesweeper
})()
