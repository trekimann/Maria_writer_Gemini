import React, { useState } from 'react';
import { LifeEvent, LifeEventType, Character } from '../../types';
import { DateTimeInput } from './DateTimeInput';
import { Button } from '../atoms/Button';
import { Plus, X, Heart, Users, Baby } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import styles from './LifeEventForm.module.scss';

interface LifeEventFormProps {
  characterId: string;
  characters: Character[];
  lifeEvents: LifeEvent[];
  onChange: (events: LifeEvent[]) => void;
  onCreateChildCharacter?: (childName: string, dob: string, parentIds: string[]) => void;
}

interface PendingEvent {
  type: LifeEventType | '';
  date: string;
  endDate: string;
  selectedCharacters: string[];
  childOption: 'existing' | 'create';
  existingChildId: string;
  newChildName: string;
}

const initialPendingEvent: PendingEvent = {
  type: '',
  date: '',
  endDate: '',
  selectedCharacters: [],
  childOption: 'existing',
  existingChildId: '',
  newChildName: '',
};

const EVENT_TYPE_LABELS: Record<LifeEventType, string> = {
  'birth-of-child': 'Birth of a Child',
  'marriage': 'Marriage/Partnership',
  'friendship': 'Friendship',
};

const EVENT_TYPE_ICONS: Record<LifeEventType, React.ReactNode> = {
  'birth-of-child': <Baby size={16} />,
  'marriage': <Heart size={16} />,
  'friendship': <Users size={16} />,
};

