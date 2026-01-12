import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Sortable from 'sortablejs';
import { useStore } from '../../context/StoreContext';
import { HelpButton } from '../atoms/HelpButton';
import { parseDDMMYYYYHHMMSS } from '../../utils/date';
import styles from './TimelineView.module.scss';

interface ParsedEvent {
  id: string;
  title: string;
  date?: string;
  description?: string;
  characters?: string[];
  startDate: Date | null;
}

const parseDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  
  // First try the app's standard dd/mm/yyyy format
  const parsed = parseDDMMYYYYHHMMSS(dateStr);
  if (parsed) return parsed;
  
  // Fallback to native Date parsing for ISO formats
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (str: string): Date | null => {
  if (!str) return null;
  // Handle years outside normal range (e.g., 1850, 2200)
  const parts = str.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return null;
};

export const TimelineView: React.FC = () => {
  const { state, dispatch } = useStore();
  const [zoom, setZoom] = useState(1);
  const [manualStartDate, setManualStartDate] = useState<string>('');
  const [manualEndDate, setManualEndDate] = useState<string>('');
  const [useManualRange, setUseManualRange] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lanesContainerRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });

  // DEBUG: Log raw events from state
  console.log('[Timeline] Raw events from state:', state.events);
  console.log('[Timeline] Events count:', state.events.length);

  // Parse events and sort by date
  const parsedEvents = useMemo((): ParsedEvent[] => {
    const result = state.events
      .map(e => {
        const parsed = parseDate(e.date);
        console.log(`[Timeline] Event "${e.title}" date="${e.date}" parsed=`, parsed);
        return {
          ...e,
          startDate: parsed,
        };
      })
      .filter(e => e.startDate !== null)
      .sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0));
    
    console.log('[Timeline] Parsed events (with valid dates):', result);
    return result;
  }, [state.events]);

  // Events without dates
  const undatedEvents = useMemo(() => {
    const result = state.events.filter(e => !e.date);
    console.log('[Timeline] Undated events:', result);
    return result;
  }, [state.events]);

  // Calculate auto timeline bounds from events
  const autoBounds = useMemo(() => {
    if (parsedEvents.length === 0) {
      const now = new Date();
      console.log('[Timeline] No parsed events, using current year bounds');
      return { 
        minDate: new Date(now.getFullYear(), 0, 1), 
        maxDate: new Date(now.getFullYear(), 11, 31),
        totalDays: 365
      };
    }

    const dates = parsedEvents
      .map(e => e.startDate)
      .filter((d): d is Date => d !== null);

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding (10% on each side, minimum 30 days)
    const range = max.getTime() - min.getTime();
    const padding = Math.max(range * 0.1, 30 * 24 * 60 * 60 * 1000);
    
    const paddedMin = new Date(min.getTime() - padding);
    const paddedMax = new Date(max.getTime() + padding);
    
    const days = Math.ceil((paddedMax.getTime() - paddedMin.getTime()) / (24 * 60 * 60 * 1000));

    console.log('[Timeline] Auto bounds:', { min: paddedMin, max: paddedMax, days });
    return { minDate: paddedMin, maxDate: paddedMax, totalDays: Math.max(days, 30) };
  }, [parsedEvents]);

  // Use manual range if set, otherwise auto
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (useManualRange && manualStartDate && manualEndDate) {
      const start = parseInputDate(manualStartDate);
      const end = parseInputDate(manualEndDate);
      if (start && end && end > start) {
        const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        console.log('[Timeline] Using manual range:', { start, end, days });
        return { minDate: start, maxDate: end, totalDays: Math.max(days, 1) };
      }
    }
    console.log('[Timeline] Using auto bounds:', autoBounds);
    return autoBounds;
  }, [useManualRange, manualStartDate, manualEndDate, autoBounds]);

  // Auto-fit to events
  const handleFitToEvents = () => {
    setUseManualRange(false);
    setManualStartDate('');
    setManualEndDate('');
    setZoom(1);
  };

  // Apply manual date range
  const handleApplyRange = () => {
    if (manualStartDate && manualEndDate) {
      const start = parseInputDate(manualStartDate);
      const end = parseInputDate(manualEndDate);
      if (start && end && end > start) {
        setUseManualRange(true);
      } else {
        alert('Please enter valid dates with end date after start date.');
      }
    }
  };

  // Quick range presets
  const handleQuickRange = (yearsBack: number, yearsForward: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear() + yearsBack, 0, 1);
    const end = new Date(now.getFullYear() + yearsForward, 11, 31);
    setManualStartDate(formatDateForInput(start));
    setManualEndDate(formatDateForInput(end));
    setUseManualRange(true);
  };

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers: { date: Date; label: string; position: number; isYear: boolean }[] = [];
    const current = new Date(minDate);
    
    // Determine appropriate interval based on total days and zoom
    const effectiveDays = totalDays / zoom;
    let interval: 'day' | 'week' | 'month' | 'year' | 'decade' = 'month';
    if (effectiveDays <= 60) interval = 'week';
    if (effectiveDays <= 14) interval = 'day';
    if (effectiveDays > 365 * 2) interval = 'year';
    if (effectiveDays > 365 * 50) interval = 'decade';

    // Start from beginning of appropriate period
    if (interval === 'decade') {
      current.setFullYear(Math.floor(current.getFullYear() / 10) * 10);
      current.setMonth(0, 1);
    } else if (interval === 'year') {
      current.setMonth(0, 1);
    } else if (interval === 'month') {
      current.setDate(1);
    } else if (interval === 'week') {
      current.setDate(current.getDate() - current.getDay());
    }

    while (current <= maxDate) {
      const position = ((current.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
      
      let label = '';
      let isYear = false;
      if (interval === 'decade') {
        label = current.getFullYear().toString();
        isYear = true;
      } else if (interval === 'year') {
        label = current.getFullYear().toString();
        isYear = true;
      } else if (interval === 'month') {
        label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        isYear = current.getMonth() === 0;
      } else if (interval === 'week' || interval === 'day') {
        label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (position >= 0 && position <= 100) {
        markers.push({ date: new Date(current), label, position, isYear });
      }

      // Advance to next interval
      if (interval === 'decade') {
        current.setFullYear(current.getFullYear() + 10);
      } else if (interval === 'year') {
        current.setFullYear(current.getFullYear() + 1);
      } else if (interval === 'month') {
        current.setMonth(current.getMonth() + 1);
      } else if (interval === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    return markers;
  }, [minDate, maxDate, totalDays, zoom]);

  // Group events by character for swim lanes
  const characterLanes = useMemo(() => {
    const lanes: Map<string, ParsedEvent[]> = new Map();
    
    // "All Events" lane
    lanes.set('__all__', parsedEvents);

    // Per-character lanes
    for (const event of parsedEvents) {
      for (const charId of event.characters || []) {
        if (!lanes.has(charId)) {
          lanes.set(charId, []);
        }
        lanes.get(charId)!.push(event);
      }
    }

    console.log('[Timeline] Character lanes:', Array.from(lanes.entries()).map(([k, v]) => ({ id: k, count: v.length })));
    return lanes;
  }, [parsedEvents]);

  // Determine which lanes to show (skip __all__ if we have character lanes), respecting saved order
  const lanesToShow = useMemo(() => {
    const entries = Array.from(characterLanes.entries());
    // If we only have the __all__ lane or no character associations, show __all__
    if (entries.length <= 1) {
      console.log('[Timeline] Showing __all__ lane (no character associations)');
      return entries;
    }
    // Otherwise, show character lanes only (no __all__)
    const filtered = entries.filter(([id]) => id !== '__all__');
    
    // Sort by saved order if available
    const savedOrder = state.timeline.characterLaneOrder || [];
    if (savedOrder.length > 0) {
      filtered.sort((a, b) => {
        const indexA = savedOrder.indexOf(a[0]);
        const indexB = savedOrder.indexOf(b[0]);
        // Characters not in saved order go to the end
        const orderA = indexA === -1 ? Infinity : indexA;
        const orderB = indexB === -1 ? Infinity : indexB;
        return orderA - orderB;
      });
    }
    
    console.log('[Timeline] Showing character lanes:', filtered.map(([k, v]) => ({ id: k, count: v.length })));
    return filtered;
  }, [characterLanes, state.timeline.characterLaneOrder]);

  // Handle lane reorder from drag-drop
  const handleLaneReorder = useCallback((newOrder: string[]) => {
    dispatch({ type: 'REORDER_TIMELINE_LANES', payload: newOrder });
  }, [dispatch]);

  // Setup sortable on lanes container
  useEffect(() => {
    if (!lanesContainerRef.current) return;
    
    // Destroy existing sortable
    if (sortableRef.current) {
      sortableRef.current.destroy();
    }
    
    sortableRef.current = Sortable.create(lanesContainerRef.current, {
      animation: 150,
      handle: `.${styles.laneHeader}`,
      ghostClass: styles.laneGhost,
      dragClass: styles.laneDragging,
      filter: `.${styles.undatedLane}`, // Don't allow dragging the undated events lane
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          // Get the new order from the DOM
          const laneElements = lanesContainerRef.current?.querySelectorAll('[data-lane-id]');
          if (laneElements) {
            const newOrder = Array.from(laneElements)
              .map(el => el.getAttribute('data-lane-id'))
              .filter((id): id is string => id !== null && id !== '__undated__');
            handleLaneReorder(newOrder);
          }
        }
      },
    });
    
    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [lanesToShow, handleLaneReorder]);

  const getCharacterName = (charId: string): string => {
    if (charId === '__all__') return 'All Events';
    const char = state.characters.find(c => c.id === charId);
    return char?.name || 'Unknown';
  };

  const getEventPosition = (event: ParsedEvent): number => {
    if (!event.startDate) return 0;
    const pos = ((event.startDate.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
    console.log(`[Timeline] Event "${event.title}" position: ${pos.toFixed(2)}%`);
    return pos;
  };

  const handleEventClick = (eventId: string) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event', itemId: eventId } });
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, 10));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.5, 0.25));
  const handleResetZoom = () => setZoom(1);

  // Mouse drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      scrollLeft: scrollContainerRef.current.scrollLeft
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStart.x;
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - dx;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(z => Math.min(z * 1.1, 10));
      } else {
        setZoom(z => Math.max(z / 1.1, 0.25));
      }
    }
  };

  // Get character avatar/initial
  const getCharacterAvatar = (charId: string) => {
    const char = state.characters.find(c => c.id === charId);
    if (!char) return null;
    
    if (char.picture) {
      return <img src={char.picture} alt={char.name} className={styles.avatarImage} />;
    }
    return <span className={styles.avatarInitial}>{char.name?.charAt(0)?.toUpperCase() || '?'}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Timeline View</span>
        <HelpButton helpId="timeline-view" />
        
        <div className={styles.dateRangeControls}>
          <div className={styles.dateInputGroup}>
            <label>From:</label>
            <input
              type="date"
              value={manualStartDate}
              onChange={(e) => setManualStartDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label>To:</label>
            <input
              type="date"
              value={manualEndDate}
              onChange={(e) => setManualEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <button onClick={handleApplyRange} className={styles.toolBtn} title="Apply Date Range">
            Apply
          </button>
          <button onClick={handleFitToEvents} className={styles.toolBtn} title="Fit to Events">
            Fit
          </button>
        </div>

        <div className={styles.quickRanges}>
          <button onClick={() => handleQuickRange(-200, 0)} className={styles.quickBtn} title="1800s-Present">
            1800s
          </button>
          <button onClick={() => handleQuickRange(-50, 50)} className={styles.quickBtn} title="±50 Years">
            ±50yr
          </button>
          <button onClick={() => handleQuickRange(0, 200)} className={styles.quickBtn} title="Present-Future">
            Future
          </button>
        </div>
        
        <div className={styles.zoomControls}>
          <button onClick={handleZoomOut} className={styles.zoomBtn} title="Zoom Out (Ctrl+Scroll)">−</button>
          <button onClick={handleResetZoom} className={styles.zoomBtn} title="Reset Zoom">⟲</button>
          <button onClick={handleZoomIn} className={styles.zoomBtn} title="Zoom In (Ctrl+Scroll)">+</button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div className={styles.dateRangeInfo}>
        <span>Showing: {formatShortDate(minDate)} — {formatShortDate(maxDate)} ({totalDays.toLocaleString()} days)</span>
        <span className={styles.hint}>Ctrl+Scroll to zoom • Drag to pan • Drag lane headers to reorder</span>
      </div>

      <div 
        className={styles.timelineWrapper}
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Time axis header */}
        <div className={styles.timeAxis} style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
          <div className={styles.timeAxisSpacer} />
          <div className={styles.timeAxisContent}>
            {timeMarkers.map((marker, idx) => (
              <div 
                key={idx} 
                className={`${styles.timeMarker} ${marker.isYear ? styles.yearMarker : ''}`}
                style={{ left: `${marker.position}%` }}
              >
                <span className={styles.markerLabel}>{marker.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Swim lanes */}
        <div ref={lanesContainerRef} className={styles.lanesContainer} style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
          {lanesToShow.map(([charId, events]) => (
            <div key={charId} data-lane-id={charId} className={styles.lane}>
              <div className={styles.laneHeader}>
                <div className={styles.dragHandle} title="Drag to reorder">⋮⋮</div>
                {charId !== '__all__' && (
                  <div className={styles.avatar}>
                    {getCharacterAvatar(charId)}
                  </div>
                )}
                <span className={styles.laneName}>{getCharacterName(charId)}</span>
                <span className={styles.eventCount}>({events.length})</span>
              </div>
              <div className={styles.laneContent}>
                {/* Grid lines */}
                {timeMarkers.map((marker, idx) => (
                  <div 
                    key={idx} 
                    className={`${styles.gridLine} ${marker.isYear ? styles.yearGridLine : ''}`}
                    style={{ left: `${marker.position}%` }}
                  />
                ))}
                
                {/* Events as bars */}
                {events.map((event, eventIdx) => {
                  const position = getEventPosition(event);
                  // Stagger overlapping events vertically
                  const row = eventIdx % 3;
                  
                  // Check if event is within visible range
                  if (position < 0 || position > 100) return null;
                  
                  return (
                    <div
                      key={event.id}
                      className={styles.eventBar}
                      style={{ 
                        left: `${position}%`,
                        top: `${8 + row * 28}px`
                      }}
                      onClick={() => handleEventClick(event.id)}
                      title={`${event.title}\n${event.startDate ? formatShortDate(event.startDate) : ''}`}
                    >
                      <div className={styles.eventDot} />
                      <span className={styles.eventTitle}>{event.title}</span>
                      <span className={styles.eventDate}>
                        {event.startDate && formatShortDate(event.startDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Undated events section */}
          {undatedEvents.length > 0 && (
            <div data-lane-id="__undated__" className={`${styles.lane} ${styles.undatedLane}`}>
              <div className={styles.laneHeader}>
                <span className={styles.laneName}>📅 Undated Events</span>
                <span className={styles.eventCount}>({undatedEvents.length})</span>
              </div>
              <div className={styles.undatedContent}>
                {undatedEvents.map(event => (
                  <div
                    key={event.id}
                    className={styles.undatedEvent}
                    onClick={() => handleEventClick(event.id)}
                    title={event.title}
                  >
                    <span className={styles.eventTitle}>{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {parsedEvents.length === 0 && undatedEvents.length === 0 && (
        <div className={styles.emptyState}>
          <p>No events yet. Add events from the Events tab to see them on the timeline.</p>
        </div>
      )}
    </div>
  );
};
