import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { contributionGuideUrl, dashboardRepositoryUrl, issuesUrl, releasesUrl } from '../../config/project';
import type {
  ThemeMode,
  FontFamilyChoice,
  FontSizeChoice,
  ReadingWidthChoice,
  CodeThemeChoice,
} from '../../types/settings';
import {
  UserIcon,
  Sun03Icon,
  Moon02Icon,
  LaptopIcon,
  Book02Icon,
  Database01Icon,
  Download04Icon,
  Upload04Icon,
  GithubIcon,
  SparklesIcon,
  LinkSquare02Icon,
  CheckmarkCircle02Icon,
} from 'hugeicons-react';

const ACCENT_COLORS = [
  { label: 'Blue',    value: '#2563eb', hover: '#1d4ed8' },
  { label: 'Purple',  value: '#7c3aed', hover: '#6d28d9' },
  { label: 'Rose',    value: '#e11d48', hover: '#be123c' },
  { label: 'Amber',   value: '#d97706', hover: '#b45309' },
  { label: 'Emerald', value: '#059669', hover: '#047857' },
  { label: 'Cyan',    value: '#0891b2', hover: '#0e7490' },
  { label: 'Slate',   value: '#475569', hover: '#334155' },
  { label: 'Black',   value: '#18181b', hover: '#09090b' },
];

interface SettingsPageProps {
  completedTopicsCount: number;
  bookmarkedTopicsCount: number;
  totalTopicsCount: number;
  onResetProgress: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onBack?: () => void;
}

type TabType = 'account' | 'preferences' | 'reading' | 'learning' | 'data' | 'community';

