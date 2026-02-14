import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.querySelectorAll("pre.highlight, pre[lang]").forEach((pre) => {
      const wrapper = document.createElement("div")
      wrapper.style.position = "relative"
      pre.parentNode.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      const button = document.createElement("button")
      button.className = "code-copy-btn"
      button.textContent = "Copy"
      button.addEventListener("click", () => this.copy(pre, button))
      wrapper.appendChild(button)
    })
  }

  copy(pre, button) {
    const code = pre.textContent
    navigator.clipboard.writeText(code).then(() => {
      button.textContent = "Copied!"
      button.classList.add("copied")
      setTimeout(() => {
        button.textContent = "Copy"
        button.classList.remove("copied")
      }, 1500)
    })
  }
}
