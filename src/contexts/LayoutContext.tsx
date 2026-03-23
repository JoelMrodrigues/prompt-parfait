import { createContext, useContext, useState } from 'react'

interface LayoutContextValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
})

export const useLayout = () => useContext(LayoutContext)

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <LayoutContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </LayoutContext.Provider>
  )
}
