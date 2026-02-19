/**
 * Détail d'un match - Résumé (équipes), Stats globales, Stats timeline, Timeline global
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, BarChart3, TrendingUp, Map, Wrench } from 'lucide-react'
import { useState, useEffect, Fragment } from 'react'
import {
  fetchMatchById,
  fetchParticipantsByMatch,
  fetchTimelineByMatch,
  updateParticipantRole,
} from '../../../services/supabase/matchQueries'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { loadItems, getItemImageUrl, getItemName } from '../../../lib/items'
import { computeEnemyRoleFixes } from '../../../lib/team/fixEnemyRolesFromDb'

const TABS = [
  { id: 'resume', label: 'Résumé', icon: BarChart3 },
  { id: 'global', label: 'Stats globales', icon: BarChart3 },
  { id: 'timeline', label: 'Stats timeline', icon: TrendingUp },
  { id: 'timeline-global', label: 'Timeline global', icon: Map },
]

function ParticipantTable({ participants, itemsLoaded }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
            <th className="py-3 px-4">Champion</th>
            <th className="py-3 px-4">Rôle</th>
            <th className="py-3 px-4 text-center">K/D/A</th>
            <th className="py-3 px-4 text-right">KDA</th>
            <th className="py-3 px-4 text-right">% KP</th>
            <th className="py-3 px-4 text-right">Dégâts</th>
            <th className="py-3 px-4 text-right">% Dégâts</th>
            <th className="py-3 px-4 text-right">Or</th>
            <th className="py-3 px-4 text-right">% Or</th>
            <th className="py-3 px-4 text-right">CS</th>
            <th className="py-3 px-4 text-right">Vision</th>
            <th className="py-3 px-4">Build (items)</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-b border-dark-border/50 hover:bg-dark-bg/30">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getChampionImage(p.champion_name)}
                    alt={getChampionDisplayName(p.champion_name) || p.champion_name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-medium">
                      {getChampionDisplayName(p.champion_name) || p.champion_name}
                    </div>
                    {p.pseudo && <div className="text-xs text-gray-500">{p.pseudo}</div>}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-400">{p.role || '—'}</td>
              <td className="py-3 px-4 text-center">
                {p.kills}/{p.deaths}/{p.assists}
              </td>
              <td className="py-3 px-4 text-right">{p.kda ?? '—'}</td>
              <td className="py-3 px-4 text-right">
                {p.total_damage_dealt_to_champions != null
                  ? p.total_damage_dealt_to_champions.toLocaleString()
                  : '—'}
              </td>
              <td className="py-3 px-4 text-right">
                {p.gold_earned != null ? p.gold_earned.toLocaleString() : '—'}
              </td>
              <td className="py-3 px-4 text-right">{p.cs ?? '—'}</td>
              <td className="py-3 px-4 text-right">{p.vision_score ?? '—'}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5]
                    .filter((id) => id != null && id !== 0)
                    .map((id, slotIndex) => (
                      <a
                        key={`${p.id}-item-${slotIndex}-${id}`}
                        href={getItemImageUrl(id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                        title={itemsLoaded ? getItemName(id) : `Item ${id}`}
                      >
                        <img
                          src={getItemImageUrl(id)}
                          alt={itemsLoaded ? getItemName(id) : ''}
                          className="w-8 h-8 rounded object-cover border border-dark-border hover:border-accent-blue"
                        />
                      </a>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const MatchDetailPage = () => {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPlayerId = location.state?.fromPlayer
  const [match, setMatch] = useState(null)
  const [participants, setParticipants] = useState([])
  const [timelineSnapshot, setTimelineSnapshot] = useState(null)
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resume')
  const [fixingRoles, setFixingRoles] = useState(false)
  const [fixRolesMessage, setFixRolesMessage] = useState(null)

  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      return
    }

    let cancelled = false

    let itemsTimeout
    const fetchMatch = async () => {
      try {
        loadItems()
          .then(() => {
            if (!cancelled) setItemsLoaded(true)
          })
          .catch(() => {
            if (!cancelled) setItemsLoaded(true)
          })
        itemsTimeout = setTimeout(() => {
          if (!cancelled) setItemsLoaded(true)
        }, 3000)

        const { data: matchData, error: matchError } = await fetchMatchById(matchId)

        if (cancelled) return
        if (matchError || !matchData) {
          setMatch(null)
          setParticipants([])
          setTimelineSnapshot(null)
          setLoading(false)
          return
        }

        setMatch(matchData)

        const [{ data: parts, error: partsError }, { data: timelineRow }] = await Promise.all([
          fetchParticipantsByMatch(matchId),
          fetchTimelineByMatch(matchId),
        ])

        if (!cancelled && !partsError) {
          const list = parts || []
          const roleOrder = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
          const sortParts = (a, b) => {
            const sideA = a.team_side === 'enemy' ? 1 : 0
            const sideB = b.team_side === 'enemy' ? 1 : 0
            if (sideA !== sideB) return sideA - sideB
            return roleOrder.indexOf(a.role || '') - roleOrder.indexOf(b.role || '')
          }
          setParticipants([...list].sort(sortParts))
        }
        if (!cancelled && timelineRow?.snapshot) {
          setTimelineSnapshot(timelineRow.snapshot)
        } else {
          setTimelineSnapshot(null)
        }
      } catch {
        if (!cancelled) setMatch(null)
      } finally {
        clearTimeout(itemsTimeout)
        if (!cancelled) setLoading(false)
      }
    }

    fetchMatch()
    return () => {
      cancelled = true
    }
  }, [matchId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400 mb-4">Match introuvable</p>
        <button
          onClick={() => navigate(fromPlayerId ? `/team/joueurs/${fromPlayerId}` : '/team/matchs')}
          className="text-accent-blue hover:underline"
        >
          {fromPlayerId ? 'Retour au joueur' : 'Retour aux matchs'}
        </button>
      </div>
    )
  }

  const ourTeam = participants.filter((p) => p.team_side === 'our' || !p.team_side)
  const enemyTeam = participants.filter((p) => p.team_side === 'enemy')
  const durationMin = match.game_duration ? Math.round(match.game_duration / 60) : null

  const refetchParticipants = async () => {
    const { data: parts, error } = await fetchParticipantsByMatch(matchId)
    if (error || !parts) return
    const roleOrder = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']
    const sortParts = (a, b) => {
      const sideA = a.team_side === 'enemy' ? 1 : 0
      const sideB = b.team_side === 'enemy' ? 1 : 0
      if (sideA !== sideB) return sideA - sideB
      return roleOrder.indexOf(a.role || '') - roleOrder.indexOf(b.role || '')
    }
    setParticipants([...parts].sort(sortParts))
  }

  const handleFixEnemyRoles = async () => {
    setFixingRoles(true)
    setFixRolesMessage(null)
    try {
      const updates = computeEnemyRoleFixes(enemyTeam)
      if (updates.length === 0) {
        setFixRolesMessage('Aucune correction nécessaire.')
        setFixingRoles(false)
        return
      }
      for (const u of updates) {
        await updateParticipantRole(u.id, u.role)
      }
      await refetchParticipants()
      setFixRolesMessage(`${updates.length} rôle(s) corrigé(s).`)
    } catch {
      setFixRolesMessage('Erreur lors de la correction.')
    } finally {
      setFixingRoles(false)
    }
  }

  // Agrégats par équipe (stats globales)
  const ourGold = ourTeam.reduce((s, p) => s + (p.gold_earned ?? 0), 0)
  const ourDamage = ourTeam.reduce((s, p) => s + (p.total_damage_dealt_to_champions ?? 0), 0)
  const ourCS = ourTeam.reduce((s, p) => s + (p.cs ?? 0), 0)
  const ourKills = ourTeam.reduce((s, p) => s + (p.kills ?? 0), 0)
  const ourDeaths = ourTeam.reduce((s, p) => s + (p.deaths ?? 0), 0)
  const ourAssists = ourTeam.reduce((s, p) => s + (p.assists ?? 0), 0)
  const ourVision = ourTeam.reduce((s, p) => s + (p.vision_score ?? 0), 0)
  const ourPinkWards = ourTeam.reduce((s, p) => s + (p.vision_wards_bought ?? 0), 0)
  const ourWardsPlaced = ourTeam.reduce((s, p) => s + (p.wards_placed ?? 0), 0)
  const ourWardsKilled = ourTeam.reduce((s, p) => s + (p.wards_killed ?? 0), 0)

  const enemyGold = enemyTeam.reduce((s, p) => s + (p.gold_earned ?? 0), 0)
  const enemyDamage = enemyTeam.reduce((s, p) => s + (p.total_damage_dealt_to_champions ?? 0), 0)
  const enemyCS = enemyTeam.reduce((s, p) => s + (p.cs ?? 0), 0)
  const enemyKills = enemyTeam.reduce((s, p) => s + (p.kills ?? 0), 0)
  const enemyDeaths = enemyTeam.reduce((s, p) => s + (p.deaths ?? 0), 0)
  const enemyAssists = enemyTeam.reduce((s, p) => s + (p.assists ?? 0), 0)
  const enemyVision = enemyTeam.reduce((s, p) => s + (p.vision_score ?? 0), 0)
  const enemyPinkWards = enemyTeam.reduce((s, p) => s + (p.vision_wards_bought ?? 0), 0)
  const enemyWardsPlaced = enemyTeam.reduce((s, p) => s + (p.wards_placed ?? 0), 0)
  const enemyWardsKilled = enemyTeam.reduce((s, p) => s + (p.wards_killed ?? 0), 0)

  const TIMELINE_MINUTES = [5, 10, 15, 20, 25]

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate(fromPlayerId ? `/team/joueurs/${fromPlayerId}` : '/team/matchs')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        {fromPlayerId ? 'Retour au joueur' : 'Retour aux matchs'}
      </button>

      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden mb-6">
        <div className="p-6 border-b border-dark-border">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-gray-500">Game #{match.game_id}</span>
            <span
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                match.our_win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {match.our_win ? 'Victoire' : 'Défaite'}
            </span>
            {durationMin != null && <span className="text-gray-400">{durationMin} min</span>}
            {match.game_mode && <span className="text-gray-500 text-sm">{match.game_mode}</span>}
            {match.game_creation && (
              <span className="text-gray-600 text-sm ml-auto">
                {new Date(match.game_creation).toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-dark-border bg-dark-bg/30">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent-blue border-b-2 border-accent-blue bg-dark-bg/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Contenu Résumé */}
        {activeTab === 'resume' && (
          <>
            <div className="p-4 border-b border-dark-border">
              <h3 className="font-display text-lg font-semibold text-green-400/90 mb-3">
                Notre équipe
              </h3>
              {ourTeam.length > 0 ? (
                <ParticipantTable participants={ourTeam} itemsLoaded={itemsLoaded} />
              ) : (
                <p className="text-gray-500 text-sm">Aucun participant (import ancien format).</p>
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="font-display text-lg font-semibold text-red-400/90">
                  Équipe adverse
                </h3>
                {enemyTeam.length > 0 && (
                  <button
                    type="button"
                    onClick={handleFixEnemyRoles}
                    disabled={fixingRoles}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue/50 disabled:opacity-50 text-gray-300"
                  >
                    <Wrench size={14} />
                    {fixingRoles ? 'Correction…' : 'Corriger les rôles'}
                  </button>
                )}
              </div>
              {fixRolesMessage && (
                <p
                  className={`text-sm mb-2 ${fixRolesMessage.startsWith('Erreur') ? 'text-red-400' : 'text-green-400'}`}
                >
                  {fixRolesMessage}
                </p>
              )}
              {enemyTeam.length > 0 ? (
                <ParticipantTable participants={enemyTeam} itemsLoaded={itemsLoaded} />
              ) : (
                <p className="text-gray-500 text-sm">
                  Équipe adverse non enregistrée. Réimportez le match pour inclure les adversaires.
                </p>
              )}
            </div>
          </>
        )}

        {/* Stats globales (response) : par joueur puis par équipe */}
        {activeTab === 'global' && (
          <div className="p-6 space-y-8">
            {/* 1) Stats par joueur */}
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">
                Stats globales — par joueur
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Toutes les stats disponibles par joueur sur la game (issues du fichier response).
              </p>

              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <p className="text-gray-400 text-xs mb-1">Notre équipe</p>
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
                        <th className="py-2 px-3">Champion</th>
                        <th className="py-2 px-3 text-center">Rôle</th>
                        <th className="py-2 px-3 text-center">K/D/A</th>
                        <th className="py-2 px-3 text-right">KDA</th>
                        <th className="py-2 px-3 text-right">% KP</th>
                        <th className="py-2 px-3 text-right">Dégâts</th>
                        <th className="py-2 px-3 text-right">% Dégâts</th>
                        <th className="py-2 px-3 text-right">Or</th>
                        <th className="py-2 px-3 text-right">% Or</th>
                        <th className="py-2 px-3 text-right">CS</th>
                        <th className="py-2 px-3 text-right">Vision</th>
                        <th className="py-2 px-3 text-right">Wards posés</th>
                        <th className="py-2 px-3 text-right">Wards détruits</th>
                        <th className="py-2 px-3 text-right">Pink wards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ourTeam.map((p) => {
                        const kills = p.kills ?? 0
                        const assists = p.assists ?? 0
                        const teamKills = ourKills || 0
                        const kp = teamKills > 0 ? ((kills + assists) * 100) / teamKills : null
                        const dmg = p.total_damage_dealt_to_champions ?? 0
                        const dmgShare = ourDamage > 0 ? (dmg * 100) / ourDamage : null
                        const gold = p.gold_earned ?? 0
                        const goldShare = ourGold > 0 ? (gold * 100) / ourGold : null
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-dark-border/50 hover:bg-dark-bg/30"
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getChampionImage(p.champion_name)}
                                  alt={getChampionDisplayName(p.champion_name) || p.champion_name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                                <div>
                                  <div className="font-medium">
                                    {getChampionDisplayName(p.champion_name) || p.champion_name}
                                  </div>
                                  {p.pseudo && (
                                    <div className="text-[11px] text-gray-500">{p.pseudo}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center text-gray-400">{p.role || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {kills}/{p.deaths}/{assists}
                            </td>
                            <td className="py-2 px-3 text-right">{p.kda ?? '—'}</td>
                            <td className="py-2 px-3 text-right">
                              {kp != null ? `${kp.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {dmg ? dmg.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {dmgShare != null ? `${dmgShare.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {gold ? gold.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {goldShare != null ? `${goldShare.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">{p.cs ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.vision_score ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.wards_placed ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.wards_killed ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.vision_wards_bought ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <p className="text-gray-400 text-xs mb-1">Équipe adverse</p>
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
                        <th className="py-2 px-3">Champion</th>
                        <th className="py-2 px-3 text-center">Rôle</th>
                        <th className="py-2 px-3 text-center">K/D/A</th>
                        <th className="py-2 px-3 text-right">KDA</th>
                        <th className="py-2 px-3 text-right">% KP</th>
                        <th className="py-2 px-3 text-right">Dégâts</th>
                        <th className="py-2 px-3 text-right">% Dégâts</th>
                        <th className="py-2 px-3 text-right">Or</th>
                        <th className="py-2 px-3 text-right">% Or</th>
                        <th className="py-2 px-3 text-right">CS</th>
                        <th className="py-2 px-3 text-right">Vision</th>
                        <th className="py-2 px-3 text-right">Wards posés</th>
                        <th className="py-2 px-3 text-right">Wards détruits</th>
                        <th className="py-2 px-3 text-right">Pink wards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enemyTeam.map((p) => {
                        const kills = p.kills ?? 0
                        const assists = p.assists ?? 0
                        const teamKills = enemyKills || 0
                        const kp = teamKills > 0 ? ((kills + assists) * 100) / teamKills : null
                        const dmg = p.total_damage_dealt_to_champions ?? 0
                        const dmgShare = enemyDamage > 0 ? (dmg * 100) / enemyDamage : null
                        const gold = p.gold_earned ?? 0
                        const goldShare = enemyGold > 0 ? (gold * 100) / enemyGold : null
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-dark-border/50 hover:bg-dark-bg/30"
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getChampionImage(p.champion_name)}
                                  alt={getChampionDisplayName(p.champion_name) || p.champion_name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                                <div>
                                  <div className="font-medium">
                                    {getChampionDisplayName(p.champion_name) || p.champion_name}
                                  </div>
                                  {p.pseudo && (
                                    <div className="text-[11px] text-gray-500">{p.pseudo}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center text-gray-400">{p.role || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              {kills}/{p.deaths}/{assists}
                            </td>
                            <td className="py-2 px-3 text-right">{p.kda ?? '—'}</td>
                            <td className="py-2 px-3 text-right">
                              {kp != null ? `${kp.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {dmg ? dmg.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {dmgShare != null ? `${dmgShare.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {gold ? gold.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {goldShare != null ? `${goldShare.toFixed(0)}%` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right">{p.cs ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.vision_score ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.wards_placed ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.wards_killed ?? '—'}</td>
                            <td className="py-2 px-3 text-right">{p.vision_wards_bought ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 2) Stats agrégées par équipe */}
            <div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">
                Stats globales — par équipe
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Totaux par équipe sur la game (somme des 5 joueurs).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-dark-border">
                      <th className="py-2 px-3">Équipe</th>
                      <th className="py-2 px-3 text-right">Or</th>
                      <th className="py-2 px-3 text-right">Dégâts</th>
                      <th className="py-2 px-3 text-right">CS</th>
                      <th className="py-2 px-3 text-right">Kills</th>
                      <th className="py-2 px-3 text-right">Morts</th>
                      <th className="py-2 px-3 text-right">Assists</th>
                      <th className="py-2 px-3 text-right">Vision</th>
                      <th className="py-2 px-3 text-right">Wards posés</th>
                      <th className="py-2 px-3 text-right">Wards détruits</th>
                      <th className="py-2 px-3 text-right">Pink wards</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-border/50">
                      <td className="py-2 px-3 text-green-400">Notre équipe</td>
                      <td className="py-2 px-3 text-right">{ourGold.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{ourDamage.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{ourCS}</td>
                      <td className="py-2 px-3 text-right">{ourKills}</td>
                      <td className="py-2 px-3 text-right">{ourDeaths}</td>
                      <td className="py-2 px-3 text-right">{ourAssists}</td>
                      <td className="py-2 px-3 text-right">{ourVision}</td>
                      <td className="py-2 px-3 text-right">{ourWardsPlaced}</td>
                      <td className="py-2 px-3 text-right">{ourWardsKilled}</td>
                      <td className="py-2 px-3 text-right">{ourPinkWards}</td>
                    </tr>
                    <tr className="border-b border-dark-border/50">
                      <td className="py-2 px-3 text-red-400">Équipe adverse</td>
                      <td className="py-2 px-3 text-right">{enemyGold.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{enemyDamage.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{enemyCS}</td>
                      <td className="py-2 px-3 text-right">{enemyKills}</td>
                      <td className="py-2 px-3 text-right">{enemyDeaths}</td>
                      <td className="py-2 px-3 text-right">{enemyAssists}</td>
                      <td className="py-2 px-3 text-right">{enemyVision}</td>
                      <td className="py-2 px-3 text-right">{enemyWardsPlaced}</td>
                      <td className="py-2 px-3 text-right">{enemyWardsKilled}</td>
                      <td className="py-2 px-3 text-right">{enemyPinkWards}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-dark-bg/50 rounded-lg text-gray-400 text-sm">
                <strong>Avantage final :</strong> Or {ourGold >= enemyGold ? '+' : ''}
                {(ourGold - enemyGold).toLocaleString()} · Dégâts{' '}
                {ourDamage >= enemyDamage ? '+' : ''}
                {(ourDamage - enemyDamage).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Stats timeline : 1) Avantages par joueur  2) Avantage global équipe */}
        {activeTab === 'timeline' && (
          <div className="p-6 space-y-8">
            <h3 className="font-display text-lg font-semibold text-white">Stats timeline</h3>
            {timelineSnapshot && Object.keys(timelineSnapshot).length > 0 ? (
              <>
                {/* Partie 1 : Avantages par joueur vs vis-à-vis (or, xp, cs = sbires + monstres à 5/10/15/20/25 min) */}
                <div>
                  <h4 className="font-display font-semibold text-green-400/90 mb-2">
                    Avantages par joueur
                  </h4>
                  <p className="text-gray-500 text-sm mb-3">
                    Avantage vs son vis-à-vis (1 vs 6, 2 vs 7, …). + = vert, − = rouge. CS = sbires
                    + monstres (jungle incluse).
                  </p>
                  {timelineSnapshot[TIMELINE_MINUTES[0]]?.participants ? (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <p className="text-gray-400 text-xs mb-1">
                          Notre équipe (participants 1-5)
                        </p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-dark-border">
                              <th
                                rowSpan={2}
                                className="py-2 px-2 sticky left-0 bg-dark-card align-bottom"
                              >
                                Joueur
                              </th>
                              {TIMELINE_MINUTES.map((m) => (
                                <th
                                  key={m}
                                  colSpan={3}
                                  className="py-1 px-1 text-center text-xs border-l border-dark-border/70 bg-dark-bg/50"
                                >
                                  {m === 5 ? '0–5 min' : `${m - 5}–${m} min`}
                                </th>
                              ))}
                            </tr>
                            <tr className="text-gray-400 border-b border-dark-border">
                              {TIMELINE_MINUTES.flatMap((m) => [
                                <th
                                  key={`${m}-or`}
                                  className="py-1 px-0.5 text-right text-xs border-l border-dark-border/50 w-14"
                                >
                                  Or
                                </th>,
                                <th key={`${m}-xp`} className="py-1 px-0.5 text-right text-xs w-14">
                                  XP
                                </th>,
                                <th key={`${m}-cs`} className="py-1 px-0.5 text-right text-xs w-12">
                                  CS
                                </th>,
                              ])}
                            </tr>
                          </thead>
                          <tbody>
                            {ourTeam.map((part, i) => {
                              const enemyPart = enemyTeam[i]
                              const ourPid = part?.participant_id ?? i + 1
                              const enemyPid = enemyPart?.participant_id ?? 6 + i
                              const getCs = (s) =>
                                (s?.minions ?? 0) + (s?.jungle ?? 0) || (s?.cs ?? 0)
                              return (
                                <tr
                                  key={part?.id ?? ourPid}
                                  className="border-b border-dark-border/50"
                                >
                                  <td className="py-2 px-2 sticky left-0 bg-dark-card">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={getChampionImage(part?.champion_name)}
                                        alt={
                                          getChampionDisplayName(part?.champion_name) ||
                                          part?.champion_name ||
                                          ''
                                        }
                                        className="w-8 h-8 rounded object-cover"
                                      />
                                      <div>
                                        <div className="font-medium">
                                          {getChampionDisplayName(part?.champion_name) ||
                                            part?.champion_name ||
                                            `Participant ${ourPid}`}
                                        </div>
                                        {part?.pseudo && (
                                          <div className="text-xs text-gray-500">{part.pseudo}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  {TIMELINE_MINUTES.map((m) => {
                                    const snap = timelineSnapshot[String(m)]?.participants
                                    const our = snap?.[String(ourPid)]
                                    const enemy = snap?.[String(enemyPid)]
                                    const goldDiff = (our?.gold ?? 0) - (enemy?.gold ?? 0)
                                    const xpDiff = (our?.xp ?? 0) - (enemy?.xp ?? 0)
                                    const csDiff = getCs(our) - getCs(enemy)
                                    return (
                                      <Fragment key={m}>
                                        <td
                                          className={`py-2 px-0.5 text-right border-l border-dark-border/50 ${goldDiff > 0 ? 'text-green-400' : goldDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {goldDiff >= 0 ? '+' : ''}
                                          {goldDiff.toLocaleString()}
                                        </td>
                                        <td
                                          className={`py-2 px-0.5 text-right ${xpDiff > 0 ? 'text-green-400' : xpDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {xpDiff >= 0 ? '+' : ''}
                                          {xpDiff.toLocaleString()}
                                        </td>
                                        <td
                                          className={`py-2 px-0.5 text-right ${csDiff > 0 ? 'text-green-400' : csDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {csDiff >= 0 ? '+' : ''}
                                          {csDiff}
                                        </td>
                                      </Fragment>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="overflow-x-auto">
                        <p className="text-gray-400 text-xs mb-1">
                          Équipe adverse (participants 6-10)
                        </p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-dark-border">
                              <th
                                rowSpan={2}
                                className="py-2 px-2 sticky left-0 bg-dark-card align-bottom"
                              >
                                Joueur
                              </th>
                              {TIMELINE_MINUTES.map((m) => (
                                <th
                                  key={m}
                                  colSpan={3}
                                  className="py-1 px-1 text-center text-xs border-l border-dark-border/70 bg-dark-bg/50"
                                >
                                  {m === 5 ? '0–5 min' : `${m - 5}–${m} min`}
                                </th>
                              ))}
                            </tr>
                            <tr className="text-gray-400 border-b border-dark-border">
                              {TIMELINE_MINUTES.flatMap((m) => [
                                <th
                                  key={`${m}-or`}
                                  className="py-1 px-0.5 text-right text-xs border-l border-dark-border/50 w-14"
                                >
                                  Or
                                </th>,
                                <th key={`${m}-xp`} className="py-1 px-0.5 text-right text-xs w-14">
                                  XP
                                </th>,
                                <th key={`${m}-cs`} className="py-1 px-0.5 text-right text-xs w-12">
                                  CS
                                </th>,
                              ])}
                            </tr>
                          </thead>
                          <tbody>
                            {enemyTeam.map((part, i) => {
                              const ourPart = ourTeam[i]
                              const enemyPid = part?.participant_id ?? 6 + i
                              const ourPid = ourPart?.participant_id ?? i + 1
                              const getCs = (s) =>
                                (s?.minions ?? 0) + (s?.jungle ?? 0) || (s?.cs ?? 0)
                              return (
                                <tr
                                  key={part?.id ?? enemyPid}
                                  className="border-b border-dark-border/50"
                                >
                                  <td className="py-2 px-2 sticky left-0 bg-dark-card">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={getChampionImage(part?.champion_name)}
                                        alt={
                                          getChampionDisplayName(part?.champion_name) ||
                                          part?.champion_name ||
                                          ''
                                        }
                                        className="w-8 h-8 rounded object-cover"
                                      />
                                      <div>
                                        <div className="font-medium">
                                          {getChampionDisplayName(part?.champion_name) ||
                                            part?.champion_name ||
                                            `Participant ${enemyPid}`}
                                        </div>
                                        {part?.pseudo && (
                                          <div className="text-xs text-gray-500">{part.pseudo}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  {TIMELINE_MINUTES.map((m) => {
                                    const snap = timelineSnapshot[String(m)]?.participants
                                    const enemy = snap?.[String(enemyPid)]
                                    const our = snap?.[String(ourPid)]
                                    const goldDiff = (enemy?.gold ?? 0) - (our?.gold ?? 0)
                                    const xpDiff = (enemy?.xp ?? 0) - (our?.xp ?? 0)
                                    const csDiff = getCs(enemy) - getCs(our)
                                    return (
                                      <Fragment key={m}>
                                        <td
                                          className={`py-2 px-0.5 text-right border-l border-dark-border/50 ${goldDiff > 0 ? 'text-green-400' : goldDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {goldDiff >= 0 ? '+' : ''}
                                          {goldDiff.toLocaleString()}
                                        </td>
                                        <td
                                          className={`py-2 px-0.5 text-right ${xpDiff > 0 ? 'text-green-400' : xpDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {xpDiff >= 0 ? '+' : ''}
                                          {xpDiff.toLocaleString()}
                                        </td>
                                        <td
                                          className={`py-2 px-0.5 text-right ${csDiff > 0 ? 'text-green-400' : csDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                        >
                                          {csDiff >= 0 ? '+' : ''}
                                          {csDiff}
                                        </td>
                                      </Fragment>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Réimportez la timeline pour ce match pour afficher les stats par joueur
                      (format mis à jour).
                    </p>
                  )}
                </div>

                {/* Partie 2 : Avantage global équipe (même principe que Stats globales) */}
                <div>
                  <h4 className="font-display font-semibold text-white mb-2">
                    Avantage global équipe
                  </h4>
                  <p className="text-gray-500 text-sm mb-3">
                    Totaux or / XP par équipe à 5, 10, 15, 20, 25 minutes.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-dark-border">
                          <th className="py-2 px-3">Min</th>
                          <th className="py-2 px-3 text-right">Or équipe 100</th>
                          <th className="py-2 px-3 text-right">Or équipe 200</th>
                          <th className="py-2 px-3 text-right">Avantage or</th>
                          <th className="py-2 px-3 text-right">XP équipe 100</th>
                          <th className="py-2 px-3 text-right">XP équipe 200</th>
                          <th className="py-2 px-3 text-right">Avantage XP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIMELINE_MINUTES.filter((m) => timelineSnapshot[String(m)]).map((min) => {
                          const s = timelineSnapshot[String(min)]
                          const goldDiff = (s.gold_100 ?? 0) - (s.gold_200 ?? 0)
                          const xpDiff = (s.xp_100 ?? 0) - (s.xp_200 ?? 0)
                          return (
                            <tr key={min} className="border-b border-dark-border/50">
                              <td className="py-2 px-3 font-medium">{min} min</td>
                              <td className="py-2 px-3 text-right">
                                {(s.gold_100 ?? 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {(s.gold_200 ?? 0).toLocaleString()}
                              </td>
                              <td
                                className={`py-2 px-3 text-right ${goldDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {goldDiff >= 0 ? '+' : ''}
                                {goldDiff.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {(s.xp_100 ?? 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {(s.xp_200 ?? 0).toLocaleString()}
                              </td>
                              <td
                                className={`py-2 px-3 text-right ${xpDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {xpDiff >= 0 ? '+' : ''}
                                {xpDiff.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 bg-dark-bg/50 rounded-lg border border-dark-border text-center text-gray-400">
                <p className="mb-2">Aucune timeline enregistrée pour ce match.</p>
                <p className="text-sm">
                  Importez un fichier timeline (ex. timeline3.txt) et associez-le à ce match depuis
                  la page Import pour afficher l’avantage or/XP à 5, 10, 15, 20, 25 min.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timeline global (placeholder) */}
        {activeTab === 'timeline-global' && (
          <div className="p-6">
            <h3 className="font-display text-lg font-semibold text-white mb-4">Timeline global</h3>
            <div className="p-8 bg-dark-bg/50 rounded-lg border border-dark-border text-center text-gray-500">
              À venir — contenu complexe, à définir ensuite.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
