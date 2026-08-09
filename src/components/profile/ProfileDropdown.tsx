import React, { useRef, useEffect } from 'react';
import { 
  Add01Icon, 
  Comment01Icon, 
  Settings02Icon, 
  Sun01Icon, 
  Moon01Icon, 
  ComputerIcon, 
  ArrowUpRight01Icon,
} from 'hugeicons-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardRepositoryUrl } from '../../config/project';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  triggerRef,
}) => {
  const { settings, updateAppearance } = useSettings();
  const { user, login, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close (ignoring clicks on the trigger avatar button)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleAction = (cb: () => void) => {
    cb();
    onClose();
  };

  const currentTheme = settings.appearance.theme;
  const githubUser = user?.login || settings.profile.github || 'rishabh';

  return (
    <div className="profile-dropdown-popover" ref={dropdownRef}>
      {/* Header Profile Section */}
      <div className="profile-dropdown-header">
        <h3 className="profile-dropdown-name">{settings.profile.name || 'Rishabh'}</h3>
        <p className="profile-dropdown-email">
          {settings.profile.email || `${(settings.profile.github || 'rishabh').toLowerCase()}@nst.rishihood.edu.in`}
        </p>

        <button 
          className="profile-setup-btn"
          onClick={() => handleAction(user ? onOpenSettings : login)}
        >
          {user ? 'Set up profile' : 'Sign in with GitHub'}
        </button>
      </div>

      <div className="profile-dropdown-divider" />

      {/* Main Action Links */}
      <div className="profile-dropdown-section">
        <button 
          className="profile-dropdown-item"
          onClick={() => handleAction(() => alert('Request content: What AI topic or algorithm would you like to see next? Email: hello@pingala.ai'))}
        >
          <Add01Icon size={16} className="profile-item-icon" />
          <span>Request content</span>
        </button>

        <button 
          className="profile-dropdown-item"
          onClick={() => handleAction(() => alert('Thank you for your feedback! Reach out to us on GitHub or Discord.'))}
        >
          <Comment01Icon size={16} className="profile-item-icon" />
          <span>Give feedback</span>
        </button>

        <button 
          className="profile-dropdown-item"
          onClick={() => handleAction(onOpenSettings)}
        >
          <Settings02Icon size={16} className="profile-item-icon" />
          <span>Settings</span>
        </button>
      </div>

      <div className="profile-dropdown-divider" />

      {/* Theme Switcher Row */}
      <div className="profile-dropdown-theme-row">
        <span className="profile-theme-label">Theme</span>
        <div className="profile-theme-pill">
          <button 
            className={`theme-pill-btn ${currentTheme === 'light' ? 'active' : ''}`}
            onClick={() => updateAppearance({ theme: 'light' })}
            title="Light Theme"
          >
            <Sun01Icon size={14} />
          </button>
          <button 
            className={`theme-pill-btn ${currentTheme === 'dark' ? 'active' : ''}`}
            onClick={() => updateAppearance({ theme: 'dark' })}
            title="Dark Theme (#141414)"
          >
            <Moon01Icon size={14} />
          </button>
          <button 
            className={`theme-pill-btn ${currentTheme === 'system' ? 'active' : ''}`}
            onClick={() => updateAppearance({ theme: 'system' })}
            title="System Theme"
          >
            <ComputerIcon size={14} />
          </button>
        </div>
      </div>

      <div className="profile-dropdown-divider" />

      {/* Secondary Links List */}
      <div className="profile-dropdown-section links-section">
        {!user && (
          <button
            className="profile-dropdown-item text-only with-arrow"
            onClick={() => handleAction(login)}
          >
            <span>Sign in with GitHub</span>
            <ArrowUpRight01Icon size={13} />
          </button>
        )}

        {/* GitHub Option */}
        <a 
          href={`https://github.com/${githubUser}`} 
          target="_blank" 
          rel="noreferrer" 
          className="profile-dropdown-item text-only with-arrow"
          onClick={onClose}
        >
          <span>GitHub</span>
          <ArrowUpRight01Icon size={13} />
        </a>

        {/* Want to contribute? */}
        <a 
          href={dashboardRepositoryUrl}
          target="_blank" 
          rel="noreferrer" 
          className="profile-dropdown-item text-only with-arrow"
          onClick={onClose}
        >
          <span>Want to contribute?</span>
          <ArrowUpRight01Icon size={13} />
        </a>

        <button className="profile-dropdown-item text-only" onClick={onClose}>
          <span>Changelog</span>
        </button>
        <button className="profile-dropdown-item text-only" onClick={onClose}>
          <span>Blog</span>
        </button>
        {user && <button 
          className="profile-dropdown-item text-only logout-item"
          onClick={() => {
            void logout();
            onClose();
          }}
        >
          <span>Log out</span>
        </button>}
      </div>
    </div>
  );
};
