(() => {
  window.storage = {
    get: key => {
      try {
        return window.localStorage.getItem(key)
      } catch (error) {
        console.warn('localStorage is unavailable', error)
        return null
      }
    },
    set: (key, value) => {
      try {
        window.localStorage.setItem(key, value)
      } catch (error) {
        console.warn('localStorage is unavailable', error)
      }
    }
  }
})()
