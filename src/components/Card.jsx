import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {children}
    </div>
  );
}
