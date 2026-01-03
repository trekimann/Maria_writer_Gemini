import React, { useEffect, useRef } from 'react';
import { DataSet, Network } from 'vis-network/standalone';
import { useStore } from '../../context/StoreContext';
import { v4 as uuidv4 } from 'uuid';
import { formatDateTimeOrEmpty } from '../../utils/date';
import styles from './TimelineView.module.scss';

export const TimelineView: React.FC = () => {
  const { state, dispatch } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      console.warn("TimelineView: Container ref is missing");
      return;
    }

    console.log("TimelineView: Mounting. Container ID:", containerRef.current.id);
    
    // Clear container just in case
    containerRef.current.innerHTML = '';

    const eventIds = new Set(state.events.map(e => e.id));

    const nodeData = state.events.map(e => ({
      id: e.id,
      label: e.title + (e.date ? `\n(${formatDateTimeOrEmpty(e.date)})` : ''),
      shape: 'box',
      color: { background: '#fffbeb', border: '#d97706' },
      font: { multi: true, size: 12 }
    }));

    // Add small avatar nodes for tagged characters under each event node.
    // Implemented as separate nodes because vis-network draws nodes on a canvas.
    const avatarNodes: any[] = [];
    const avatarEdges: any[] = [];

    for (const evt of state.events) {
      const tagged = (evt.characters || [])
        .map(charId => state.characters.find(c => c.id === charId))
        .filter((c): c is NonNullable<typeof c> => !!c);

      for (const char of tagged) {
        const avatarNodeId = `${evt.id}::tag::${char.id}`;

        avatarNodes.push({
          id: avatarNodeId,
          label: char.picture ? '' : (char.name?.charAt(0)?.toUpperCase() ?? ''),
          shape: char.picture ? 'circularImage' : 'circle',
          image: char.picture || undefined,
          size: 16,
          borderWidth: 1,
          color: char.picture
            ? { border: '#9ca3af' }
            : { background: '#e5e7eb', border: '#9ca3af' },
          font: { size: 10 },
          physics: false,
          selectable: false,
        });

        // Hidden edge so the avatar is still associated with the event node.
        // Physics disabled so it doesn't affect layout.
        avatarEdges.push({
          id: `${evt.id}::tag-edge::${char.id}`,
          from: evt.id,
          to: avatarNodeId,
          hidden: true,
          physics: false,
        });
      }
    }

    nodeData.push(...avatarNodes);

    console.log("TimelineView: Creating Network with nodes:", nodeData.length);
    console.log("TimelineView: Container client rect:", containerRef.current.getBoundingClientRect());

    const nodes = new DataSet(nodeData);
    const edges = new DataSet([...(state.timeline.edges as any), ...avatarEdges] as any);

    const data = { nodes, edges };
    const options = {
      height: '100%',
      width: '100%',
      physics: {
        enabled: true,
        barnesHut: { gravitationalConstant: -2000 }
      },
      manipulation: {
        enabled: true,
        addNode: (_: any, callback: any) => {
          dispatch({ type: 'OPEN_MODAL', payload: { type: 'event' } });
          callback(null);
        },
        addEdge: (edgeData: any, callback: any) => {
          if (edgeData.from === edgeData.to) {
            callback(null);
            return;
          }
          const newEdge = { from: edgeData.from, to: edgeData.to, id: uuidv4() };
          dispatch({ type: 'ADD_TIMELINE_EDGE', payload: newEdge });
          callback(newEdge);
        },
        deleteEdge: (edgeData: any, callback: any) => {
          const edgeId = edgeData.edges[0];
          dispatch({ type: 'REMOVE_TIMELINE_EDGE', payload: edgeId });
          callback(edgeData);
        },
        deleteNode: (_: any, callback: any) => {
          alert("Please delete events from the Event List to remove them safely.");
          callback(null);
        }
      },
      interaction: { hover: true }
    };

    try {
      // Cast to any to avoid TS issues with standalone bundle types
      networkRef.current = new Network(containerRef.current, data as any, options as any);
      console.log("TimelineView: Network initialized successfully");

      const layoutTaggedAvatars = (targetEventIds?: string[]) => {
        if (!networkRef.current) return;

        const positions = networkRef.current.getPositions();
        const updates: any[] = [];

        const AVATARS_PER_ROW = 4;
        const DX = 34; // spacing in canvas coordinates
        const DY = 34;
        const BASE_Y = 56; // distance below the event node center

        for (const evt of state.events) {
          if (targetEventIds && !targetEventIds.includes(evt.id)) continue;
          const eventPos = (positions as any)[evt.id];
          if (!eventPos) continue;

          const tagged = (evt.characters || [])
            .map(charId => state.characters.find(c => c.id === charId))
            .filter((c): c is NonNullable<typeof c> => !!c);

          tagged.forEach((char, idx) => {
            const avatarNodeId = `${evt.id}::tag::${char.id}`;
            const col = idx % AVATARS_PER_ROW;
            const row = Math.floor(idx / AVATARS_PER_ROW);

            // Center a 4-wide row under the node
            const xOffset = (col - (AVATARS_PER_ROW - 1) / 2) * DX;
            const yOffset = BASE_Y + row * DY;

            updates.push({
              id: avatarNodeId,
              x: eventPos.x + xOffset,
              y: eventPos.y + yOffset,
              fixed: { x: true, y: true },
            });
          });
        }

        if (updates.length > 0) {
          nodes.update(updates);
          networkRef.current.redraw();
        }
      };

      // Layout the avatar nodes once physics has stabilized.
      networkRef.current.on('stabilized' as any, () => {
        console.log('TimelineView: stabilized -> laying out tagged avatars');
        layoutTaggedAvatars();
      });

      // Keep avatars under their event when the event node is dragged.
      networkRef.current.on('dragEnd' as any, (params: any) => {
        const dragged = (params?.nodes || []).filter((id: string) => eventIds.has(id));
        if (dragged.length === 0) return;
        layoutTaggedAvatars(dragged);
      });

      // After the first draw, log where the nodes actually are and force them into view.
      networkRef.current.once?.('afterDrawing' as any, () => {
        if (!networkRef.current) return;

        try {
          const canvas = containerRef.current?.querySelector('canvas');
          console.log('TimelineView: Canvas info:', {
            found: !!canvas,
            widthAttr: canvas?.getAttribute('width'),
            heightAttr: canvas?.getAttribute('height'),
            clientWidth: canvas ? (canvas as HTMLCanvasElement).clientWidth : undefined,
            clientHeight: canvas ? (canvas as HTMLCanvasElement).clientHeight : undefined,
          });

          const positions = networkRef.current.getPositions();
          console.log('TimelineView: Node positions:', positions);
          console.log('TimelineView: View position:', networkRef.current.getViewPosition());
          console.log('TimelineView: Scale:', networkRef.current.getScale());

          // Force everything into view with no animation (prevents off-screen placement).
          networkRef.current.fit({ animation: false } as any);
          networkRef.current.moveTo({
            position: networkRef.current.getViewPosition(),
            scale: Math.min(1, networkRef.current.getScale())
          } as any);

          console.log('TimelineView: fit/moveTo applied');
        } catch (e) {
          console.error('TimelineView: afterDrawing diagnostics failed', e);
        }
      });

      // If the container is flex-resizing, auto-resize can trigger weird feedback; forcing a redraw helps.
      setTimeout(() => {
        try {
          networkRef.current?.redraw();
          networkRef.current?.fit({ animation: false } as any);
          console.log('TimelineView: redraw+fit (post-timeout)');
        } catch (e) {
          console.error('TimelineView: redraw+fit failed', e);
        }
      }, 0);
      
      networkRef.current.on("doubleClick", (params: any) => {
        if (params.nodes.length > 0) {
          const eventId = params.nodes[0];
          if (typeof eventId === 'string' && eventId.includes('::tag::')) {
            return;
          }
          dispatch({ type: 'OPEN_MODAL', payload: { type: 'event', itemId: eventId } });
        }
      });
    } catch (err) {
      console.error("TimelineView: Failed to initialize network", err);
    }

    return () => {
      if (networkRef.current) {
        console.log("TimelineView: Destroying network");
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [state.events, state.timeline.edges, dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        Double-click an event to edit. Drag handles to connect events.
      </div>
      <div id="timeline-vis-network" ref={containerRef} className={styles.network} />
    </div>
  );
};
