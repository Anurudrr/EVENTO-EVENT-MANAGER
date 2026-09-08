import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Menu, X, Sparkles, LogOut, LayoutDashboard, ChevronDown, UserCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './ui/Avatar';
import { NotificationBell } from './NotificationBell';
import { getDashboardPathForRole } from '../utils/dashboard';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/explore' },
  { name: 'Events', href: '/events' },
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
];

export const Navbar: React.FC = React.memo(() => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location]);

  const dashboardPath = getDashboardPathForRole(user?.role);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className={`rounded-none px-8 py-3 flex items-center justify-between transition-all duration-500 border border-noir-border ${
          isScrolled ? 'bg-noir-card/90 backdrop-blur-xl shadow-2xl shadow-noir-accent/5' : 'bg-noir-card/40 backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-noir-accent flex items-center justify-center text-white shadow-xl shadow-noir-accent/20 transition-transform duration-300 group-hover:rotate-90">
                <Sparkles className="w-7 h-7" />
              </div>
              <span className="text-xl font-serif font-semibold text-noir-ink tracking-wide">EVENTO</span>
            </Link>

            <div className="hidden lg:flex items-center gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`text-[10px] font-semibold uppercase tracking-[0.4em] transition-all duration-300 relative group ${
                    location.pathname === link.href
                      ? 'text-noir-accent'
                      : 'text-noir-muted hover:text-noir-ink'
                  }`}
                >
                  {link.name}
                  {location.pathname === link.href && (
                    <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-noir-accent" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light mode"
              className="flex h-10 w-10 items-center justify-center border border-noir-border bg-noir-card text-noir-muted hover:text-noir-ink hover:border-noir-accent transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-noir-muted" />}
            </button>

            <button className="flex items-center gap-3 text-[10px] font-semibold text-noir-muted hover:text-noir-ink transition-colors uppercase tracking-[0.3em]">
              <Globe className="w-4 h-4" />
              <span>EN</span>
              <span className="text-noir-border">|</span>
              <span>USD</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <NotificationBell
                  buttonClassName="relative flex h-12 w-12 items-center justify-center border border-noir-border bg-noir-card text-noir-accent transition-colors hover:border-noir-accent"
                />
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-4 bg-noir-card border border-noir-border text-noir-ink rounded-none pl-2 pr-5 py-2 hover:border-noir-accent transition-all group"
                  >
                    <Avatar
                      src={user?.profilePicture}
                      name={user?.name}
                      size="sm"
                      className="border-noir-border rounded-none"
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest">{user?.name?.split(' ')[0] || 'User'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-4 w-72 bg-noir-card rounded-none border border-noir-border shadow-2xl p-4 z-50 overflow-hidden">
                      <div className="px-4 py-4 border-b border-noir-border mb-3">
                        <p className="text-[10px] font-semibold text-noir-accent uppercase tracking-[0.4em] mb-2">Signed in as</p>
                        <p className="text-sm font-mono font-semibold text-noir-ink truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-4 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-noir-muted hover:text-noir-accent hover:bg-noir-accent/5 transition-all group"
                      >
                        <UserCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        My Profile
                      </Link>
                      <Link
                        to={dashboardPath}
                        className="flex items-center gap-4 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-noir-muted hover:text-noir-accent hover:bg-noir-accent/5 transition-all group"
                      >
                        <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Dashboard
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all group"
                      >
                        <LogOut className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/login" className="text-xs font-semibold uppercase tracking-[0.3em] text-noir-muted hover:text-noir-ink transition-colors">
                  Log In
                </Link>
                <Link to="/signup" className="btn-noir !py-3 !px-10 !text-xs">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light mode"
              className="flex h-10 w-10 items-center justify-center border border-noir-border bg-noir-card text-noir-muted hover:text-noir-ink hover:border-noir-accent transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-noir-muted" />}
            </button>

            {isAuthenticated && (
              <NotificationBell
                buttonClassName="relative flex h-10 w-10 items-center justify-center border border-noir-border bg-noir-card text-noir-accent transition-colors hover:border-noir-accent"
              />
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-noir-ink hover:text-noir-accent transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[88px] bg-noir-bg border-b border-noir-border p-8 overflow-y-auto animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-lg font-display font-semibold uppercase tracking-widest text-noir-ink hover:text-noir-accent transition-colors py-2 border-b border-noir-border"
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="pt-6 border-t border-noir-border flex flex-col gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-4 text-sm font-semibold uppercase tracking-widest text-noir-ink hover:text-noir-accent py-2"
                >
                  <UserCircle className="w-6 h-6" />
                  My Profile
                </Link>
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-4 text-sm font-semibold uppercase tracking-widest text-noir-ink hover:text-noir-accent py-2"
                >
                  <LayoutDashboard className="w-6 h-6" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-4 text-sm font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-600 py-2 text-left"
                >
                  <LogOut className="w-6 h-6" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="pt-6 border-t border-noir-border flex flex-col gap-4">
                <Link to="/login" className="btn-noir-ghost w-full text-center">
                  Log In
                </Link>
                <Link to="/signup" className="btn-noir w-full text-center">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
});

Navbar.displayName = 'Navbar';
