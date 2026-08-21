import React from 'react';
import { usePageTitle } from '../../utils/pageMeta';

interface NotFoundPageProps {
  onNavigateHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigateHome }) => {
  usePageTitle('Page not found');

  return (
    <div className="notfound-page">
      <span className="notfound-code">404</span>
      <h1 className="notfound-title">This lesson does not exist</h1>
      <p className="notfound-desc">
        The link may be outdated, or the lesson has not been contributed yet.
      </p>
      <button className="saved-empty-explore-btn" onClick={onNavigateHome}>
        Back to courses
      </button>
    </div>
  );
};
