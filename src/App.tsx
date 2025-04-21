import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import cloudflareLogo from './assets/Cloudflare_Logo.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('unknown')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 bg-gray-900 text-white">
      <div className="flex gap-8 items-center justify-center">
        <a href='https://vite.dev' target='_blank' rel="noreferrer" className="hover:opacity-80 transition-opacity">
          <img src={viteLogo} className='h-16 w-16' alt='Vite logo' />
        </a>
        <a href='https://react.dev' target='_blank' rel="noreferrer" className="hover:opacity-80 transition-opacity">
          <img src={reactLogo} className='h-16 w-16 animate-spin-slow' alt='React logo' />
        </a>
        <a href='https://workers.cloudflare.com/' target='_blank' rel="noreferrer" className="hover:opacity-80 transition-opacity">
          <img src={cloudflareLogo} className='h-16 w-16' alt='Cloudflare logo' />
        </a>
      </div>
      <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Vite + React + Cloudflare</h1>
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <button
          type="button"
          onClick={() => setCount((count) => count + 1)}
          aria-label='increment'
          className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          count is {count}
        </button>
        <p className="text-gray-300">
          Edit <code className="bg-gray-700 rounded px-1 py-0.5">src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <button
          type="button"
          onClick={() => {
            fetch('/api/')
              .then((res) => res.json() as Promise<{ name: string }>)
              .then((data) => setName(data.name))
          }}
          aria-label='get name'
          className="w-full mb-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Name from API is: {name}
        </button>
        <p className="text-gray-300">
          Edit <code className="bg-gray-700 rounded px-1 py-0.5">worker/index.ts</code> to change the name
        </p>
      </div>
      <p className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
