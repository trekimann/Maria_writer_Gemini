import React from 'react';

interface EditorContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onCopy: () => Promise<void>;
  onPaste: () => Promise<void>;
  onCreateEvent: () => void;
  onAutoTag: () => void;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  visible,
  x,
  y,
  onCopy,
  onPaste,
  onCreateEvent,
  onAutoTag
}) => {
  if (!visible) {
    return null;
  }

  const buttonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    color: '#374151',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 2000,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '0.5rem 0',
        minWidth: '200px'
      }}
    >
      <button
        onClick={onCopy}
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Copy
      </button>
      <button
        onClick={onPaste}
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Paste
      </button>
      <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
      <button
        onClick={onCreateEvent}
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Create event
      </button>
      <button
        onClick={onAutoTag}
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        Auto-tag Characters
      </button>
    </div>
  );
};
