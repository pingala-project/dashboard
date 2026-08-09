export const PROJECT_CONFIG = {
  organization: 'pingala-project',
  dashboardRepository: 'dashboard',
  landingRepository: 'landing',
  curriculumRepository: 'ai-ml',
} as const;

export const dashboardRepositoryUrl = `https://github.com/${PROJECT_CONFIG.organization}/${PROJECT_CONFIG.dashboardRepository}`;
export const contributionGuideUrl = `${dashboardRepositoryUrl}/blob/main/CONTRIBUTING.md`;
export const issuesUrl = `${dashboardRepositoryUrl}/issues`;
export const releasesUrl = `${dashboardRepositoryUrl}/releases`;
