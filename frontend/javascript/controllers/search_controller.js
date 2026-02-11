import { Controller } from "@hotwired/stimulus"

function loadAsset(tag, attrs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag)
    Object.assign(el, attrs)
    el.onload = resolve
    el.onerror = reject
    document.head.appendChild(el)
  })
}

let assetsLoaded = false

async function ensurePagefindAssets() {
  if (assetsLoaded || typeof PagefindUI !== "undefined") {
    assetsLoaded = true
    return true
  }

  try {
    await Promise.all([
      loadAsset("link", { rel: "stylesheet", href: "/pagefind/pagefind-ui.css" }),
      loadAsset("script", { src: "/pagefind/pagefind-ui.js" }),
    ])
    assetsLoaded = true
    return true
  } catch {
    return false
  }
}

export default class extends Controller {
  async connect() {
    this.element.style.visibility = "hidden"

    const loaded = await ensurePagefindAssets()
    if (!loaded || typeof PagefindUI === "undefined") return

    this.ui = new PagefindUI({
      element: this.element,
      showSubResults: true,
      showImages: false,
    })

    this.element.style.visibility = "visible"

    this.handleKeydown = (e) => {
      if (e.key === "Escape") {
        const input = this.element.querySelector(".pagefind-ui__search-input")
        if (input) {
          input.value = ""
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.blur()
        }
      }
    }
    this.element.addEventListener("keydown", this.handleKeydown)
  }

  disconnect() {
    if (this.handleKeydown) {
      this.element.removeEventListener("keydown", this.handleKeydown)
    }
    if (this.ui) {
      this.element.innerHTML = ""
      this.ui = null
    }
  }
}
