import { reactive } from 'vue'
import { GLOSSARY, type TermEntry } from './glossary'

// 术语弹卡状态：全站只有一个，定位用视口坐标
export const termTip = reactive({
  open: false,
  term: '',
  en: '',
  tip: '',
  see: '',
  x: 0,
  y: 0,
  above: false
})

// 不在这些容器里做标注：代码、链接、标题、交互组件内部、已标注过的词
const SKIP = [
  'code', 'pre', 'kbd', 'a', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  '.widget', '.box-h', '.term', '.out', '.chips',
  '.lec-kicker', '.tab-cap', '.src', '.en',
  'mjx-container'
].join(', ')

/** 从 /lectures/03.html 这类路径里取出讲号 */
export function chapterOf(path: string): string | null {
  const m = path.match(/\/lectures\/(\d{2})/)
  return m ? m[1] : null
}

function openFor(el: HTMLElement, e: TermEntry) {
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(320, vw - 24)
  const above = r.bottom + 220 > vh
  termTip.term = e.term
  termTip.en = e.en || ''
  termTip.tip = e.tip
  termTip.see = e.see || ''
  termTip.x = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), vw - width - 12)
  termTip.y = above ? r.top - 8 : r.bottom + 8
  termTip.above = above
  termTip.open = true
}

/**
 * 把 root 里每个术语的第一次出现包成可点的按钮。
 * 只在客户端调用（onMounted / 路由切换后），不参与服务端渲染。
 */
export function annotate(root: HTMLElement, chapter: string) {
  const entries = GLOSSARY[chapter]
  if (!entries || !entries.length) return

  const pending = new Map(entries.map(e => [e.term, e]))
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  for (const node of nodes) {
    if (!node.isConnected) continue
    const parent = node.parentElement
    if (!parent || parent.closest(SKIP)) continue

    let rest: Text | null = node
    while (rest && rest.isConnected) {
      const text = rest.nodeValue
      if (!text) break

      let hit: { i: number, term: string, entry: TermEntry } | null = null
      for (const [term, entry] of pending) {
        const i = text.indexOf(term)
        if (i < 0) continue
        // 拉丁词要求词边界，否则 logit 会切进 logits、GPU 会切进 GPUs
        if (/^[\x00-\x7F]+$/.test(term)) {
          const prev = text[i - 1]
          const next = text[i + term.length]
          if (prev && /[A-Za-z0-9]/.test(prev)) continue
          if (next && /[A-Za-z0-9]/.test(next)) continue
        }
        if (!hit || i < hit.i || (i === hit.i && term.length > hit.term.length)) {
          hit = { i, term, entry }
        }
      }
      if (!hit) break

      const before = text.slice(0, hit.i)
      const after = text.slice(hit.i + hit.term.length)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'term'
      btn.textContent = hit.term
      btn.setAttribute('aria-label', `${hit.term}：补充解释`)
      const entry = hit.entry
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        openFor(ev.currentTarget as HTMLElement, entry)
      })

      const tail = document.createTextNode(after)
      const frag = document.createDocumentFragment()
      if (before) frag.appendChild(document.createTextNode(before))
      frag.appendChild(btn)
      frag.appendChild(tail)
      rest.parentNode?.replaceChild(frag, rest)

      pending.delete(hit.term)
      rest = after ? tail : null
    }
  }
}
