import React from 'react';
export { SettingsPage } from './SettingsPage';

export const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  completedTopicsCount: number;
  bookmarkedTopicsCount: number;
  totalTopicsCount: number;
  onResetProgress: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
}> = () => null;
