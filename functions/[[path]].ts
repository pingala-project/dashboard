import type { PagesFunction } from '@cloudflare/workers-types';

type AppEnv = Env & {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  PUBLIC_APP_ORIGIN?: string;
};

interface UserRow {
  id: string;
  github_id: string;
  github_login: string;
  github_email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  learning_goal: string;
}

interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
}

interface SessionUser {
  id: string;
  githubId: string;
  login: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  bio: string;
  learningGoal: string;
}

interface SettingsPayload {
  profile?: { email?: string };
  appearance?: { theme?: 'light' | 'dark' | 'system'; codeTheme?: 'onedark' | 'github' | 'monokai' };
  display?: { fontFamily?: 'sans' | 'serif' | 'mono' | 'handwritten' | 'atkinson' | 'lexend'; fontSize?: 'compact' | 'standard' | 'large'; readingWidth?: 'standard' | 'spacious'; enableLineNumbers?: boolean };
  learning?: { confettiEnabled?: boolean; autoAdvanceOnComplete?: boolean; instantQuizFeedback?: boolean; copyCodeWithComments?: boolean };
  accentColor?: string;
}

interface NoteRow {
  id: string;
  topic_id: string;
  source_text: string;
  note_text: string;
  style: 'plain' | 'highlight' | 'circle' | 'strike';
  color: string;
  selection_start: number | null;
  selection_end: number | null;
  created_at: number;
  updated_at: number;
}

const SESSION_COOKIE = 'pingala_session';
const OAUTH_COOKIE = 'pingala_oauth_state';
const CSRF_COOKIE = 'pingala_csrf';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const OAUTH_TTL_MS = 1000 * 60 * 10;
const TOPIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,99}$/i;
const NOTE_ID_PATTERN = /^[a-f0-9-]{20,80}$/i;

function now() {
  return Date.now();
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function digest(value: string, secret?: string) {
  const bytes = new TextEncoder().encode(value);
  if (!secret) return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes)));
}

function cookieOptions(request: Request, maxAge: number, httpOnly = true) {
  const secure = new URL(request.url).protocol === 'https:';
  return `Path=/; Max-Age=${maxAge};${httpOnly ? ' HttpOnly;' : ''} SameSite=Lax${secure ? '; Secure' : ''}`;
}

function setCookie(request: Request, name: string, value: string, maxAge: number, httpOnly = true) {
  return `${name}=${encodeURIComponent(value)}; ${cookieOptions(request, maxAge, httpOnly)}`;
}

