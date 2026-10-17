(() => {
  const createSnake = root => {
    const canvas = root.querySelector('.stage-canvas')
    const overlay = root.querySelector('.stage-overlay')
    const overlayText = root.querySelector('.stage-overlay-text')
    const stage = root.querySelector('.stage')
    const resetEl = root.querySelector('.reset')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const padButtons = Array.from(root.querySelectorAll('.dpad button'))

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const SIZE = 600
    const GRID = 20
    const CELL = SIZE / GRID
    const BASE_INTERVAL = 140
    const MIN_INTERVAL = 70
    const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

    const { ctx, syncScale } = window.ui.setupCanvas(canvas, SIZE, SIZE)

    let snake = []
    let direction = { x: 1, y: 0 }
    let queue = []
    let food = { x: 0, y: 0 }
    let score = 0
    let best = Number(window.storage.get('snake-best')) || 0
    let state = 'ready'
    let accumulator = 0
    let lastTime = 0
    let frameId = null
    let active = false
    let paletteCache = null
    let paletteTheme = null
    let swipeStart = null

    const palette = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      if (paletteCache && paletteTheme === theme) return paletteCache
      const styles = getComputedStyle(document.documentElement)
      const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback
      paletteCache = {
        bg: read('--snake-bg', '#0a0b0f'),
        grid: read('--snake-grid', '#1c1f28'),
        head: read('--snake-head', '#46d17f'),
        body: read('--snake-body', '#2ba55f'),
        food: read('--snake-food', '#ff5a5a')
      }
      paletteTheme = theme
      return paletteCache
    }

    const updateStats = () => {
      window.ui.writeStats(metaEl, [
        { label: 'Score', value: score },
        { label: 'Best', value: best }
      ])
    }

    const randomFood = () => {
      const free = []
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (!snake.some(segment => segment.x === x && segment.y === y)) free.push({ x, y })
        }
      }
      if (free.length === 0) {
        food = null
        return false
      }
      food = free[Math.floor(Math.random() * free.length)]
      return true
    }

    const showOverlay = text => {
      overlayText.textContent = text
      overlay.hidden = false
    }

    const hideOverlay = () => {
      overlay.hidden = true
    }

    const draw = () => {
      syncScale()
      const color = palette()
      ctx.fillStyle = color.bg
      ctx.fillRect(0, 0, SIZE, SIZE)

      ctx.strokeStyle = color.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let index = 1; index < GRID; index++) {
        const position = index * CELL + 0.5
        ctx.moveTo(position, 0)
        ctx.lineTo(position, SIZE)
        ctx.moveTo(0, position)
        ctx.lineTo(SIZE, position)
      }
      ctx.stroke()

      const inset = CELL * 0.14
      const size = CELL - inset * 2

      if (food) {
        ctx.fillStyle = color.food
        ctx.beginPath()
        ctx.roundRect(food.x * CELL + inset, food.y * CELL + inset, size, size, CELL * 0.3)
        ctx.fill()
      }

      for (let index = 0; index < snake.length; index++) {
        const segment = snake[index]
        ctx.fillStyle = index === 0 ? color.head : color.body
        ctx.beginPath()
        ctx.roundRect(segment.x * CELL + inset, segment.y * CELL + inset, size, size, CELL * 0.28)
        ctx.fill()
      }
    }

    const end = (cleared = false) => {
      state = 'over'
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }

      const isNewBest = score > best
      if (isNewBest) {
        best = score
        window.storage.set('snake-best', String(best))
      }

      updateStats()
      if (cleared) {
        setStatus('Board cleared. You win!', true)
        showOverlay('You win! Click to play again')
      } else {
        setStatus(isNewBest ? `New best: ${score}!` : `Game over. Score ${score}.`, true)
        showOverlay('Game over. Click to play again')
      }
    }

    const step = () => {
      if (queue.length > 0) {
        direction = queue.shift()
      }
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
        end(false)
        return
      }
      const eating = Boolean(food) && head.x === food.x && head.y === food.y
      const body = eating ? snake : snake.slice(0, snake.length - 1)
      if (body.some(segment => segment.x === head.x && segment.y === head.y)) {
        end(false)
        return
      }
      snake.unshift(head)
      if (eating) {
        score += 1
        setStatus(`Score ${score}`)
        window.ui.bump(statusEl)
        if (!randomFood()) {
          draw()
          end(true)
        }
      } else {
        snake.pop()
      }
    }

    const loop = time => {
      if (state !== 'running') {
        frameId = null
        return
      }
      frameId = requestAnimationFrame(loop)
      if (!lastTime) lastTime = time
      let delta = time - lastTime
      lastTime = time
      if (delta > 250) delta = 250
      accumulator += delta
      const interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 4)
      while (accumulator >= interval) {
        accumulator -= interval
        step()
        if (state !== 'running') break
      }
      draw()
    }

    const start = () => {
      if (state === 'over') reset()
      if (state === 'running') return
      state = 'running'
      hideOverlay()
      lastTime = 0
      accumulator = 0
      if (!frameId) frameId = requestAnimationFrame(loop)
    }

    const pause = () => {
      if (state !== 'running') return
      state = 'paused'
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
      showOverlay('Paused. Click or press Space to resume')
    }

    const toggle = () => {
      if (state === 'running') pause()
      else start()
    }

    const reset = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
      const mid = Math.floor(GRID / 2)
      snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }]
      direction = { x: 1, y: 0 }
      queue = []
      score = 0
      accumulator = 0
      lastTime = 0
      state = 'ready'
      randomFood()
      window.ui.clearStats(metaEl)
      setStatus('Score 0')
      draw()
      showOverlay('Click or press an arrow key to start')
    }

    const setDirection = (x, y) => {
      if (state === 'ready' || state === 'paused') start()
      if (state !== 'running') return
      const ref = queue.length > 0 ? queue[queue.length - 1] : direction
      if (ref.x === x && ref.y === y) return
      if (ref.x === -x && ref.y === -y) return
      if (queue.length < 2) {
        queue.push({ x, y })
      }
    }

    const keyMap = {
      arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    }

    const onKey = event => {
      if (!active) return
      if (event.key === ' ') {
        event.preventDefault()
        toggle()
        return
      }
      const move = keyMap[event.key.toLowerCase()]
      if (!move) return
      event.preventDefault()
      setDirection(move[0], move[1])
    }

    const onPointerDown = event => {
      swipeStart = { x: event.clientX, y: event.clientY, swiped: false }
    }

    const onPointerMove = event => {
      if (!swipeStart || swipeStart.swiped) return
      const dx = event.clientX - swipeStart.x
      const dy = event.clientY - swipeStart.y
      if (Math.hypot(dx, dy) < 24) return
      swipeStart.swiped = true
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 1 : -1, 0)
      } else {
        setDirection(0, dy > 0 ? 1 : -1)
      }
    }

    const onStageClick = () => {
      if (swipeStart && swipeStart.swiped) {
        swipeStart = null
        return
      }
      swipeStart = null
      toggle()
    }

    const onThemeChange = () => {
      paletteCache = null
      draw()
    }

    const activate = () => {
      active = true
      window.addEventListener('keydown', onKey)
      window.addEventListener('themechange', onThemeChange)
      draw()
    }

    const deactivate = () => {
      active = false
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('themechange', onThemeChange)
      if (state === 'running') {
        pause()
      } else if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('click', onStageClick)
    resetEl.addEventListener('click', reset)

    for (const button of padButtons) {
      const move = DIRECTIONS[button.dataset.dir]
      button.addEventListener('click', () => setDirection(move[0], move[1]))
    }

    reset()
    return { activate, deactivate }
  }

  window.createSnake = createSnake
})()
