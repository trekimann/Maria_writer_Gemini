import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreatorConnectionsGraph } from './CreatorConnectionsGraph';

describe('CreatorConnectionsGraph', () => {
  it('renders an empty state when there are no connections', () => {
    render(<CreatorConnectionsGraph userLabel="Test User" color="#4f46e5" connections={[]} />);
    expect(screen.getByText('No creator relationships yet.')).toBeInTheDocument();
  });

  it('renders creator nodes and a graph label', () => {
    render(
      <CreatorConnectionsGraph
        userLabel="Test User"
        color="#4f46e5"
        connections={[
          { id: '1', name: 'Alice', kind: 'follow' },
          { id: '2', name: 'Bob', kind: 'collaborator' },
        ]}
      />
    );

    expect(screen.getByRole('img', { name: /creator relationships graph/i })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByText('Following').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Collaborator').length).toBeGreaterThan(0);
  });
});
