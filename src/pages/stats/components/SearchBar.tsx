import { Search } from 'lucide-react'

export const SearchBar = ({ value, onChange, placeholder = 'Rechercher...' }) => {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        size={20}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
      />
    </div>
  )
}
