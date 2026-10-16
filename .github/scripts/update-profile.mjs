import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const marker = '{{RECENT_ACTIVITY}}';
const start = '<!--RECENT_ACTIVITY:START-->';
const end = '<!--RECENT_ACTIVITY:END-->';

export function localDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

function repoName(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) ? value : null;
}

function escapeText(value) {
  return String(value).replace(/[\r\n]/g, ' ').replace(/[\\`*_{}\[\]()#+.!|<>]/g, '\\$&');
}

export function summarizeEvents(events, username, profileRepository) {
  const seen = new Set();
  const result = [];
  const sorted = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  for (const event of sorted) {
    const repo = repoName(event.repo?.name);
    const date = localDate(event.created_at);
    if (event.public !== true || !repo || !date) continue;
    if (event.actor?.login?.toLowerCase() !== username.toLowerCase()) continue;
    if (repo.toLowerCase() === profileRepository.toLowerCase()) continue;
    const url = `https://github.com/${repo}`;
    const link = `[${escapeText(repo)}](${url})`;
    const payload = event.payload ?? {};
    let text;
    let key;

    if (event.type === 'PushEvent') {
      text = `更新了 ${link}`;
      key = `push:${repo}:${date}`;
    } else if (event.type === 'ReleaseEvent' && payload.action === 'published') {
      const tag = payload.release?.tag_name;
      if (typeof tag !== 'string' || !tag) continue;
      text = `发布了 [${escapeText(repo)} · ${escapeText(tag)}](${url}/releases/tag/${encodeURIComponent(tag)})`;
      key = `release:${repo}:${tag}`;
    } else if (event.type === 'PullRequestEvent') {
      const number = payload.pull_request?.number ?? payload.number;
      if (!Number.isInteger(number) || number < 1) continue;
      const labels = { opened: '发起了', reopened: '重新打开了', closed: payload.pull_request?.merged ? '合并了' : '关闭了' };
      if (!labels[payload.action]) continue;
      text = `${labels[payload.action]} [${escapeText(repo)} #${number}](${url}/pull/${number})`;
      key = `pr:${repo}:${number}:${payload.action}`;
    } else if (event.type === 'IssuesEvent') {
      const number = payload.issue?.number;
      const labels = { opened: '提出了', reopened: '重新打开了', closed: '关闭了' };
      if (!Number.isInteger(number) || number < 1 || !labels[payload.action]) continue;
      text = `${labels[payload.action]} [${escapeText(repo)} #${number}](${url}/issues/${number})`;
      key = `issue:${repo}:${number}:${payload.action}`;
    } else if (event.type === 'CreateEvent' && payload.ref_type === 'repository') {
      text = `创建了 ${link}`;
      key = `create:${repo}`;
    }

    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(`| ${date} | ${text} |`);
    if (result.length === 5) break;
  }
  return result.length ? ['| 日期 | 公开动态 |', '| --- | --- |', ...result].join('\n') : null;
}

export function summarizeRepos(repos, username, profileRepository) {
  const rows = repos
    .filter(repo => repo.private === false && !repo.fork && !repo.archived)
    .filter(repo => repo.owner?.login?.toLowerCase() === username.toLowerCase())
    .filter(repo => repoName(repo.full_name) && repo.full_name.toLowerCase() !== profileRepository.toLowerCase())
    .filter(repo => localDate(repo.pushed_at))
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 5)
    .map(repo => `| ${localDate(repo.pushed_at)} | [${escapeText(repo.full_name)}](https://github.com/${repo.full_name}) |`);
  return rows.length ? ['最近更新的项目：', '', '| 最近推送 | 项目 |', '| --- | --- |', ...rows].join('\n') : null;
}

export function renderProfile(template, activity) {
  if (template.split(marker).length !== 2) throw new Error('The profile template must contain exactly one activity marker.');
  return template.replace(marker, `${start}\n${activity}\n${end}`);
}

export function previousActivity(readme) {
  const from = readme.indexOf(start);
  const to = readme.indexOf(end, from + start.length);
  return from >= 0 && to > from ? readme.slice(from + start.length, to).trim() : null;
}

async function fetchGithub(endpoint, token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'lizhouai-profile' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com${endpoint}`, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Expected a GitHub list response.');
  return data;
}

export async function updateProfile({ root, username, profileRepository, token }) {
  if (!/^[A-Za-z0-9-]+$/.test(username)) throw new Error('Invalid GitHub username.');
  const templatePath = path.join(root, 'profile.md');
  const outputPath = path.join(root, 'README.md');
  const [template, previous] = await Promise.all([
    readFile(templatePath, 'utf8'),
    readFile(outputPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; }),
  ]);
  const owner = encodeURIComponent(username);
  const [events, repos] = await Promise.allSettled([
    fetchGithub(`/users/${owner}/events/public?per_page=100`, token),
    fetchGithub(`/users/${owner}/repos?type=owner&sort=pushed&per_page=100`, token),
  ]);
  let activity = events.status === 'fulfilled' ? summarizeEvents(events.value, username, profileRepository) : null;
  if (!activity && repos.status === 'fulfilled') activity = summarizeRepos(repos.value, username, profileRepository);
  if (!activity && (events.status === 'rejected' || repos.status === 'rejected')) {
    activity = previousActivity(previous);
    if (!activity) throw new Error('GitHub activity is unavailable and there is no previous activity to preserve.');
    console.warn('GitHub activity is temporarily unavailable; keeping the previous activity.');
  }
  activity ??= '正在积累新的公开项目动态。';
  const output = renderProfile(template, activity);
  if (output === previous) {
    console.log('Profile is already up to date.');
    return false;
  }
  await writeFile(outputPath, output, 'utf8');
  console.log('Profile refreshed using public GitHub activity.');
  return true;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.env.PROFILE_ROOT || '.');
  const username = process.env.PROFILE_USERNAME || 'lizhouai';
  const profileRepository = process.env.PROFILE_REPOSITORY || `${username}/${username}`;
  updateProfile({ root, username, profileRepository, token: process.env.GITHUB_TOKEN }).catch(() => {
    console.error('Profile update failed. The previous README has been preserved.');
    process.exitCode = 1;
  });
}
