'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Overview', icon: '📊' },
  { href: '/alumnos', label: 'Alumnos', icon: '👥' },
  { href: '/cobros', label: 'Cobros', icon: '💰' },
  { href: '/rendicion', label: 'Rendición', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">AK</div>
        <div>
          <h2 className="sidebar-title">AKDs</h2>
          <p className="sidebar-subtitle">Command Center</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot"></span>
          <span>System Live</span>
        </div>
        <p className="sidebar-version">v2.0 · 2026</p>
      </div>
    </aside>
  );
}
