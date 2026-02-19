/**
 * Hook pour charger et gérer les champions
 */
import { useState, useEffect } from 'react'
import { loadChampions } from '../../../lib/championLoader'

export const useChampions = () => {
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadChampionsData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await loadChampions()
        setChampions(data)
      } catch (err) {
        setError('Impossible de charger les champions')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadChampionsData()
  }, [])

  return { champions, loading, error }
}