export const LifeEventForm: React.FC<LifeEventFormProps> = ({
  characterId,
  characters,
  lifeEvents,
  onChange,
  onCreateChildCharacter,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [pending, setPending] = useState<PendingEvent>(initialPendingEvent);

  const otherCharacters = characters.filter(c => c.id !== characterId);

  const handleTypeChange = (type: LifeEventType | '') => {
    setPending({
      ...initialPendingEvent,
      type,
    });
  };

  const handleCharacterToggle = (id: string) => {
    setPending(prev => ({
      ...prev,
      selectedCharacters: prev.selectedCharacters.includes(id)
        ? prev.selectedCharacters.filter(c => c !== id)
        : [...prev.selectedCharacters, id],
    }));
  };

  const canAddEvent = (): boolean => {
    if (!pending.type || !pending.date) return false;

    if (pending.type === 'birth-of-child') {
      if (pending.childOption === 'existing' && !pending.existingChildId) return false;
      if (pending.childOption === 'create' && !pending.newChildName.trim()) return false;
      // At least current character is a parent, optionally another
      return true;
    }

    // Marriage and friendship require at least 1 other character (2 total including current)
    if (pending.type === 'marriage' || pending.type === 'friendship') {
      return pending.selectedCharacters.length >= 1;
    }

    return false;
  };

  const handleAddEvent = () => {
    if (!canAddEvent() || !pending.type) return;

    let newEvent: LifeEvent;

    if (pending.type === 'birth-of-child') {
      const parentIds = [characterId, ...pending.selectedCharacters];
      
      if (pending.childOption === 'create' && onCreateChildCharacter) {
        // Create child character - the callback will handle adding the event
        onCreateChildCharacter(pending.newChildName.trim(), pending.date, parentIds);
        setPending(initialPendingEvent);
        setIsAdding(false);
        return;
      }

      newEvent = {
        id: uuidv4(),
        type: 'birth-of-child',
        date: pending.date,
        characters: parentIds,
        childId: pending.existingChildId,
      };
    } else {
      // Marriage or friendship
      newEvent = {
        id: uuidv4(),
        type: pending.type,
        date: pending.date,
        endDate: pending.endDate || undefined,
        characters: [characterId, ...pending.selectedCharacters],
      };
    }

    onChange([...lifeEvents, newEvent]);
    setPending(initialPendingEvent);
    setIsAdding(false);
  };

  const handleRemoveEvent = (eventId: string) => {
    onChange(lifeEvents.filter(e => e.id !== eventId));
  };

  const getEventDescription = (event: LifeEvent): string => {
    const involvedChars = event.characters
      .filter(id => id !== characterId)
      .map(id => characters.find(c => c.id === id)?.name || 'Unknown')
      .join(', ');

    if (event.type === 'birth-of-child') {
      const child = characters.find(c => c.id === event.childId);
      const partners = involvedChars || 'self';
      return `Child: ${child?.name || 'Unknown'} (with ${partners})`;
    }

    return involvedChars || 'Unknown';
  };

  const renderExistingEvents = () => {
    if (lifeEvents.length === 0) return null;

    return (
      <div className={styles.existingEvents}>
        <label className={styles.sectionLabel}>Life Events</label>
        <ul className={styles.eventList}>
          {lifeEvents.map(event => (
            <li key={event.id} className={styles.eventItem}>
              <span className={styles.eventIcon}>{EVENT_TYPE_ICONS[event.type]}</span>
              <div className={styles.eventInfo}>
                <strong>{EVENT_TYPE_LABELS[event.type]}</strong>
                <span className={styles.eventDetails}>
                  {getEventDescription(event)}
                </span>
                <span className={styles.eventDates}>
                  {event.date}
                  {event.endDate && ` — ${event.endDate}`}
                </span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemoveEvent(event.id)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderAddForm = () => {
    if (!isAdding) {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAdding(true)}
          className={styles.addButton}
        >
          <Plus size={16} /> Add Life Event
        </Button>
      );
    }

    return (
      <div className={styles.addForm}>
        <div className={styles.formHeader}>
          <label className={styles.sectionLabel}>Add Life Event</label>
          <button type="button" className={styles.cancelBtn} onClick={() => {
            setPending(initialPendingEvent);
            setIsAdding(false);
          }}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.field}>
          <label>Event Type</label>
          <select
            value={pending.type}
            onChange={(e) => handleTypeChange(e.target.value as LifeEventType | '')}
            className={styles.select}
          >
            <option value="">Select event type...</option>
            <option value="birth-of-child">Birth of a Child</option>
            <option value="marriage">Marriage/Partnership</option>
            <option value="friendship">Friendship</option>
          </select>
        </div>

        {pending.type && (
          <>
            {/* Date fields */}
            <div className={styles.dateFields}>
              <div className={styles.field}>
                <label>{pending.type === 'birth-of-child' ? 'Birth Date' : 'Start Date'}</label>
                <DateTimeInput
                  value={pending.date}
                  onChange={(val) => setPending(p => ({ ...p, date: val }))}
                  className={styles.input}
                  placeholder="dd/MM/yyyy HH:mm:ss"
                />
              </div>
              {(pending.type === 'marriage' || pending.type === 'friendship') && (
                <div className={styles.field}>
                  <label>End Date (optional)</label>
                  <DateTimeInput
                    value={pending.endDate}
                    onChange={(val) => setPending(p => ({ ...p, endDate: val }))}
                    className={styles.input}
                    placeholder="dd/MM/yyyy HH:mm:ss"
                  />
                </div>
              )}
            </div>

            {/* Birth of child specific fields */}
            {pending.type === 'birth-of-child' && (
              <div className={styles.birthChildSection}>
                <div className={styles.field}>
                  <label>Other Parent (optional)</label>
                  <div className={styles.charSelect}>
                    {otherCharacters.map(char => (
                      <label key={char.id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={pending.selectedCharacters.includes(char.id)}
                          onChange={() => handleCharacterToggle(char.id)}
                        />
                        <span>{char.name}</span>
                      </label>
                    ))}
                    {otherCharacters.length === 0 && (
                      <p className={styles.noChars}>No other characters available.</p>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Child</label>
                  <div className={styles.childOptions}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="childOption"
                        checked={pending.childOption === 'existing'}
                        onChange={() => setPending(p => ({ ...p, childOption: 'existing', newChildName: '' }))}
                      />
                      <span>Select existing character</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="childOption"
                        checked={pending.childOption === 'create'}
                        onChange={() => setPending(p => ({ ...p, childOption: 'create', existingChildId: '' }))}
                      />
                      <span>Create new child character</span>
                    </label>
                  </div>

                  {pending.childOption === 'existing' && (
                    <select
                      value={pending.existingChildId}
                      onChange={(e) => setPending(p => ({ ...p, existingChildId: e.target.value }))}
                      className={styles.select}
                    >
                      <option value="">Select child character...</option>
                      {otherCharacters.map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  )}

                  {pending.childOption === 'create' && (
                    <input
                      type="text"
                      value={pending.newChildName}
                      onChange={(e) => setPending(p => ({ ...p, newChildName: e.target.value }))}
                      placeholder="Enter child's name..."
                      className={styles.input}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Marriage/Friendship character selection */}
            {(pending.type === 'marriage' || pending.type === 'friendship') && (
              <div className={styles.field}>
                <label>
                  {pending.type === 'marriage' ? 'Partner' : 'Friend'} 
                  <span className={styles.required}> (required)</span>
                </label>
                <div className={styles.charSelect}>
                  {otherCharacters.map(char => (
                    <label key={char.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={pending.selectedCharacters.includes(char.id)}
                        onChange={() => handleCharacterToggle(char.id)}
                      />
                      <span>{char.name}</span>
                    </label>
                  ))}
                  {otherCharacters.length === 0 && (
                    <p className={styles.noChars}>No other characters available.</p>
                  )}
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddEvent}
                disabled={!canAddEvent()}
              >
                Add Event
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {renderExistingEvents()}
      {renderAddForm()}
    </div>
  );
};