function clearCookie(request: Request, name: string) {
  return `${name}=; ${cookieOptions(request, 0)}`;
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get('Cookie') || '';
  const item = cookies.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function csrfFailure(request: Request) {
  const cookieToken = getCookie(request, CSRF_COOKIE);
  const headerToken = request.headers.get('X-CSRF-Token');
  return cookieToken && headerToken && cookieToken === headerToken
    ? null
    : errorResponse('CSRF validation failed', 403);
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function errorResponse(message: string, status: number) {
  return json({ error: message }, status);
}

function redirect(request: Request, location: string, headers: HeadersInit = {}) {
  return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

function appOrigin(request: Request, env: AppEnv) {
  return env.PUBLIC_APP_ORIGIN || new URL(request.url).origin;
}

function isConfigured(env: AppEnv) {
  return Boolean(env.DB && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET);
}

async function parseJson(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > maxBytes) throw new Error('Request body is too large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('Request body is too large');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request body must be a JSON object');
  return value as Record<string, unknown>;
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>) {
  return typeof value === 'string' && allowed.has(value as T) ? value as T : undefined;
}

function normalizeSettings(value: unknown): SettingsPayload {
  if (!isRecord(value)) throw new Error('Settings must be an object');
  const profile = isRecord(value.profile) ? value.profile : undefined;
  const appearance = isRecord(value.appearance) ? value.appearance : undefined;
  const display = isRecord(value.display) ? value.display : undefined;
  const learning = isRecord(value.learning) ? value.learning : undefined;
  const normalized: SettingsPayload = {};
  const themes = new Set(['light', 'dark', 'system'] as const);
  const codeThemes = new Set(['onedark', 'github', 'monokai'] as const);
  const fonts = new Set(['sans', 'serif', 'mono', 'handwritten', 'atkinson', 'lexend'] as const);
  const sizes = new Set(['compact', 'standard', 'large'] as const);
  const widths = new Set(['standard', 'spacious'] as const);

  if (profile && typeof profile.email === 'string') normalized.profile = { email: cleanString(profile.email, 240) };
  if (appearance) normalized.appearance = {
    ...(enumValue(appearance.theme, themes) ? { theme: enumValue(appearance.theme, themes) } : {}),
    ...(enumValue(appearance.codeTheme, codeThemes) ? { codeTheme: enumValue(appearance.codeTheme, codeThemes) } : {}),
  };
  if (display) normalized.display = {
    ...(enumValue(display.fontFamily, fonts) ? { fontFamily: enumValue(display.fontFamily, fonts) } : {}),
    ...(enumValue(display.fontSize, sizes) ? { fontSize: enumValue(display.fontSize, sizes) } : {}),
    ...(enumValue(display.readingWidth, widths) ? { readingWidth: enumValue(display.readingWidth, widths) } : {}),
    ...(typeof display.enableLineNumbers === 'boolean' ? { enableLineNumbers: display.enableLineNumbers } : {}),
  };
  if (learning) normalized.learning = {
    ...(typeof learning.confettiEnabled === 'boolean' ? { confettiEnabled: learning.confettiEnabled } : {}),
    ...(typeof learning.autoAdvanceOnComplete === 'boolean' ? { autoAdvanceOnComplete: learning.autoAdvanceOnComplete } : {}),
    ...(typeof learning.instantQuizFeedback === 'boolean' ? { instantQuizFeedback: learning.instantQuizFeedback } : {}),
    ...(typeof learning.copyCodeWithComments === 'boolean' ? { copyCodeWithComments: learning.copyCodeWithComments } : {}),
  };
  if (typeof value.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.accentColor)) normalized.accentColor = value.accentColor.toLowerCase();
  return normalized;
}

function mergeSettings(current: SettingsPayload, next: SettingsPayload): SettingsPayload {
  return {
    profile: { ...current.profile, ...next.profile },
    appearance: { ...current.appearance, ...next.appearance },
    display: { ...current.display, ...next.display },
    learning: { ...current.learning, ...next.learning },
    ...(next.accentColor || current.accentColor ? { accentColor: next.accentColor || current.accentColor } : {}),
  };
}

function userPayload(user: UserRow): SessionUser {
  return {
    id: user.id,
    githubId: user.github_id,
    login: user.github_login,
    email: user.github_email,
    name: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    learningGoal: user.learning_goal,
  };
}

async function sessionUser(request: Request, env: AppEnv): Promise<SessionUser | null> {
  const rawToken = getCookie(request, SESSION_COOKIE);
  if (!rawToken || !env.DB) return null;
  const tokenHash = await digest(rawToken, env.SESSION_SECRET);
  const result = await env.DB.prepare(
    `SELECT u.id, u.github_id, u.github_login, u.github_email, u.display_name, u.avatar_url, u.bio, u.learning_goal
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(tokenHash, now()).first<UserRow>();
  return result ? userPayload(result) : null;
}

async function requireUser(request: Request, env: AppEnv): Promise<SessionUser | Response> {
  const user = await sessionUser(request, env);
  return user || errorResponse('Authentication required', 401);
}

async function githubJson<T>(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function beginGitHubLogin(request: Request, env: AppEnv) {
  if (!isConfigured(env)) return errorResponse('GitHub login is not configured yet', 503);
  const state = randomToken(32);
  const timestamp = now();
  await env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(timestamp).run();
  await env.DB.prepare('INSERT INTO oauth_states (state_hash, expires_at, created_at) VALUES (?, ?, ?)')
    .bind(await digest(state), timestamp + OAUTH_TTL_MS, timestamp)
    .run();

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: new URL('/auth/github/callback', appOrigin(request, env)).toString(),
    scope: 'read:user user:email',
    state,
  });
  return redirect(request, `https://github.com/login/oauth/authorize?${params.toString()}`, {
    'Set-Cookie': setCookie(request, OAUTH_COOKIE, state, Math.floor(OAUTH_TTL_MS / 1000)),
  });
}

