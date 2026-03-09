import React from 'react';
import type { CreatorConnection } from '../../services/authService';
import styles from './CreatorConnectionsGraph.module.scss';

interface CreatorConnectionsGraphProps {
  userLabel: string;
  color: string;
  connections: CreatorConnection[];
}

const KIND_META: Record<CreatorConnection['kind'], { label: string; color: string }> = {
  follow: { label: 'Following', color: '#6366f1' },
  'private-read': { label: 'Private read', color: '#0f766e' },
  collaborator: { label: 'Collaborator', color: '#9333ea' },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const CreatorConnectionsGraph: React.FC<CreatorConnectionsGraphProps> = ({ userLabel, color, connections }) => {
  if (connections.length === 0) {
    return <div className={styles.empty}>No creator relationships yet.</div>;
  }

  const centerX = 180;
  const centerY = 130;
  const radius = 90;

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 360 260" className={styles.svg} role="img" aria-label="Creator relationships graph">
        {connections.map((connection, index) => {
          const angle = (-Math.PI / 2) + ((Math.PI * 2) / connections.length) * index;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          const meta = KIND_META[connection.kind];

          return (
            <g key={connection.id || `${connection.kind}-${connection.name}-${index}`}>
              <line x1={centerX} y1={centerY} x2={x} y2={y} stroke={meta.color} strokeWidth="2" opacity="0.7" />
              <circle cx={x} cy={y} r="28" fill="white" stroke={meta.color} strokeWidth="3" />
              <text x={x} y={y + 4} textAnchor="middle" className={styles.nodeText}>{initials(connection.name)}</text>
              <text x={x} y={y + 46} textAnchor="middle" className={styles.label}>{connection.name}</text>
              <text x={x} y={y + 60} textAnchor="middle" className={styles.subLabel}>{meta.label}</text>
            </g>
          );
        })}

        <circle cx={centerX} cy={centerY} r="34" fill="white" stroke={color} strokeWidth="4" />
        <text x={centerX} y={centerY + 4} textAnchor="middle" className={styles.centerText}>{initials(userLabel)}</text>
        <text x={centerX} y={centerY + 54} textAnchor="middle" className={styles.label}>{userLabel}</text>
      </svg>

      <div className={styles.legend}>
        {Object.values(KIND_META).map((meta) => (
          <div key={meta.label} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
