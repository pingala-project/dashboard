import React, { useRef } from 'react';
import { 
  Search01Icon, 
  UserIcon, 
} from 'hugeicons-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileDropdown } from '../profile/ProfileDropdown';

interface TopBarProps {
  activeViewType: string;
  onNavigateTab: (tab: 'all_courses' | 'bookmarks') => void;
  onOpenSearch: () => void;
  onToggleProfileDropdown: () => void;
  isProfileDropdownOpen: boolean;
  onCloseProfileDropdown: () => void;
  onOpenSettings: () => void;
  bookmarkedCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeViewType,
  onNavigateTab,
  onOpenSearch,
  onToggleProfileDropdown,
  isProfileDropdownOpen,
  onCloseProfileDropdown,
  onOpenSettings,
  bookmarkedCount,
}) => {
  const { user } = useAuth();
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const avatarUrl = user?.avatarUrl || '';
  const profileName = user?.name || 'Guest learner';
  const profileHandle = user?.login || 'guest';

  return (
    <header className="topbar mobbin-topbar">
      <div className="mobbin-topbar-inner">
        {/* Left: Brand Logo + Courses & Saved Text Links */}
        <div className="topbar-left-mobbin">
          <div 
            className="topbar-brand-link"
            onClick={() => onNavigateTab('all_courses')}
            title="The Pingala Project"
          >
            <div className="pingala-binary-logo">
              <span className="binary-line">01</span>
              <span className="binary-line">10</span>
            </div>
            <span className="topbar-brand-title">Pingala</span>
          </div>

          {activeViewType !== 'settings' && (
            <nav className="topbar-nav-tabs">
              <button 
                className={`topbar-nav-btn ${activeViewType === 'all_courses' || activeViewType === 'course' || activeViewType === 'topic' ? 'active' : ''}`}
                onClick={() => onNavigateTab('all_courses')}
              >
                Courses
              </button>
              <button 
                className={`topbar-nav-btn ${activeViewType === 'bookmarks' ? 'active' : ''}`}
                onClick={() => onNavigateTab('bookmarks')}
              >
                <span>Saved</span>
                {bookmarkedCount > 0 && (
                  <span className="tab-badge-count">{bookmarkedCount}</span>
                )}
              </button>
            </nav>
          )}
        </div>

        {/* Center: Wide Search Bar (Dead-center aligned) */}
        {activeViewType !== 'settings' ? (
          <div className="topbar-center-mobbin">
            <button 
              className="mobbin-search-bar-btn"
              onClick={onOpenSearch}
              title="Search on Pingala..."
            >
              <div className="search-bar-inner">
                <Search01Icon size={18} className="search-bar-icon" />
                <span className="search-bar-placeholder">Search on Pingala...</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="topbar-center-mobbin-empty" />
        )}

        {/* Right: Single Profile Avatar + Popover Anchor */}
        <div className="topbar-right-mobbin">
          <div className="topbar-profile-container">
            <button 
              ref={avatarBtnRef}
              className={`topbar-avatar-btn ${isProfileDropdownOpen ? 'active' : ''}`}
              onClick={onToggleProfileDropdown}
              title={`Profile (@${profileHandle})`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="mobbin-user-avatar"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon size={18} className="mobbin-fallback-avatar" />
              )}
            </button>

            {/* Profile Dropdown anchored directly to the avatar */}
            <ProfileDropdown
              isOpen={isProfileDropdownOpen}
              onClose={onCloseProfileDropdown}
              onOpenSettings={onOpenSettings}
              triggerRef={avatarBtnRef}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
