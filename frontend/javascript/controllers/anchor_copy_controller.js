import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.querySelectorAll("a.anchor").forEach((link) => {
      link.addEventListener("click", this.copy)
    })
  }

  disconnect() {
    this.element.querySelectorAll("a.anchor").forEach((link) => {
      link.removeEventListener("click", this.copy)
    })
  }

  copy = (event) => {
    event.preventDefault()
    const url = `${window.location.origin}${window.location.pathname}${event.currentTarget.getAttribute("href")}`
    navigator.clipboard.writeText(url).then(() => {
      const link = event.currentTarget
      const original = link.textContent
      link.textContent = "Copied!"
      link.classList.add("copied")
      setTimeout(() => {
        link.textContent = ""
        link.classList.remove("copied")
      }, 1500)
    })
  }
}
