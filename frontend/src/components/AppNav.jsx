import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/modeltrainlanding', label: 'Train' },
  { to: '/modeltestlanding', label: 'Detect' },
  { to: '/live', label: 'Live Monitor' },
];

function AppNav() {
  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        <Logo className="nav-mark" size={42} />
        Sentinel
      </Link>

      <div className="nav-links">
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="nav-tail">
        <span className="badge badge-success">
          <span className="badge-dot badge-dot--pulse" />
          Operational
        </span>
      </div>
    </nav>
  );
}

export default AppNav;
