export const homePath = '/';

export const savedPath = '/saved';

export const settingsPath = '/settings';

const encodeSegment = (value: string) => encodeURIComponent(value);

export const coursePath = (courseId: string) => `/courses/${encodeSegment(courseId)}`;

export const topicPath = (courseId: string, topicId: string) =>
  `/courses/${encodeSegment(courseId)}/topics/${encodeSegment(topicId)}`;
