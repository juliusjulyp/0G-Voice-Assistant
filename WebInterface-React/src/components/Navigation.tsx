import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationProps {
  isDashboard?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isDashboard = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      // Navigate to home page first, then scroll
      window.location.href = `/#${sectionId}`;
      return;
    }

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav 
      className="navbar" 
      style={{
        background: isScrolled 
          ? 'rgba(15, 23, 42, 0.95)' 
          : 'rgba(15, 23, 42, 0.9)'
      }}
    >
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <i className="fas fa-microphone-alt"></i>
          <span>0G Voice/Text Assistant</span>
        </Link>
        
        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {!isDashboard ? (
            <>
              <li><a href="#hero" className="nav-link" onClick={() => scrollToSection('hero')}>Home</a></li>
              <li><a href="#features" className="nav-link" onClick={() => scrollToSection('features')}>Features</a></li>
              <li><a href="#demo" className="nav-link" onClick={() => scrollToSection('demo')}>Demo</a></li>
              <li><Link to="/dashboard" className="nav-link">Dashboard</Link></li>
              <li><a href="#docs" className="nav-link" onClick={() => scrollToSection('docs')}>Docs</a></li>
              <li><a href="#contact" className="nav-link" onClick={() => scrollToSection('contact')}>Contact</a></li>
            </>
          ) : (
            <>
              <li><Link to="/" className="nav-link">Home</Link></li>
              <li><a href="#dashboard-overview" className="nav-link" onClick={() => scrollToSection('dashboard-overview')}>Overview</a></li>
              <li><a href="#tools" className="nav-link" onClick={() => scrollToSection('tools')}>Tools</a></li>
              <li><a href="#analytics" className="nav-link" onClick={() => scrollToSection('analytics')}>Analytics</a></li>
              <li><a href="#settings" className="nav-link" onClick={() => scrollToSection('settings')}>Settings</a></li>
            </>
          )}
        </ul>
        
        <div 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;