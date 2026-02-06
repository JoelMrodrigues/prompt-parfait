import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { getChampionImage } from '../../lib/championImages';

const COLUMNS = [
  { key: 'champion', label: 'CHAMPION', align: 'left', sortable: true },
  { key: 'picks', label: 'PICKS', align: 'center', sortable: true },
  { key: 'bans', label: 'BANS', align: 'center', sortable: true },
  { key: 'prioScore', label: 'PRIOSCORE', align: 'center', sortable: true },
  { key: 'wins', label: 'WINS', align: 'center', sortable: true },
  { key: 'losses', label: 'LOSSES', align: 'center', sortable: true },
  { key: 'winrate', label: 'WINRATE', align: 'center', sortable: true },
  { key: 'kda', label: 'KDA', align: 'center', sortable: true },
  { key: 'gt', label: 'GT', align: 'center', sortable: true },
  { key: 'csm', label: 'CSM', align: 'center', sortable: true },
  { key: 'dpm', label: 'DPM', align: 'center', sortable: true },
  { key: 'gpm', label: 'GPM', align: 'center', sortable: true },
  { key: 'csd15', label: 'CSD@15', align: 'center', sortable: true },
  { key: 'gd15', label: 'GD@15', align: 'center', sortable: true },
];

export const ChampionStatsTable = ({ data, loading, filters }) => {
  const [sortColumn, setSortColumn] = useState('picks');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
  };

  // Trier les données
  const sortedData = [...(data || [])].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue mx-auto mb-4"></div>
        <p className="text-gray-400">Chargement des statistiques...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="font-display text-2xl font-bold mb-2">Aucune donnée</h3>
        <p className="text-gray-400">Aucune statistique ne correspond aux filtres sélectionnés.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          {/* Header */}
          <thead>
            <tr className="bg-[#4A6B7C]">
              {COLUMNS.map(column => (
                <th
                  key={column.key}
                  className={`px-4 py-4 text-xs font-semibold text-white uppercase tracking-wider ${
                    column.align === 'left' ? 'text-left' : 'text-center'
                  } ${column.sortable ? 'cursor-pointer hover:bg-[#5A7B8C] transition-colors' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={`flex items-center gap-1 ${column.align === 'left' ? 'justify-start' : 'justify-center'}`}>
                    <span>{column.label}</span>
                    {column.sortable && sortColumn === column.key && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={row.champion}
                className={`border-b border-dark-border hover:bg-dark-bg/50 transition-colors ${
                  index % 2 === 0 ? 'bg-[#2C3E50]' : 'bg-[#34495E]'
                }`}
              >
                {/* Champion */}
                <td className="px-4 py-4 text-left align-middle">
                  <Link
                    to={`/stats/champion/${row.champion}?season=${filters?.season || 'S16'}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <img
                      src={getChampionImage(row.champion)}
                      alt={row.champion}
                      className="w-12 h-12 rounded border border-dark-border object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-white hover:text-accent-blue transition-colors">{row.champion}</span>
                  </Link>
                </td>

                {/* Picks */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.picks}</td>

                {/* Bans */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.bans}</td>

                {/* Prioscore */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.prioScore}%</td>

                {/* Wins */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.wins}</td>

                {/* Losses */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.losses}</td>

                {/* Winrate */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.winrate.toFixed(0)}%</td>

                {/* KDA */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.kda.toFixed(1)}</td>

                {/* GT */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.gt}</td>

                {/* CSM */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.csm.toFixed(1)}</td>

                {/* DPM */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.dpm}</td>

                {/* GPM */}
                <td className="px-4 py-4 text-center align-middle text-white">{row.gpm}</td>

                {/* CSD@15 */}
                <td className="px-4 py-4 text-center align-middle text-white">
                  <span className={row.csd15 > 0 ? 'text-green-400' : row.csd15 < 0 ? 'text-red-400' : ''}>
                    {row.csd15.toFixed(1)}
                  </span>
                </td>

                {/* GD@15 */}
                <td className="px-4 py-4 text-center align-middle text-white">
                  <span className={row.gd15 > 0 ? 'text-green-400' : row.gd15 < 0 ? 'text-red-400' : ''}>
                    {row.gd15}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-[#4A6B7C] px-4 py-3 text-sm text-white text-center">
        {sortedData.length} champion{sortedData.length > 1 ? 's' : ''} affiché{sortedData.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};
