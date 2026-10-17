(() => {
  const games = [
    {
      id: 'connect-four',
      title: 'Connect Four',
      tagline: 'Four in a row',
      description: 'Drop discs into a seven-column grid and line up four before the engine can stop you.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><circle cx="15" cy="20" r="13" fill="var(--card-a)"/><circle cx="45" cy="20" r="13" fill="var(--card-b)"/><circle cx="75" cy="20" r="13" fill="var(--card-a)"/><circle cx="105" cy="20" r="13" fill="var(--card-b)"/></svg>'
    },
    {
      id: 'tic-tac-toe',
      title: 'Tic-Tac-Toe',
      tagline: 'Three in a row',
      description: 'Outsmart the engine to line up three in a row. Starting turns alternate each match.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><path d="M8 8 L32 32 M32 8 L8 32" fill="none" stroke="var(--card-a)" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="20" r="13" fill="none" stroke="var(--card-b)" stroke-width="6"/><path d="M88 8 L112 32 M112 8 L88 32" fill="none" stroke="var(--card-a)" stroke-width="6" stroke-linecap="round"/></svg>'
    },
    {
      id: 'memory',
      title: 'Memory',
      tagline: 'Find the pairs',
      description: 'Flip two cards at a time and remember where each shape hides. Fewer moves, better score.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><rect x="14" y="6" width="30" height="28" rx="6" fill="var(--card-a)"/><rect x="60" y="6" width="30" height="28" rx="6" fill="none" stroke="var(--card-b)" stroke-width="5"/></svg>'
    },
    {
      id: 'minesweeper',
      title: 'Minesweeper',
      tagline: 'Clear the field',
      description: 'Ten mines hide in a nine-by-nine field. Open every safe tile and flag the ones you suspect.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><g stroke="var(--card-a)" stroke-width="4" stroke-linecap="round"><path d="M42 8v6M42 26v6M34 20h-6M56 20h6M36.3 14.3l-4.2-4.2M47.7 25.7l4.2 4.2M47.7 14.3l4.2-4.2M36.3 25.7l-4.2 4.2"/></g><circle cx="42" cy="20" r="7" fill="var(--card-a)"/><path d="M86 6v28" stroke="var(--card-b)" stroke-width="4" stroke-linecap="round"/><path d="M86 7h16l-4 5.5 4 5.5H86z" fill="var(--card-b)"/></svg>'
    },
    {
      id: 'pong',
      title: 'Pong',
      tagline: 'Keep the rally alive',
      description: 'Keep the ball alive and slip it past the engine. First to seven points takes the match.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><rect x="16" y="8" width="7" height="24" rx="3.5" fill="var(--card-b)"/><circle cx="60" cy="20" r="6" fill="var(--card-a)"/><rect x="97" y="8" width="7" height="24" rx="3.5" fill="var(--card-b)"/></svg>'
    },
    {
      id: 'snake',
      title: 'Snake',
      tagline: 'Eat and grow',
      description: 'Eat to grow your trail. One touch of a wall or your own tail ends the run.',
      motif: '<svg class="card-motif" viewBox="0 0 120 40" aria-hidden="true"><rect x="2" y="12" width="16" height="16" rx="5" fill="var(--card-a)"/><rect x="26" y="12" width="16" height="16" rx="5" fill="var(--card-b)" opacity="0.85"/><rect x="50" y="12" width="16" height="16" rx="5" fill="var(--card-b)" opacity="0.65"/><rect x="74" y="12" width="16" height="16" rx="5" fill="var(--card-b)" opacity="0.45"/><rect x="98" y="12" width="16" height="16" rx="5" fill="var(--card-b)" opacity="0.28"/></svg>'
    }
  ]

  const gameFactories = {
    'connect-four': window.createConnectFour,
    'tic-tac-toe': window.createTicTacToe,
    memory: window.createMemory,
    minesweeper: window.createMinesweeper,
    pong: window.createPong,
    snake: window.createSnake
  }

  const gameById = new Map(games.map(game => [game.id, game]))

  const controllers = new Map()
  let openGame = null
  let lastTrigger = null
  let pushedHistory = false

  const modal = document.getElementById('game-modal')
  const dialog = modal.querySelector('.modal-dialog')
  const titleEl = document.getElementById('modal-title')
  const panels = Array.from(modal.querySelectorAll('.game'))
  const backgroundElements = [
    document.querySelector('.skip-link'),
    document.querySelector('.site-header'),
    document.getElementById('main')
  ].filter(Boolean)

  const setBackgroundInert = isInert => {
    for (const el of backgroundElements) {
      el.inert = isInert
      if (isInert) el.setAttribute('aria-hidden', 'true')
      else el.removeAttribute('aria-hidden')
    }
  }

  const initTheme = () => {
    const root = document.documentElement
    const toggle = document.getElementById('theme-toggle')
    const metaTheme = document.getElementById('meta-theme-color')
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null

    const applyTheme = theme => {
      root.setAttribute('data-theme', theme)
      const isDark = theme === 'dark'
      toggle.setAttribute('aria-checked', String(isDark))
      if (metaTheme) metaTheme.setAttribute('content', isDark ? '#101116' : '#f5f6f8')
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
    }

    const stored = window.storage.get('theme')
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored)
    } else if (mediaQuery) {
      applyTheme(mediaQuery.matches ? 'light' : 'dark')
    } else {
      applyTheme(root.getAttribute('data-theme') || 'dark')
    }

    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      window.storage.set('theme', next)
      applyTheme(next)
    })

    if (mediaQuery && mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', event => {
        if (!window.storage.get('theme')) {
          applyTheme(event.matches ? 'light' : 'dark')
        }
      })
    }
  }

  const focusableItems = () =>
    Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(element => !element.disabled && element.offsetParent !== null)

  const openModal = (id, trigger, options = {}) => {
    if (!gameFactories[id]) return
    if (openGame === id) return

    if (openGame !== null) {
      const prevController = controllers.get(openGame)
      if (prevController && prevController.deactivate) prevController.deactivate()
    } else {
      lastTrigger = trigger || document.querySelector(`.game-card[data-game="${id}"]`) || null
    }

    openGame = id

    for (const panel of panels) panel.hidden = panel.dataset.game !== id
    titleEl.textContent = gameById.get(id).title

    if (!controllers.has(id)) {
      controllers.set(id, gameFactories[id](modal.querySelector(`.game[data-game="${id}"]`)))
    }
    const controller = controllers.get(id)
    if (controller && controller.activate) controller.activate()

    modal.hidden = false
    document.body.classList.add('modal-open')
    setBackgroundInert(true)

    if (!options.fromHistory) {
      const targetHash = `#${id}`
      if (window.location.hash !== targetHash) {
        window.history.pushState({ game: id }, '', targetHash)
        pushedHistory = true
      }
    }

    dialog.focus()
  }

  const closeModal = (options = {}) => {
    if (openGame === null) return
    const controller = controllers.get(openGame)
    if (controller && controller.deactivate) controller.deactivate()

    modal.hidden = true
    document.body.classList.remove('modal-open')
    setBackgroundInert(false)

    openGame = null

    if (!options.fromHistory) {
      if (pushedHistory) {
        pushedHistory = false
        window.history.back()
      } else if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    } else {
      pushedHistory = false
    }

    if (lastTrigger) lastTrigger.focus()
    lastTrigger = null
  }

  const syncFromLocation = () => {
    const requested = window.location.hash.slice(1)
    if (requested && gameFactories[requested]) {
      openModal(requested, null, { fromHistory: true })
    } else if (openGame !== null) {
      closeModal({ fromHistory: true })
    }
  }

  const initModal = () => {
    for (const element of document.querySelectorAll('[data-close]')) {
      element.addEventListener('click', () => closeModal())
    }

    window.addEventListener('popstate', syncFromLocation)
    window.addEventListener('hashchange', syncFromLocation)

    document.addEventListener('keydown', event => {
      if (openGame === null) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
        return
      }

      if (event.key !== 'Tab') return
      const items = focusableItems()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (active === dialog || !dialog.contains(active)) {
        event.preventDefault()
        if (event.shiftKey) last.focus()
        else first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    })
  }

  const renderPicker = () => {
    const picker = document.querySelector('.game-picker')

    for (const game of games) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'game-card'
      card.dataset.game = game.id
      card.setAttribute('aria-label', `Play ${game.title}: ${game.tagline}`)
      card.innerHTML =
        `<span class="card-inner">` +
          `<span class="card-face card-front">` +
            `<span class="card-head">` +
              `<span class="card-title">${game.title}</span>` +
              `<span class="card-tagline">${game.tagline}</span>` +
            `</span>` +
            game.motif +
          `</span>` +
          `<span class="card-face card-back">` +
            `<span class="card-title">${game.title}</span>` +
            `<span class="card-desc">${game.description}</span>` +
          `</span>` +
        `</span>`

      card.addEventListener('click', () => openModal(game.id, card))
      picker.appendChild(card)
    }
  }

  const init = () => {
    renderPicker()
    syncFromLocation()
  }

  initTheme()
  initModal()
  init()
})()
