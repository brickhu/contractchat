import { onMount, Show } from 'solid-js'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ToastStack from './components/ToastStack'
import ChatPage from './pages/ChatPage'
import DiscoverPage from './pages/DiscoverPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { page, loadModels } from './stores/app'

export default function App() {
  onMount(loadModels)

  return (
    <div class="flex h-screen bg-zinc-950 overflow-hidden font-sans">
      <Sidebar />

      <div class="flex flex-col flex-1 min-w-0">
        <TopBar />

        <main class="flex-1 min-h-0 overflow-hidden">
          <Show when={page() === 'chat'}>     <ChatPage /> </Show>
          <Show when={page() === 'discover'}> <DiscoverPage /> </Show>
          <Show when={page() === 'history'}>  <HistoryPage /> </Show>
          <Show when={page() === 'settings'}> <SettingsPage /> </Show>
        </main>
      </div>

      <ToastStack />
    </div>
  )
}
