import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-network/standalone';
import { useStore } from '../../context/StoreContext';
import { RelationshipType } from '../../types';
import { Users } from 'lucide-react';
import styles from './RelationshipGraph.module.scss';

interface RelationshipGraphProps {
  onNodeClick?: (characterId: string) => void;
  onEdgeClick?: (relationshipId: string) => void;
}

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  'family': '#8B4513',
  'parent-child': '#4169E1',
  'sibling': '#20B2AA',
  'spouse': '#DC143C',
  'romantic': '#FF1493',
  'friend': '#FFD700',
  'colleague': '#4682B4',
  'mentor-student': '#9370DB',
  'rival': '#FF4500',
  'enemy': '#8B0000',
  'acquaintance': '#A9A9A9',
  'other': '#808080',
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ onNodeClick, onEdgeClick }) => {
  const { state } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create nodes from characters
    const nodes = new DataSet(
      state.characters.map(char => ({
        id: char.id,
        label: char.name,
        shape: char.picture ? 'circularImage' : 'dot',
        image: char.picture || undefined,
        title: `${char.name}${char.description ? '\n' + char.description : ''}`,
        font: {
          size: 14,
          face: 'Arial',
        },
        color: {
          border: '#2B7CE9',
          background: '#97C2FC',
        },
        borderWidth: 2,
        size: 25,
      }))
    );

    // Create edges from relationships
    const edges = new DataSet(
      state.relationships.flatMap(rel => {
        // For relationships with more than 2 characters, create edges between all pairs
        const characterIds = rel.characterIds;
        const edgeList = [];

        if (characterIds.length === 2) {
          // Simple 1-to-1 relationship
          edgeList.push({
            id: rel.id,
            from: characterIds[0],
            to: characterIds[1],
            label: rel.type.replace('-', ' '),
            title: `${rel.type}${rel.description ? '\n' + rel.description : ''}`,
            color: {
              color: RELATIONSHIP_COLORS[rel.type],
              highlight: RELATIONSHIP_COLORS[rel.type],
            },
            width: 2,
            arrows: rel.type === 'parent-child' || rel.type === 'mentor-student' ? 'to' : undefined,
          });
        } else if (characterIds.length > 2) {
          // Group relationship - create a mesh of connections
          for (let i = 0; i < characterIds.length; i++) {
            for (let j = i + 1; j < characterIds.length; j++) {
              edgeList.push({
                id: `${rel.id}_${i}_${j}`,
                from: characterIds[i],
                to: characterIds[j],
                label: rel.type.replace('-', ' '),
                title: `${rel.type}${rel.description ? '\n' + rel.description : ''}`,
                color: {
                  color: RELATIONSHIP_COLORS[rel.type],
                  highlight: RELATIONSHIP_COLORS[rel.type],
                },
                width: 2,
                dashes: true, // Use dashed lines for group relationships
              });
            }
          }
        }

        return edgeList;
      })
    );

    const data = { nodes, edges };

    const options = {
      physics: {
        enabled: true,
        stabilization: {
          iterations: 200,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true,
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
        font: {
          size: 12,
          align: 'middle',
        },
      },
      nodes: {
        shape: 'dot',
        size: 25,
      },
    };

    // Create network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Add event listeners
    network.on('click', (params) => {
      if (params.nodes.length > 0 && onNodeClick) {
        onNodeClick(params.nodes[0] as string);
      } else if (params.edges.length > 0 && onEdgeClick) {
        const edgeId = params.edges[0] as string;
        // Find the original relationship ID (might be a compound ID for group relationships)
        const relationship = state.relationships.find(r => 
          r.id === edgeId || edgeId.startsWith(r.id + '_')
        );
        if (relationship) {
          onEdgeClick(relationship.id);
        }
      }
    });

    // Cleanup
    return () => {
      network.destroy();
    };
  }, [state.characters, state.relationships, onNodeClick, onEdgeClick]);

  const handleFitView = () => {
    networkRef.current?.fit({
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad',
      },
    });
  };

  const handleTogglePhysics = () => {
    if (networkRef.current) {
      // Toggle physics by setting new options
      const currentOptions = (networkRef.current as any).physics?.options?.enabled;
      networkRef.current.setOptions({ physics: { enabled: !currentOptions } });
    }
  };

  if (state.characters.length === 0) {
    return (
      <div className={styles.graphContainer}>
        <div className={styles.emptyState}>
          <Users size={64} />
          <p>No characters to display. Add some characters to see relationships.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.graphContainer}>
      <div ref={containerRef} className={styles.network} />
      
      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={handleFitView} title="Fit to view">
          Fit View
        </button>
        <button className={styles.controlButton} onClick={handleTogglePhysics} title="Toggle physics">
          Toggle Physics
        </button>
        <button className={styles.controlButton} onClick={() => setShowLegend(!showLegend)} title="Toggle legend">
          Legend
        </button>
      </div>

      {showLegend && (
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Relationship Types</div>
          {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
            <div key={type} className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: color }} />
              <span>{type.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
