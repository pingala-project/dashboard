import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Pingala';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Free, community-built AI & ML curriculum`;
  }, [title]);
}

/**
 * Scrolls to the top on navigation, preserving in-page (#hash) jumps.
 * Targets both the window and the inner course-workspace scroller.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
    document.querySelector('.course-workspace-main')?.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