async function finishGitHubLogin(request: Request, env: AppEnv) {
  if (!isConfigured(env)) return redirect(request, `${appOrigin(request, env)}/?auth_error=not_configured`);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, OAUTH_COOKIE);
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect(request, `${appOrigin(request, env)}/?auth_error=invalid_state`, { 'Set-Cookie': clearCookie(request, OAUTH_COOKIE) });
  }

  const stateHash = await digest(state);
  const storedState = await env.DB.prepare('SELECT state_hash FROM oauth_states WHERE state_hash = ? AND expires_at > ?')
    .bind(stateHash, now()).first<{ state_hash: string }>();
  await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run();
  if (!storedState) {
    return redirect(request, `${appOrigin(request, env)}/?auth_error=expired_state`, { 'Set-Cookie': clearCookie(request, OAUTH_COOKIE) });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/auth/github/callback', appOrigin(request, env)).toString(),
    }),
  });
  if (!tokenResponse.ok) return redirect(request, `${appOrigin(request, env)}/?auth_error=token_exchange`);
  const tokenData = await tokenResponse.json() as GitHubTokenResponse;
  if (!tokenData.access_token) return redirect(request, `${appOrigin(request, env)}/?auth_error=${encodeURIComponent(tokenData.error || 'token_exchange')}`);

  const profile = await githubJson<GitHubProfile>('https://api.github.com/user', tokenData.access_token);
  let githubEmail: string | null = null;
  try {
    const githubEmails = await githubJson<GitHubEmail[]>('https://api.github.com/user/emails', tokenData.access_token);
    githubEmail = githubEmails.find((entry) => entry.primary && entry.verified)?.email
      || githubEmails.find((entry) => entry.verified)?.email
      || null;
  } catch {
    // Public GitHub profiles can still authenticate if the email endpoint is unavailable.
  }
  const timestamp = now();
  const existing = await env.DB.prepare('SELECT id, github_email FROM users WHERE github_id = ?').bind(String(profile.id)).first<{ id: string; github_email: string | null }>();
  const userId = existing?.id || crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, github_id, github_login, github_email, display_name, avatar_url, bio, learning_goal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', '', ?, ?)
     ON CONFLICT(github_id) DO UPDATE SET github_login = excluded.github_login,
       github_email = excluded.github_email, display_name = excluded.display_name,
       avatar_url = excluded.avatar_url, updated_at = excluded.updated_at`,
  ).bind(userId, String(profile.id), profile.login, githubEmail || existing?.github_email || null, profile.name || profile.login, profile.avatar_url, timestamp, timestamp).run();

  const rawSession = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, await digest(rawSession, env.SESSION_SECRET), timestamp + SESSION_TTL_MS, timestamp).run();
  const headers = new Headers({ Location: `${appOrigin(request, env)}/` });
  headers.append('Set-Cookie', setCookie(request, SESSION_COOKIE, rawSession, Math.floor(SESSION_TTL_MS / 1000)));
  headers.append('Set-Cookie', clearCookie(request, OAUTH_COOKIE));
  return new Response(null, { status: 302, headers });
}

async function logout(request: Request, env: AppEnv) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const rawToken = getCookie(request, SESSION_COOKIE);
  if (rawToken && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(rawToken, env.SESSION_SECRET)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(request, SESSION_COOKIE) });
}

async function me(request: Request, env: AppEnv) {
  const user = await sessionUser(request, env);
  const headers: HeadersInit = {};
  if (!getCookie(request, CSRF_COOKIE)) headers['Set-Cookie'] = setCookie(request, CSRF_COOKIE, randomToken(24), Math.floor(SESSION_TTL_MS / 1000), false);
  return user ? json({ user }, 200, headers) : json({ user: null }, 200, headers);
}

async function updateProfile(request: Request, env: AppEnv) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  let body: Record<string, unknown>;
  try { body = await parseJson(request, 8 * 1024); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid JSON', 400); }
  const name = cleanString(body.name, 120) || result.name;
  const bio = cleanString(body.bio, 500);
  const learningGoal = cleanString(body.learningGoal, 240);
  await env.DB.prepare('UPDATE users SET display_name = ?, bio = ?, learning_goal = ?, updated_at = ? WHERE id = ?')
    .bind(name, bio, learningGoal, now(), result.id).run();
  const updated = await sessionUser(request, env);
  return updated ? json({ user: updated }) : errorResponse('Could not load updated profile', 500);
}

async function getSettings(request: Request, env: AppEnv) {
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  const row = await env.DB.prepare('SELECT payload_json FROM user_settings WHERE user_id = ?').bind(result.id).first<{ payload_json: string }>();
  if (!row) return json({ settings: null });
  try {
    return json({ settings: normalizeSettings(JSON.parse(row.payload_json)) });
  } catch {
    return json({ settings: null });
  }
}

async function updateSettings(request: Request, env: AppEnv) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  let body: Record<string, unknown>;
  try { body = await parseJson(request, 32 * 1024); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid JSON', 400); }
  let incoming: SettingsPayload;
  try { incoming = normalizeSettings(body.settings); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid settings', 400); }
  const existingRow = await env.DB.prepare('SELECT payload_json FROM user_settings WHERE user_id = ?').bind(result.id).first<{ payload_json: string }>();
  let current: SettingsPayload = {};
  if (existingRow) {
    try { current = normalizeSettings(JSON.parse(existingRow.payload_json)); } catch { current = {}; }
  }
  const payload = mergeSettings(current, incoming);
  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, payload_json, version, updated_at) VALUES (?, ?, 1, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload_json = excluded.payload_json, version = excluded.version, updated_at = excluded.updated_at`,
  ).bind(result.id, JSON.stringify(payload), now()).run();
  return json({ settings: payload });
}