const NAV_ITEMS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'account',     label: 'Account',      icon: <UserIcon size={19} /> },
  { id: 'preferences', label: 'Preferences',  icon: <Sun03Icon size={19} /> },
  { id: 'reading',     label: 'Reading Mode',  icon: <Book02Icon size={19} /> },
  { id: 'learning',    label: 'Learning',     icon: <SparklesIcon size={19} /> },
  { id: 'data',        label: 'Data & Backup',icon: <Database01Icon size={19} /> },
  { id: 'community',   label: 'Community',    icon: <GithubIcon size={19} /> },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  completedTopicsCount,
  bookmarkedTopicsCount,
  totalTopicsCount,
  onResetProgress,
  onExportData,
  onImportData,
}) => {
  const { settings, updateProfile, updateAppearance, updateDisplay, updateLearning } = useSettings();
  const { user, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Accent color state (default blue)
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('pingala_accent') || '#2563eb';
  });

  // Apply accent color to CSS custom property
  useEffect(() => {
    const found = ACCENT_COLORS.find((c) => c.value === accentColor);
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--accent-hover', found?.hover || accentColor);
    localStorage.setItem('pingala_accent', accentColor);
  }, [accentColor]);

  // Also apply on mount from storage
  useEffect(() => {
    const saved = localStorage.getItem('pingala_accent');
    if (saved) {
      const found = ACCENT_COLORS.find((c) => c.value === saved);
      document.documentElement.style.setProperty('--accent', saved);
      document.documentElement.style.setProperty('--accent-hover', found?.hover || saved);
    }
  }, []);

  // Inline edit states
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const [tempName, setTempName] = useState(settings.profile.name || 'Rishabh');
  const [tempEmail, setTempEmail] = useState(
    settings.profile.email || `${(settings.profile.github || 'rishabh').toLowerCase()}@nst.rishihood.edu.in`
  );
  const [tempGoal, setTempGoal] = useState(settings.profile.learningGoal || 'Master Deep Learning & Transformers');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    void logout();
  };

  return (
    <div className="settings-fullpage">
      {/* ── Left Sidebar Navigation (Mobbin style) ── */}
      <aside className="settings-fullpage-sidebar">
        <nav className="settings-fullpage-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="settings-nav-icon">{item.icon}</span>
              <span className="settings-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Right Content Area ── */}
      <div className="settings-fullpage-content">

        {/* ══ ACCOUNT TAB (1:1 Mobbin Account Settings Layout) ══ */}
        {activeTab === 'account' && (
          <div className="settings-tab-pane">
            {/* Top Profile Header (Stacked Avatar, Name, Email) */}
            <div className="mobbin-account-header">
              <div className="mobbin-avatar-wrapper">
                <img
                  src={`https://github.com/${settings.profile.github || 'rishabh'}.png?size=160`}
                  alt={settings.profile.name || 'Rishabh'}
                  className="mobbin-hero-avatar"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${settings.profile.github || 'pingala'}`;
                  }}
                />
              </div>

              <h1 className="mobbin-hero-name">{settings.profile.name || 'Rishabh'}</h1>
              <p className="mobbin-hero-email">
                {settings.profile.email || `${(settings.profile.github || 'rishabh').toLowerCase()}@nst.rishihood.edu.in`}
              </p>
            </div>

            {/* Personal Details Section */}
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Personal details</h2>
              
              <div className="mobbin-rows-container">
                {/* Row 1: Name */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Name</div>
                    {!editingName ? (
                      <div className="mobbin-row-val">{settings.profile.name || 'Rishabh'}</div>
                    ) : (
                      <input
                        className="mobbin-row-input"
                        value={tempName}
                        autoFocus
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateProfile({ name: tempName });
                            setEditingName(false);
                          }
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                      />
                    )}
                  </div>
                  <div className="mobbin-row-right">
                    {editingName ? (
                      <button
                        className="mobbin-save-btn"
                        onClick={() => {
                          updateProfile({ name: tempName });
                          setEditingName(false);
                        }}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        className="mobbin-edit-btn"
                        onClick={() => {
                          setTempName(settings.profile.name || 'Rishabh');
                          setEditingName(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Email */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Email address</div>
                    {!editingEmail ? (
                      <div className="mobbin-row-val">
                        {settings.profile.email || `${(settings.profile.github || 'rishabh').toLowerCase()}@nst.rishihood.edu.in`}
                      </div>
                    ) : (
                      <input
                        className="mobbin-row-input"
                        value={tempEmail}
                        autoFocus
                        onChange={(e) => setTempEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateProfile({ email: tempEmail });
                            setEditingEmail(false);
                          }
                          if (e.key === 'Escape') setEditingEmail(false);
                        }}
                      />
                    )}
                  </div>
                  <div className="mobbin-row-right">
                    {editingEmail ? (
                      <button
                        className="mobbin-save-btn"
                        onClick={() => {
                          updateProfile({ email: tempEmail });
                          setEditingEmail(false);
                        }}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        className="mobbin-edit-btn"
                        onClick={() => {
                          setTempEmail(settings.profile.email || `${(settings.profile.github || 'rishabh').toLowerCase()}@nst.rishihood.edu.in`);
                          setEditingEmail(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 3: GitHub Handle */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">GitHub username</div>
                    <div className="mobbin-row-val">
                      {user ? `@${user.login}` : 'Not connected'}
                    </div>
                  </div>
                  <div className="mobbin-row-right">
                    {user ? (
                      <a
                        className="mobbin-edit-btn"
                        href={`https://github.com/${user.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <button
                        className="mobbin-edit-btn"
                        onClick={login}
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 4: Learning Goal */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Learning goal</div>
                    {!editingGoal ? (
                      <div className="mobbin-row-val">
                        {settings.profile.learningGoal || 'Master Deep Learning & Transformers'}
                      </div>
                    ) : (
                      <input
                        className="mobbin-row-input"
                        value={tempGoal}
                        autoFocus
                        placeholder="e.g. Master Transformers"
                        onChange={(e) => setTempGoal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateProfile({ learningGoal: tempGoal });
                            setEditingGoal(false);
                          }
                          if (e.key === 'Escape') setEditingGoal(false);
                        }}
                      />
                    )}
                  </div>
                  <div className="mobbin-row-right">
                    {editingGoal ? (
                      <button
                        className="mobbin-save-btn"
                        onClick={() => {
                          updateProfile({ learningGoal: tempGoal });
                          setEditingGoal(false);
                        }}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        className="mobbin-edit-btn"
                        onClick={() => {
                          setTempGoal(settings.profile.learningGoal || 'Master Deep Learning & Transformers');
                          setEditingGoal(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Curriculum Progress Summary */}
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Curriculum stats</h2>
              <div className="mobbin-rows-container">
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Chapters completed</div>
                    <div className="mobbin-row-val">Track your completed topics and modules</div>
                  </div>
                  <div className="mobbin-stat-val">
                    {completedTopicsCount} / {totalTopicsCount}
                  </div>
                </div>
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Saved bookmarks</div>
                    <div className="mobbin-row-val">Quickly access saved formulas and code blocks</div>
                  </div>
                  <div className="mobbin-stat-val">
                    {bookmarkedTopicsCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Account Section */}
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Manage account</h2>
              <div className="mobbin-rows-container">
                {/* Log out everywhere */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Log out everywhere</div>
                    <div className="mobbin-row-val">You will be logged out on all devices.</div>
                  </div>
                  <div className="mobbin-row-right">
                    {!showLogoutConfirm ? (
                      <button
                        className="mobbin-action-link"
                        onClick={() => setShowLogoutConfirm(true)}
                      >
                        Log out
                      </button>
                    ) : (
                      <div className="mobbin-confirm-box">
                        <span>Sure?</span>
                        <button className="mobbin-confirm-btn" onClick={handleLogout}>
                          Yes
                        </button>
                        <button className="mobbin-cancel-btn" onClick={() => setShowLogoutConfirm(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete / Reset */}
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Reset progress & data</div>
                    <div className="mobbin-row-val">Permanently clear all completed lessons, bookmarks, and quiz progress.</div>
                  </div>
                  <div className="mobbin-row-right">
                    {!showResetConfirm ? (
                      <button
                        className="mobbin-delete-link"
                        onClick={() => setShowResetConfirm(true)}
                      >
                        Reset
                      </button>
                    ) : (
                      <div className="mobbin-confirm-box">
                        <span>Are you sure?</span>
                        <button
                          className="mobbin-confirm-delete-btn"
                          onClick={() => {
                            onResetProgress();
                            setShowResetConfirm(false);
                          }}
                        >
                          Yes, reset
                        </button>
                        <button className="mobbin-cancel-btn" onClick={() => setShowResetConfirm(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mobbin-footer-note">
              <CheckmarkCircle02Icon size={14} color="var(--text-muted)" />
              <span>All preferences and profile modifications are stored securely in local workspace storage.</span>
            </div>
          </div>
        )}

        {/* ══ PREFERENCES TAB ══ */}
        {activeTab === 'preferences' && (
          <div className="settings-tab-pane">
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Interface theme</h2>
              <p className="mobbin-section-subtitle">Choose how Pingala appears to you.</p>

              <div className="mobbin-selector-grid" style={{ marginTop: 16 }}>
                {([
                  { value: 'light',  icon: <Sun03Icon size={26} />,  label: 'Light' },
                  { value: 'dark',   icon: <Moon02Icon size={26} />, label: 'Dark' },
                  { value: 'system', icon: <LaptopIcon size={26} />, label: 'System' },
                ] as { value: ThemeMode; icon: React.ReactNode; label: string }[]).map((t) => (
                  <button
                    key={t.value}
                    className={`mobbin-selector-card ${settings.appearance.theme === t.value ? 'active' : ''}`}
                    onClick={() => updateAppearance({ theme: t.value })}
                  >
                    <div className="mobbin-selector-icon">{t.icon}</div>
                    <span className="mobbin-selector-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="mobbin-section-group" style={{ marginTop: 36 }}>
              <h2 className="mobbin-section-title">Accent color</h2>
              <p className="mobbin-section-subtitle">Used for active states, highlights, and interactive elements.</p>
              <div className="accent-color-row" style={{ marginTop: 16 }}>
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={`accent-swatch ${accentColor === c.value ? 'active' : ''}`}
                    style={{ background: c.value }}
                    title={c.label}
                    onClick={() => setAccentColor(c.value)}
                  >
                    {accentColor === c.value && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mobbin-section-group" style={{ marginTop: 36 }}>
              <h2 className="mobbin-section-title">Code syntax theme</h2>
              <p className="mobbin-section-subtitle">Select color palette for Python, PyTorch, and CUDA snippets.</p>

              <div className="mobbin-selector-grid" style={{ marginTop: 16 }}>
                {([
                  { value: 'onedark', icon: <SparklesIcon size={26} />, label: 'One Dark Pro' },
                  { value: 'github',  icon: <GithubIcon size={26} />,   label: 'GitHub Modern' },
                  { value: 'monokai', icon: <SparklesIcon size={26} />, label: 'Monokai' },
                ] as { value: CodeThemeChoice; icon: React.ReactNode; label: string }[]).map((c) => (
                  <button
                    key={c.value}
                    className={`mobbin-selector-card ${settings.appearance.codeTheme === c.value ? 'active' : ''}`}
                    onClick={() => updateAppearance({ codeTheme: c.value })}
                  >
                    <div className="mobbin-selector-icon">{c.icon}</div>
                    <span className="mobbin-selector-label">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ READING MODE TAB ══ */}
        {activeTab === 'reading' && (
          <div className="settings-tab-pane">
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Reading typography</h2>
              <p className="mobbin-section-subtitle">
                Customize reading typeface for all theory, mathematical derivations, and architecture explainers.
              </p>

              {/* Image 2 Selector Cards */}
              <div className="mobbin-selector-grid" style={{ marginTop: 16 }}>
                {([
                  { value: 'sans',        charClass: 'sans',        name: 'Modern Sans',   sub: 'Plus Jakarta Sans' },
                  { value: 'serif',       charClass: 'serif',       name: 'Editorial Serif',sub: 'Georgia' },
                  { value: 'mono',        charClass: 'mono',        name: 'Monospace',     sub: 'JetBrains Mono' },
                  { value: 'handwritten', charClass: 'handwritten', name: 'Handwritten',   sub: 'Caveat', beta: true },
                ] as { value: FontFamilyChoice; charClass: string; name: string; sub: string; beta?: boolean }[]).map((f) => (
                  <button
                    key={f.value}
                    className={`mobbin-selector-card ${settings.display.fontFamily === f.value ? 'active' : ''}`}
                    onClick={() => updateDisplay({ fontFamily: f.value })}
                  >
                    {f.beta && <span className="mobbin-selector-badge">β</span>}
                    <span className={`mobbin-font-glyph ${f.charClass}`}>Ag</span>
                    <span className="mobbin-selector-label">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mobbin-section-group" style={{ marginTop: 36 }}>
              <h2 className="mobbin-section-title">Font size</h2>
              {/* Image 3 Pill Switcher */}
              <div className="mobbin-pill-switcher" style={{ marginTop: 14 }}>
                {([
                  { value: 'compact',  label: 'Compact (15px)' },
                  { value: 'standard', label: 'Standard (16px)' },
                  { value: 'large',    label: 'Large (18px)' },
                ] as { value: FontSizeChoice; label: string }[]).map((s) => (
                  <button
                    key={s.value}
                    className={`mobbin-pill-opt ${settings.display.fontSize === s.value ? 'active' : ''}`}
                    onClick={() => updateDisplay({ fontSize: s.value })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mobbin-section-group" style={{ marginTop: 36 }}>
              <h2 className="mobbin-section-title">Reading container width</h2>
              {/* Image 3 Pill Switcher */}
              <div className="mobbin-pill-switcher" style={{ marginTop: 14 }}>
                {([
                  { value: 'standard', label: 'Standard (760px)' },
                  { value: 'spacious', label: 'Spacious (860px)' },
                ] as { value: ReadingWidthChoice; label: string }[]).map((w) => (
                  <button
                    key={w.value}
                    className={`mobbin-pill-opt ${settings.display.readingWidth === w.value ? 'active' : ''}`}
                    onClick={() => updateDisplay({ readingWidth: w.value })}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ LEARNING TAB ══ */}
        {activeTab === 'learning' && (
          <div className="settings-tab-pane">
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Learning experience</h2>
              <p className="mobbin-section-subtitle">Configure interactivity and celebration cues.</p>

              <div className="settings-rows-group" style={{ marginTop: 16 }}>
                {/* Toggle 1 */}
                <div className="settings-toggle-row">
                  <div>
                    <div className="toggle-info-label">Instant quiz feedback</div>
                    <div className="toggle-info-sub">Show correct answers and explanations immediately upon selection.</div>
                  </div>
                  <label className="mobbin-toggle">
                    <input
                      type="checkbox"
                      checked={settings.learning.instantQuizFeedback}
                      onChange={(e) => updateLearning({ instantQuizFeedback: e.target.checked })}
                    />
                    <span className="mobbin-toggle-track">
                      <span className="mobbin-toggle-knob" />
                    </span>
                  </label>
                </div>

                {/* Toggle 2 */}
                <div className="settings-toggle-row">
                  <div>
                    <div className="toggle-info-label">Completion confetti</div>
                    <div className="toggle-info-sub">Celebrate when you complete a lesson or module.</div>
                  </div>
                  <label className="mobbin-toggle">
                    <input
                      type="checkbox"
                      checked={settings.learning.confettiEnabled}
                      onChange={(e) => updateLearning({ confettiEnabled: e.target.checked })}
                    />
                    <span className="mobbin-toggle-track">
                      <span className="mobbin-toggle-knob" />
                    </span>
                  </label>
                </div>

                {/* Toggle 3 */}
                <div className="settings-toggle-row">
                  <div>
                    <div className="toggle-info-label">Auto-advance on complete</div>
                    <div className="toggle-info-sub">Automatically navigate to the next chapter after marking done.</div>
                  </div>
                  <label className="mobbin-toggle">
                    <input
                      type="checkbox"
                      checked={settings.learning.autoAdvanceOnComplete}
                      onChange={(e) => updateLearning({ autoAdvanceOnComplete: e.target.checked })}
                    />
                    <span className="mobbin-toggle-track">
                      <span className="mobbin-toggle-knob" />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ DATA & BACKUP TAB ══ */}
        {activeTab === 'data' && (
          <div className="settings-tab-pane">
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Data & backup</h2>
              <p className="mobbin-section-subtitle">Export or restore your curriculum state to any machine.</p>

              <div className="mobbin-rows-container" style={{ marginTop: 16 }}>
                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Export progress</div>
                    <div className="mobbin-row-val">Download a JSON backup of all completed lessons and bookmarks.</div>
                  </div>
                  <button className="mobbin-btn-soft" onClick={onExportData}>
                    <Download04Icon size={15} />
                    <span>Export data</span>
                  </button>
                </div>

                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Import progress</div>
                    <div className="mobbin-row-val">Restore progress from a saved Pingala JSON file.</div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleFileChange}
                  />
                  <button className="mobbin-btn-soft" onClick={() => fileInputRef.current?.click()}>
                    <Upload04Icon size={15} />
                    <span>Import JSON</span>
                  </button>
                </div>

                <div className="mobbin-row">
                  <div className="mobbin-row-left">
                    <div className="mobbin-row-label">Reset all progress</div>
                    <div className="mobbin-row-val">Permanently clears all completed lessons and bookmarks.</div>
                  </div>
                  <div className="mobbin-row-right">
                    {!showResetConfirm ? (
                      <button
                        className="mobbin-delete-link"
                        onClick={() => setShowResetConfirm(true)}
                      >
                        Reset
                      </button>
                    ) : (
                      <div className="mobbin-confirm-box">
                        <span>Are you sure?</span>
                        <button
                          className="mobbin-confirm-delete-btn"
                          onClick={() => {
                            onResetProgress();
                            setShowResetConfirm(false);
                          }}
                        >
                          Yes, reset
                        </button>
                        <button className="mobbin-cancel-btn" onClick={() => setShowResetConfirm(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ COMMUNITY TAB ══ */}
        {activeTab === 'community' && (
          <div className="settings-tab-pane">
            <div className="mobbin-section-group">
              <h2 className="mobbin-section-title">Community & Open Source</h2>
              <p className="mobbin-section-subtitle">
                Pingala is an open-source AI curriculum created for researchers, engineers, and students.
              </p>

              <div className="mobbin-rows-container" style={{ marginTop: 16 }}>
                {[
                  {
                    label: 'GitHub Repository',
                    sub: 'Star, fork, and contribute to the Pingala codebase.',
                    href: dashboardRepositoryUrl,
                  },
                  {
                    label: 'Contribute content',
                    sub: 'Add lessons, fix typos, improve mathematical derivations.',
                    href: contributionGuideUrl,
                  },
                  {
                    label: 'Report an issue',
                    sub: 'Found a bug or incorrect formula? Let us know on GitHub.',
                    href: issuesUrl,
                  },
                  {
                    label: 'Changelog',
                    sub: 'See what new courses and features have been released.',
                    href: releasesUrl,
                  },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="settings-community-link"
                  >
                    <div>
                      <div className="community-link-label">{link.label}</div>
                      <div className="community-link-sub">{link.sub}</div>
                    </div>
                    <LinkSquare02Icon size={14} color="var(--text-muted)" />
                  </a>
                ))}
              </div>

              <div className="mobbin-footer-note" style={{ marginTop: 32 }}>
                <span>Pingala is completely free and open source. No tracking, no paywalls, no proprietary lock-in.</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
