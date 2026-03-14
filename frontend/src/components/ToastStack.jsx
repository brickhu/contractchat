import { For } from 'solid-js'
import { toasts } from '../stores/app'

export default function ToastStack() {
  return (
    <div class="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
      <For each={toasts()}>
        {t => (
          <div class={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border pointer-events-auto
            ${t.type === 'error'   ? 'bg-red-950 border-red-500/30 text-red-300' :
              t.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' :
                                     'bg-zinc-800 border-white/10 text-zinc-200'}`}>
            {t.msg}
          </div>
        )}
      </For>
    </div>
  )
}
