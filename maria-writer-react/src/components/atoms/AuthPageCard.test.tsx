import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthPageCard } from './AuthPageCard';

describe('AuthPageCard', () => {
  it('renders title, subtitle, body, and footer content', () => {
    render(
      <AuthPageCard title="Maria Writer" subtitle="Sign in to your account" footer={<div>Footer links</div>}>
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" />
        </form>
      </AuthPageCard>
    );

    expect(screen.getByRole('heading', { name: 'Maria Writer' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Footer links')).toBeInTheDocument();
  });
});
