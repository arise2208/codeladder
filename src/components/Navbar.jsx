import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser('');
    navigate('/login');
  };

  const isActivePage = (path) => location.pathname === path;

  const NavLink = ({ to, children, icon, isSpecial = false }) => (
    <Link 
      to={to}
      className={`navbar-link group relative flex items-center gap-3 font-medium transition-all duration-300 px-4 py-2.5 rounded-xl ${
        isActivePage(to) 
          ? 'text-blue-600 bg-blue-50 border border-blue-100' 
          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
      } ${isSpecial ? 'text-amber-600 hover:text-amber-700 bg-amber-50' : ''}`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <i className={`${icon} text-sm group-hover:scale-110 transition-transform duration-200`}></i>
      <span className="relative font-semibold">
        {children}
        {isActivePage(to) && (
          <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
        )}
      </span>
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100' 
        : 'bg-white/90 backdrop-blur-sm'
    } py-3 px-6`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
            <div className="relative w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <i className="fas fa-code text-white text-lg"></i>
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors duration-300">
              CodeLadder
            </h1>
            <p className="text-xs text-gray-500 -mt-0.5 font-medium">Dynamic Problem Solving</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          <NavLink to="/" icon="fas fa-home">Home</NavLink>
          <NavLink to="/problemset" icon="fas fa-code">Problems</NavLink>
          <NavLink to="/ladders" icon="fas fa-layer-group">Ladders</NavLink>
          <NavLink to="/contest" icon="fas fa-trophy">Contests</NavLink>
          <NavLink to="/codechef" icon="fas fa-pepper-hot">CodeChef</NavLink>
          {user === "admin" && (
            <NavLink to="/admin" icon="fas fa-user-shield" isSpecial={true}>Admin</NavLink>
          )}
        </div>

        {/* User Section */}
        <div className="flex items-center gap-4">
          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 hover:border-gray-200 transition-all duration-300">
              {user && user !== 'Guest' ? (
                <>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {user[0]?.toUpperCase()}
                    </div>
                    <div className="status-online status-indicator absolute -bottom-0.5 -right-0.5"></div>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-gray-900 font-semibold text-sm">{user}</span>
                    <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                      <i className="fas fa-circle text-xs"></i>
                      Online
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-gray-700 font-semibold text-sm">Guest</span>
                    <p className="text-gray-500 text-xs font-medium">Welcome!</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {(!user || user === 'Guest') ? (
              <Link 
                to="/login" 
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all duration-300 px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <i className="fas fa-sign-in-alt group-hover:scale-110 transition-transform"></i>
                Sign In
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl font-semibold border border-gray-200 hover:border-red-200 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <i className="fas fa-sign-out-alt group-hover:scale-110 transition-transform"></i>
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300"
          >
            <i className={`fas transition-transform duration-300 ${isMobileMenuOpen ? 'fa-times rotate-90' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
        isMobileMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-lg space-y-2">
          <NavLink to="/" icon="fas fa-home">Home</NavLink>
          <NavLink to="/problemset" icon="fas fa-code">Problems</NavLink>
          <NavLink to="/ladders" icon="fas fa-layer-group">Ladders</NavLink>
          <NavLink to="/contest" icon="fas fa-trophy">Contests</NavLink>
          <NavLink to="/codechef" icon="fas fa-pepper-hot">CodeChef</NavLink>
          {user === "admin" && <NavLink to="/admin" icon="fas fa-user-shield" isSpecial={true}>Admin</NavLink>}
          
          <div className="pt-3 border-t border-gray-100">
            {(!user || user === 'Guest') ? (
              <Link 
                to="/login" 
                className="flex items-center gap-3 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-4 py-3 rounded-xl text-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 font-semibold px-4 py-3 rounded-xl text-center justify-center transition-all duration-300"
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;