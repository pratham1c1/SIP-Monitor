import { NavLink } from "react-router-dom";
import "./Navbar.css";

const links = [
  ["Analyze", "/"],
  ["Plan", "/plan"],
  ["Execution", "/execution"],
  ["History", "/history"],
];

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-mark">₹</span>
          <span>SIP Tracker</span>
        </div>

        <nav className="desktop-nav">
          {links.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
