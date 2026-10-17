(() => {
  const createMemory = root => {
    const gridEl = root.querySelector('.memory-grid')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const resetEl = root.querySelector('.reset')

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const SHAPES = [
      { name: 'Circle', color: 'var(--tone-red)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>' },
      { name: 'Square', color: 'var(--tone-amber)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>' },
      { name: 'Triangle', color: 'var(--tone-green)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 L20.5 19.5 H3.5 Z"/></svg>' },
      { name: 'Diamond', color: 'var(--accent)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L21 12 L12 21 L3 12 Z"/></svg>' },
      { name: 'Star', color: 'var(--tone-purple)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L14.8 9.2 L21.7 10.1 L16.7 14.9 L18 21.7 L12 18.4 L6 21.7 L7.3 14.9 L2.3 10.1 L9.2 9.2 Z"/></svg>' },
      { name: 'Cross', color: 'var(--tone-cyan)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z"/></svg>' },
      { name: 'Hexagon', color: 'var(--tone-pink)', svg: '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/></svg>' },
      { name: 'Ring', color: 'var(--tone-orange)', svg: '<svg class="shape shape-outline" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/></svg>' }
    ]

    const PAIRS = SHAPES.length

    let deck = []
    let states = []
    let revealed = []
    let pending = []
    let moves = 0
    let matched = 0
    let lock = false
    let timeoutId = null

    const cells = []

    const readBest = () => {
      const stored = Number(window.storage.get('memory-best'))
      return Number.isFinite(stored) && stored > 0 ? stored : null
    }

    const updateStats = () => {
      const best = readBest()
      window.ui.writeStats(metaEl, [
        { label: 'Pairs', value: `${matched} / ${PAIRS}` },
        { label: 'Moves', value: moves },
        { label: 'Best', value: best !== null ? `${best} moves` : '—' }
      ])
    }

    const buildDeck = () => {
      deck = []
      for (let pair = 0; pair < PAIRS; pair++) {
        deck.push(pair, pair)
      }
      window.ui.shuffle(deck)
      states = deck.map(() => 'hidden')
    }

    const buildBoard = () => {
      gridEl.replaceChildren()
      cells.length = 0

      deck.forEach((pair, index) => {
        const shape = SHAPES[pair]
        const card = document.createElement('button')
        card.type = 'button'
        card.className = 'memory-card'
        card.style.setProperty('--shape-color', shape.color)
        card.setAttribute('aria-label', `Card ${index + 1}: Hidden`)
        card.innerHTML =
          `<span class="memory-inner">` +
            `<span class="memory-face memory-back"></span>` +
            `<span class="memory-face memory-front">${shape.svg}</span>` +
          `</span>`
        card.addEventListener('click', () => flip(index))
        gridEl.appendChild(card)
        cells[index] = card
      })
    }

    const hidePending = () => {
      for (const index of pending) {
        states[index] = 'hidden'
        cells[index].classList.remove('is-revealed')
        cells[index].setAttribute('aria-label', `Card ${index + 1}: Hidden`)
      }
      pending = []
      lock = false
    }

    const finish = lastIndex => {
      const previous = readBest()
      const isNewBest = previous === null || moves < previous
      if (isNewBest) {
        window.storage.set('memory-best', String(moves))
      }

      setStatus(isNewBest ? `Solved in ${moves} moves. New best!` : `Solved in ${moves} moves.`, true)
      updateStats()
      window.ui.repairFocus(cells, lastIndex, resetEl)
    }

    const flip = index => {
      if (lock || states[index] !== 'hidden') return

      const shape = SHAPES[deck[index]]
      states[index] = 'revealed'
      cells[index].classList.add('is-revealed')
      cells[index].setAttribute('aria-label', `Card ${index + 1}: ${shape.name}`)
      revealed.push(index)

      if (revealed.length < 2) {
        setStatus(`Moves ${moves}. Pick a second card`)
        return
      }

      moves += 1
      const [first, second] = revealed
      revealed = []

      if (deck[first] === deck[second]) {
        states[first] = 'matched'
        states[second] = 'matched'
        cells[first].classList.add('is-matched')
        cells[second].classList.add('is-matched')
        cells[first].disabled = true
        cells[second].disabled = true
        cells[first].setAttribute('aria-label', `Card ${first + 1}: ${shape.name} (Matched)`)
        cells[second].setAttribute('aria-label', `Card ${second + 1}: ${shape.name} (Matched)`)
        matched += 1
        if (matched === PAIRS) {
          finish(second)
        } else {
          setStatus(`Match found! (${matched} / ${PAIRS})`)
          window.ui.repairFocus(cells, second, resetEl)
        }
        return
      }

      setStatus(`Moves ${moves}`)
      lock = true
      pending = [first, second]
      timeoutId = window.setTimeout(() => {
        timeoutId = null
        hidePending()
      }, 720)
    }

    const reset = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      revealed = []
      pending = []
      lock = false
      moves = 0
      matched = 0

      buildDeck()
      buildBoard()
      window.ui.clearStats(metaEl)
      setStatus('Flip two cards to start.')
    }

    const deactivate = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
        hidePending()
      }
    }

    resetEl.addEventListener('click', reset)

    reset()
    return { deactivate }
  }

  window.createMemory = createMemory
})()