async function progress(request: Request, env: AppEnv) {
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  const [completed, bookmarks] = await Promise.all([
    env.DB.prepare('SELECT topic_id FROM progress WHERE user_id = ? ORDER BY topic_id').bind(result.id).all<{ topic_id: string }>(),
    env.DB.prepare('SELECT topic_id FROM bookmarks WHERE user_id = ? ORDER BY topic_id').bind(result.id).all<{ topic_id: string }>(),
  ]);
  return json({
    completedTopicIds: completed.results.map((row) => row.topic_id),
    bookmarkedTopicIds: bookmarks.results.map((row) => row.topic_id),
  });
}

function validTopicId(topicId: string) {
  return TOPIC_ID_PATTERN.test(topicId);
}

function validNoteId(noteId: string) {
  return NOTE_ID_PATTERN.test(noteId);
}

function notePayload(row: NoteRow) {
  return {
    id: row.id,
    topicId: row.topic_id,
    sourceText: row.source_text,
    noteText: row.note_text,
    style: row.style,
    color: row.color,
    selectionStart: row.selection_start,
    selectionEnd: row.selection_end,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function noteStyle(value: unknown): NoteRow['style'] | undefined {
  return enumValue(value, new Set(['plain', 'highlight', 'circle', 'strike'] as const));
}

function noteColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#f5c84b';
}

function selectionOffset(value: unknown) {
  return value === null || value === undefined
    ? null
    : Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000
      ? Number(value)
      : undefined;
}

async function listNotes(request: Request, env: AppEnv) {
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  const topicId = new URL(request.url).searchParams.get('topicId');
  if (topicId && !validTopicId(topicId)) return errorResponse('Invalid topic id', 400);
  const query = topicId
    ? env.DB.prepare('SELECT id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at FROM reading_notes WHERE user_id = ? AND topic_id = ? ORDER BY created_at DESC').bind(result.id, topicId)
    : env.DB.prepare('SELECT id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at FROM reading_notes WHERE user_id = ? ORDER BY created_at DESC').bind(result.id);
  const rows = await query.all<NoteRow>();
  return json({ notes: rows.results.map(notePayload) });
}

async function createNote(request: Request, env: AppEnv) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  let body: Record<string, unknown>;
  try { body = await parseJson(request, 32 * 1024); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid JSON', 400); }
  const topicId = cleanString(body.topicId, 100);
  const sourceText = cleanString(body.sourceText, 1200);
  const noteText = cleanString(body.noteText, 5000);
  const style = noteStyle(body.style);
  const start = selectionOffset(body.selectionStart);
  const end = selectionOffset(body.selectionEnd);
  if (!validTopicId(topicId) || !sourceText || !style || start === undefined || end === undefined) return errorResponse('Invalid note payload', 400);
  const timestamp = now();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO reading_notes (id, user_id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, result.id, topicId, sourceText, noteText, style, noteColor(body.color), start, end, timestamp, timestamp).run();
  const row = await env.DB.prepare('SELECT id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at FROM reading_notes WHERE id = ? AND user_id = ?').bind(id, result.id).first<NoteRow>();
  return row ? json({ note: notePayload(row) }, 201) : errorResponse('Could not load created note', 500);
}

async function updateNote(request: Request, env: AppEnv, noteId: string) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  if (!validNoteId(noteId)) return errorResponse('Invalid note id', 400);
  let body: Record<string, unknown>;
  try { body = await parseJson(request, 16 * 1024); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid JSON', 400); }
  const style = body.style === undefined ? undefined : noteStyle(body.style);
  if (body.style !== undefined && !style) return errorResponse('Invalid note style', 400);
  const noteText = body.noteText === undefined ? undefined : cleanString(body.noteText, 5000);
  const color = body.color === undefined ? undefined : noteColor(body.color);
  const current = await env.DB.prepare('SELECT id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at FROM reading_notes WHERE id = ? AND user_id = ?').bind(noteId, result.id).first<NoteRow>();
  if (!current) return errorResponse('Note not found', 404);
  await env.DB.prepare(
    'UPDATE reading_notes SET note_text = ?, style = ?, color = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  ).bind(noteText === undefined ? current.note_text : noteText, style || current.style, color || current.color, now(), noteId, result.id).run();
  const updated = await env.DB.prepare('SELECT id, topic_id, source_text, note_text, style, color, selection_start, selection_end, created_at, updated_at FROM reading_notes WHERE id = ? AND user_id = ?').bind(noteId, result.id).first<NoteRow>();
  return updated ? json({ note: notePayload(updated) }) : errorResponse('Could not load updated note', 500);
}

async function deleteNote(request: Request, env: AppEnv, noteId: string) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  if (!validNoteId(noteId)) return errorResponse('Invalid note id', 400);
  const deleted = await env.DB.prepare('DELETE FROM reading_notes WHERE id = ? AND user_id = ?').bind(noteId, result.id).run();
  return deleted.meta.changes > 0 ? json({ ok: true }) : errorResponse('Note not found', 404);
}

async function syncProgress(request: Request, env: AppEnv) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  let body: Record<string, unknown>;
  try { body = await parseJson(request, 128 * 1024); } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Invalid JSON', 400); }
  const completed = Array.isArray(body.completedTopicIds) ? body.completedTopicIds.filter((id): id is string => typeof id === 'string' && validTopicId(id)).slice(0, 2000) : [];
  const bookmarked = Array.isArray(body.bookmarkedTopicIds) ? body.bookmarkedTopicIds.filter((id): id is string => typeof id === 'string' && validTopicId(id)).slice(0, 2000) : [];
  const timestamp = now();
  const statements = [
    ...[...new Set(completed)].map((topicId) => env.DB.prepare('INSERT INTO progress (user_id, topic_id, completed_at) VALUES (?, ?, ?) ON CONFLICT(user_id, topic_id) DO NOTHING').bind(result.id, topicId, timestamp)),
    ...[...new Set(bookmarked)].map((topicId) => env.DB.prepare('INSERT INTO bookmarks (user_id, topic_id, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, topic_id) DO NOTHING').bind(result.id, topicId, timestamp)),
  ];
  if (statements.length > 0) await env.DB.batch(statements);
  return progress(request, env);
}

