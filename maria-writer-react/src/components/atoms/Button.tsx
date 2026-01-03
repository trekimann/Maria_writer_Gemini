import React from 'react';
import styles from './Button.module.scss';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  label?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  label, 
  children, 
  className,
  ...props 
}) => {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {Icon && <Icon className={styles.icon} size={size === 'sm' ? 16 : 20} />}
      {label || children}
    </button>
  );
};
