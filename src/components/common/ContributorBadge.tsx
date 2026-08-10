import React from 'react';
import type { Contributor } from '../../types/curriculum';
import { GithubIcon, LinkSquare02Icon } from 'hugeicons-react';

interface ContributorBadgeProps {
  contributor?: Contributor;
  variant?: 'inline' | 'card';
  label?: string;
}

export const ContributorBadge: React.FC<ContributorBadgeProps> = ({
  contributor = {
    name: 'Pingala Contributors',
    github: 'pingala-project',
    role: 'Maintainer',
  },
  variant = 'card',
  label = 'Contributed by',
}) => {
  const avatarUrl = contributor.avatarUrl || `https://github.com/${contributor.github}.png?size=96`;
  const githubProfileUrl = `https://github.com/${contributor.github}`;

  if (variant === 'inline') {
    return (
      <a
        href={githubProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="contributor-inline-badge"
        title={`View @${contributor.github} on GitHub`}
      >
        <img 
          src={avatarUrl} 
          alt={contributor.name} 
          className="contributor-avatar-sm"
          onError={(e) => {
            // fallback if avatar image fails
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <span className="contributor-inline-name">@{contributor.github}</span>
      </a>
    );
  }

  return (
    <div className="contributor-card-box">
      <div className="contributor-card-left">
        <img 
          src={avatarUrl} 
          alt={contributor.name} 
          className="contributor-avatar-lg"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="contributor-info-col">
          <div className="contributor-role-tag">{label}</div>
          <div className="contributor-name-row">
            <a
              href={githubProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="contributor-full-name contributor-name-link"
            >
              {contributor.name}
            </a>
          </div>
          <p className="contributor-subtext">
            Pingala Curriculum Contributor
          </p>
        </div>
      </div>

      <a
        href={githubProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="contributor-github-btn"
        title={`Open @${contributor.github} on GitHub`}
      >
        <GithubIcon size={16} />
        <span>@{contributor.github}</span>
        <LinkSquare02Icon size={14} color="#94A3B8" />
      </a>
    </div>
  );
};