async function toggleTopic(request: Request, env: AppEnv, topicId: string, table: 'progress' | 'bookmarks', enabled: boolean) {
  const csrfError = csrfFailure(request);
  if (csrfError) return csrfError;
  const result = await requireUser(request, env);
  if (result instanceof Response) return result;
  if (!validTopicId(topicId)) return errorResponse('Invalid topic id', 400);
  if (enabled) {
    const column = table === 'progress' ? 'completed_at' : 'created_at';
    await env.DB.prepare(`INSERT INTO ${table} (user_id, topic_id, ${column}) VALUES (?, ?, ?) ON CONFLICT(user_id, topic_id) DO NOTHING`)
      .bind(result.id, topicId, now()).run();
  } else {
    await env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ? AND topic_id = ?`).bind(result.id, topicId).run();
  }
  return json({ ok: true });
}

export const onRequest: PagesFunction<AppEnv> = async (context) => {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    if (url.pathname === '/auth/github' && request.method === 'GET') return beginGitHubLogin(request, env);
    if (url.pathname === '/auth/github/callback' && request.method === 'GET') return finishGitHubLogin(request, env);
    if (url.pathname === '/auth/logout' && request.method === 'POST') return logout(request, env);
    if (url.pathname === '/api/me' && request.method === 'GET') return me(request, env);
    if (url.pathname === '/api/me/profile' && request.method === 'PATCH') return updateProfile(request, env);
    if (url.pathname === '/api/me/settings' && request.method === 'GET') return getSettings(request, env);
    if (url.pathname === '/api/me/settings' && request.method === 'PATCH') return updateSettings(request, env);
    if (url.pathname === '/api/progress' && request.method === 'GET') return progress(request, env);
    if (url.pathname === '/api/progress/sync' && request.method === 'POST') return syncProgress(request, env);
    if (url.pathname === '/api/notes' && request.method === 'GET') return listNotes(request, env);
    if (url.pathname === '/api/notes' && request.method === 'POST') return createNote(request, env);

    const progressMatch = url.pathname.match(/^\/api\/progress\/([^/]+)$/);
    if (progressMatch && ['PUT', 'DELETE'].includes(request.method)) {
      return toggleTopic(request, env, progressMatch[1], 'progress', request.method === 'PUT');
    }
    const bookmarkMatch = url.pathname.match(/^\/api\/bookmarks\/([^/]+)$/);
    if (bookmarkMatch && ['PUT', 'DELETE'].includes(request.method)) {
      return toggleTopic(request, env, bookmarkMatch[1], 'bookmarks', request.method === 'PUT');
    }
    const noteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch && request.method === 'PATCH') return updateNote(request, env, decodeURIComponent(noteMatch[1]));
    if (noteMatch && request.method === 'DELETE') return deleteNote(request, env, decodeURIComponent(noteMatch[1]));
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return errorResponse('Not found', 404);
    return context.next();
  } catch (error) {
    console.error(JSON.stringify({ event: 'request_error', message: error instanceof Error ? error.message : 'Unknown error' }));
    return errorResponse('Internal server error', 500);
  }
};
