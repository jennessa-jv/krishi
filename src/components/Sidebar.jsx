import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BookOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: BookOpen, label: t('modules'), path: '/modules' },
  ];

  return (
    <aside className="w-64 border-r border-dark-border bg-dark-surface h-[calc(100vh-4rem)] flex flex-col hidden md:flex sticky top-16">
      <div className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-dark-primary/10 text-dark-primary font-medium'
                  : 'text-dark-muted hover:bg-dark-bg hover:text-dark-text'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
