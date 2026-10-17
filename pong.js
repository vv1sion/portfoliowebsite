(() => {
  const createPong = root => {
    const canvas = root.querySelector('.stage-canvas')
    const overlay = root.querySelector('.stage-overlay')
    const overlayText = root.querySelector('.stage-overlay-text')
    const stage = root.querySelector('.stage')
    const statusEl = root.querySelector('.status')
    const metaEl = root.querySelector('.meta')
    const resetEl = root.querySelector('.reset')

    const setStatus = window.ui.createStatus(root, statusEl, resetEl)

    const WIDTH = 720
    const HEIGHT = 440
    const { ctx, syncScale } = window.ui.setupCanvas(canvas, WIDTH, HEIGHT)

    const PADDLE = { width: 12, height: 84, offset: 26 }
    const BALL_RADIUS = 9
    const WIN_SCORE = 7
    const PLAYER_SPEED = 540
    const AI_SPEED = 250
    const BALL_SPEED = 330
    const BALL_SPEED_MAX = 700
    const SERVE_DELAY = 0.65

    let playerY = 0
    let aiY = 0
    let ball = { x: 0, y: 0, vx: 0, vy: 0 }
    let serveDirection = 1
    let serveTimer = 0
    let playerScore = 0
    let aiScore = 0
    let state = 'ready'
    let keys = { up: false, down: false }
    let pointerY = null
    let lastTime = 0
    let frameId = null
    let active = false
    let paletteCache = null
    let paletteTheme = null

    const palette = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      if (paletteCache && paletteTheme === theme) return paletteCache
      const styles = getComputedStyle(document.documentElement)
      const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback
      paletteCache = {
        field: read('--hole', '#0c0d11'),
        line: read('--border', '#2a2e3a'),
        player: read('--accent', '#6d8bff'),
        ai: read('--muted', '#9aa2b4'),
        ball: read('--text', '#edeff5')
      }
      paletteTheme = theme
      return paletteCache
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

    const updateScore = () => {
      setStatus(`${playerScore} : ${aiScore}`)
      if (state === 'running') window.ui.bump(statusEl)
    }

    const showOverlay = text => {
      overlayText.textContent = text
      overlay.hidden = false
    }

    const hideOverlay = () => {
      overlay.hidden = true
    }

    const centerPaddles = () => {
      playerY = HEIGHT / 2 - PADDLE.height / 2
      aiY = HEIGHT / 2 - PADDLE.height / 2
    }

    const serve = direction => {
      serveDirection = direction
      serveTimer = SERVE_DELAY
      ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 }
    }

    const launch = () => {
      const angle = Math.random() * 0.6 - 0.3
      ball.vx = serveDirection * BALL_SPEED * Math.cos(angle)
      ball.vy = BALL_SPEED * Math.sin(angle)
    }

    const bounce = (x, paddleY, direction) => {
      const relative = (ball.y - (paddleY + PADDLE.height / 2)) / (PADDLE.height / 2)
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, BALL_SPEED_MAX)
      const angle = clamp(relative, -1, 1) * (Math.PI / 3.6)
      ball.x = x
      ball.vx = direction * speed * Math.cos(angle)
      ball.vy = speed * Math.sin(angle)
    }

    const end = () => {
      state = 'over'
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
      const won = playerScore > aiScore
      stage.classList.remove('is-live')
      window.ui.writeStats(metaEl, [
        { label: 'Your points', value: playerScore },
        { label: 'Engine points', value: aiScore },
        { label: 'First to', value: WIN_SCORE }
      ])
      setStatus(won ? `You win (${playerScore} : ${aiScore}).` : `Engine wins (${playerScore} : ${aiScore}).`, true)
      showOverlay(won ? 'You win! Click to play again' : 'Engine wins. Click to play again')
    }

    const addPoint = scorer => {
      if (scorer === 'player') playerScore += 1
      else aiScore += 1
      updateScore()

      if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
        end()
        return
      }
      serve(scorer === 'player' ? 1 : -1)
    }

    const movePaddle = (current, target, speed, dt) => {
      const delta = target - current
      const stepDist = speed * dt
      if (Math.abs(delta) <= stepDist) return target
      return current + Math.sign(delta) * stepDist
    }

    const step = dt => {
      if (keys.up) playerY -= PLAYER_SPEED * dt
      else if (keys.down) playerY += PLAYER_SPEED * dt
      else if (pointerY !== null) playerY = pointerY - PADDLE.height / 2
      playerY = clamp(playerY, 0, HEIGHT - PADDLE.height)

      const aiTarget = serveTimer > 0 || ball.vx > 0 ? ball.y : HEIGHT / 2
      aiY = clamp(movePaddle(aiY, aiTarget - PADDLE.height / 2, AI_SPEED, dt), 0, HEIGHT - PADDLE.height)

      if (serveTimer > 0) {
        serveTimer -= dt
        if (serveTimer <= 0) launch()
        return
      }

      const prevX = ball.x
      ball.x += ball.vx * dt
      ball.y += ball.vy * dt

      if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS
        ball.vy = Math.abs(ball.vy)
      } else if (ball.y + BALL_RADIUS > HEIGHT) {
        ball.y = HEIGHT - BALL_RADIUS
        ball.vy = -Math.abs(ball.vy)
      }

      const playerRight = PADDLE.offset + PADDLE.width
      const playerLeft = PADDLE.offset
      const aiLeft = WIDTH - PADDLE.offset - PADDLE.width
      const aiRight = WIDTH - PADDLE.offset

      if (
        ball.vx < 0 &&
        prevX - BALL_RADIUS >= playerLeft &&
        ball.x - BALL_RADIUS <= playerRight &&
        ball.y + BALL_RADIUS >= playerY &&
        ball.y - BALL_RADIUS <= playerY + PADDLE.height
      ) {
        bounce(playerRight + BALL_RADIUS, playerY, 1)
      } else if (
        ball.vx > 0 &&
        prevX + BALL_RADIUS <= aiRight &&
        ball.x + BALL_RADIUS >= aiLeft &&
        ball.y + BALL_RADIUS >= aiY &&
        ball.y - BALL_RADIUS <= aiY + PADDLE.height
      ) {
        bounce(aiLeft - BALL_RADIUS, aiY, -1)
      }

      if (ball.x + BALL_RADIUS < 0) addPoint('ai')
      else if (ball.x - BALL_RADIUS > WIDTH) addPoint('player')
    }

    const draw = () => {
      syncScale()
      const color = palette()

      ctx.fillStyle = color.field
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      ctx.strokeStyle = color.line
      ctx.lineWidth = 2
      ctx.setLineDash([10, 12])
      ctx.beginPath()
      ctx.moveTo(WIDTH / 2, 0)
      ctx.lineTo(WIDTH / 2, HEIGHT)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = color.player
      ctx.beginPath()
      ctx.roundRect(PADDLE.offset, playerY, PADDLE.width, PADDLE.height, 6)
      ctx.fill()

      ctx.fillStyle = color.ai
      ctx.beginPath()
      ctx.roundRect(WIDTH - PADDLE.offset - PADDLE.width, aiY, PADDLE.width, PADDLE.height, 6)
      ctx.fill()

      ctx.fillStyle = color.ball
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }

    const loop = time => {
      if (state !== 'running') {
        frameId = null
        return
      }
      frameId = requestAnimationFrame(loop)
      if (!lastTime) lastTime = time
      let dt = (time - lastTime) / 1000
      lastTime = time
      if (dt > 0.05) dt = 0.05
      step(dt)
      draw()
    }

    const start = () => {
      if (state === 'over') reset()
      if (state === 'running') return
      state = 'running'
      stage.classList.add('is-live')
      hideOverlay()
      lastTime = 0
      if (!frameId) frameId = requestAnimationFrame(loop)
    }

    const pause = () => {
      if (state !== 'running') return
      state = 'paused'
      stage.classList.remove('is-live')
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
      playerScore = 0
      aiScore = 0
      state = 'ready'
      lastTime = 0
      pointerY = null
      stage.classList.remove('is-live')
      keys = { up: false, down: false }
      centerPaddles()
      serve(Math.random() < 0.5 ? 1 : -1)
      window.ui.clearStats(metaEl)
      updateScore()
      draw()
      showOverlay('Click or press Space to start')
    }

    const updatePointerFromEvent = event => {
      const rect = canvas.getBoundingClientRect()
      if (rect.height <= 0) return
      pointerY = (event.clientY - rect.top) * (HEIGHT / rect.height)
    }

    let lastTouchStamp = -Infinity

    const onPointerDown = event => {
      if (event.pointerType !== 'touch') return
      updatePointerFromEvent(event)
      lastTouchStamp = event.timeStamp
      toggle()
    }

    const onPointerMove = event => {
      updatePointerFromEvent(event)
      if (event.pointerType === 'touch' && state === 'running') {
        event.preventDefault()
      }
    }

    const onStageClick = event => {
      if (event.timeStamp - lastTouchStamp < 600) return
      toggle()
    }

    const onKeyDown = event => {
      if (!active) return
      const key = event.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') {
        pointerY = null
        keys.up = true
        event.preventDefault()
        if (state === 'ready') start()
      } else if (key === 'arrowdown' || key === 's') {
        pointerY = null
        keys.down = true
        event.preventDefault()
        if (state === 'ready') start()
      } else if (event.key === ' ') {
        event.preventDefault()
        toggle()
      }
    }

    const onKeyUp = event => {
      const key = event.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') keys.up = false
      else if (key === 'arrowdown' || key === 's') keys.down = false
    }

    const onThemeChange = () => {
      paletteCache = null
      draw()
    }

    const activate = () => {
      active = true
      stage.addEventListener('pointerdown', onPointerDown)
      stage.addEventListener('pointermove', onPointerMove)
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      window.addEventListener('themechange', onThemeChange)
      draw()
    }

    const deactivate = () => {
      active = false
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('themechange', onThemeChange)
      keys = { up: false, down: false }
      if (state === 'running') {
        pause()
      } else if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    stage.addEventListener('click', onStageClick)
    resetEl.addEventListener('click', reset)

    reset()
    return { activate, deactivate }
  }

  window.createPong = createPong
})()
