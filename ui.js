(() => {
  const writeStats = (list, rows) => {
    list.replaceChildren()

    for (const row of rows) {
      const item = document.createElement('li')
      const label = document.createElement('span')
      const value = document.createElement('span')

      label.className = 'meta-label'
      label.textContent = row.label
      value.className = 'meta-value'
      value.textContent = String(row.value)

      item.append(label, value)
      list.appendChild(item)
    }
  }

  const createStatus = (root, statusEl, resetEl) => (text, isResult = false) => {
    statusEl.textContent = text
    if (isResult) statusEl.classList.remove('is-bump')
    statusEl.classList.toggle('is-result', isResult)
    root.classList.toggle('is-finished', isResult)
    if (resetEl) {
      resetEl.textContent = isResult ? 'Play again' : 'New game'
    }
  }

  const shuffle = items => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const swap = items[i]
      items[i] = items[j]
      items[j] = swap
    }
    return items
  }

  const setupCanvas = (canvas, logicalWidth, logicalHeight) => {
    const ctx = canvas.getContext('2d')
    const syncScale = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const targetWidth = Math.round(logicalWidth * dpr)
      const targetHeight = Math.round(logicalHeight * dpr)
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    syncScale()
    return { ctx, syncScale }
  }

  const repairFocus = (candidates, preferredIndex, fallbackEl) => {
    const active = document.activeElement
    if (active && active !== document.body && !active.disabled) return
    if (typeof preferredIndex === 'number' && candidates[preferredIndex] && !candidates[preferredIndex].disabled) {
      candidates[preferredIndex].focus()
      return
    }
    for (let offset = 1; offset < candidates.length; offset++) {
      const right = candidates[preferredIndex + offset]
      if (right && !right.disabled) {
        right.focus()
        return
      }
      const left = candidates[preferredIndex - offset]
      if (left && !left.disabled) {
        left.focus()
        return
      }
    }
    const anyEnabled = candidates.find(el => el && !el.disabled)
    if (anyEnabled) {
      anyEnabled.focus()
    } else if (fallbackEl) {
      fallbackEl.focus()
    }
  }

  const clearStats = list => {
    list.replaceChildren()
  }

  const bump = el => {
    el.classList.remove('is-bump')
    void el.offsetWidth
    el.classList.add('is-bump')
  }

  window.writeStats = writeStats
  window.ui = {
    writeStats,
    clearStats,
    bump,
    createStatus,
    shuffle,
    setupCanvas,
    repairFocus
  }
})()
