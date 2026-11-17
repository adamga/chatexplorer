/* global chronicleIcons */
'use strict';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

if (localStorage.getItem('chronicle-theme') === 'light') {
  document.body.classList.add('light');
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}

function refreshIcons(root = document) {
  if (typeof chronicleIcons !== 'undefined') {
    chronicleIcons.createIcons({ root, attrs: { 'aria-hidden': 'true' } });
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to textarea selection copy
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Clipboard access was denied.');
}

const params = new URLSearchParams(window.location.search);
const jobId = params.get('job');
const testKey = params.get('test');
let currentLogs = [];
let currentHeader = '';
let pollTimer = null;

function formatLogPlainText(header, logs) {
  const lines = header ? [header, '----------------------------------------'] : [];
  for (const entry of logs) {
    lines.push(`[${entry.timestamp}] [${String(entry.level || 'info').toUpperCase()}] [${entry.step || 'op'}] ${entry.message}`);
  }
  return lines.join('\n');
}

function renderEntries(logs) {
  const container = $('#log-entries');
  const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
  if (!logs.length) {
    container.innerHTML = '<div class="empty-state">No log entries recorded yet.</div>';
    $('#log-count').textContent = '0 entries';
    return;
  }
  container.innerHTML = `<div class="log-table">${logs.map((entry) => {
    const level = String(entry.level || 'info').toLowerCase();
    const time = entry.timestamp ? entry.timestamp.replace('T', ' ').replace('Z', '') : '';
    return `<div class="log-row log-${escapeHtml(level)}"><span class="log-time">${escapeHtml(time)}</span><span class="log-level ${escapeHtml(level)}">${escapeHtml(level.toUpperCase())}</span><span class="log-step">${escapeHtml(entry.step || 'op')}</span><span class="log-msg">${escapeHtml(entry.message)}</span></div>`;
  }).join('')}</div>`;
  $('#log-count').textContent = `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`;
  if (nearBottom) container.scrollTop = container.scrollHeight;
}

function renderTestLogs() {
  try {
    const raw = localStorage.getItem(`chronicle-test-log-${testKey}`);
    if (!raw) throw new Error('Connectivity test log is no longer available.');
    const data = JSON.parse(raw);
    $('#log-eyebrow').textContent = 'CONNECTIVITY TEST LOG';
    $('#log-title').textContent = data.ok ? 'Microsoft Foundry connectivity verified' : 'Microsoft Foundry connectivity test failed';
    $('#log-meta').innerHTML = `<span class="badge${data.ok ? ' green' : ''}">${data.ok ? 'Passed' : 'Failed'}</span>${data.endpointUsed ? `<span>${escapeHtml(data.endpointUsed)}</span>` : ''}`;
    if (data.error) {
      $('#log-error-banner').hidden = false;
      $('#log-error-banner').textContent = data.error;
    }
    currentLogs = data.logs || [];
    currentHeader = `Chronicle Connectivity Test (${data.ok ? 'PASSED' : 'FAILED'})`;
    renderEntries(currentLogs);
  } catch (error) {
    $('#log-title').textContent = 'Log unavailable';
    $('#log-entries').innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function pollJob() {
  if (!jobId) {
    if (testKey) renderTestLogs();
    else {
      $('#log-title').textContent = 'No operation selected';
      $('#log-entries').innerHTML = '<div class="empty-state">Select a summary operation to view its logs.</div>';
    }
    return;
  }
  try {
    const res = await fetch(`/api/summary/jobs/${encodeURIComponent(jobId)}`);
    const job = await res.json();
    if (!res.ok) throw new Error(job.error || `HTTP ${res.status}`);

    const statusLabel = job.status === 'completed' ? 'Completed' : job.status === 'failed' ? 'Failed' : `Running (${job.progress || 0}%)`;
    const elapsedSec = (((job.completedAt || Date.now()) - job.startedAt) / 1000).toFixed(1);
    $('#log-title').textContent = job.sessionTitle || job.fileName;
    $('#log-meta').innerHTML = `<span class="badge${job.status === 'completed' ? ' green' : ''}">${escapeHtml(statusLabel)}</span><span>${escapeHtml(job.fileName)}</span><span>${elapsedSec} s</span>`;
    $('#log-output-path').textContent = job.outputPath || '';

    if (job.error) {
      $('#log-error-banner').hidden = false;
      $('#log-error-banner').textContent = job.error;
    } else {
      $('#log-error-banner').hidden = true;
    }

    currentLogs = job.logs || [];
    currentHeader = `Session: ${job.sessionTitle}\nOutput: ${job.outputPath}\nStatus: ${job.status.toUpperCase()} (${elapsedSec}s)`;
    renderEntries(currentLogs);

    if (job.status === 'running') {
      pollTimer = setTimeout(pollJob, 500);
    }
  } catch (error) {
    $('#log-error-banner').hidden = false;
    $('#log-error-banner').textContent = error.message;
  }
}

$('#copy-log-button').addEventListener('click', async () => {
  try {
    const text = formatLogPlainText(currentHeader, currentLogs);
    await copyTextToClipboard(text);
    toast('Operation log copied to clipboard');
  } catch (error) {
    toast(`Could not copy log: ${error.message}`);
  }
});

$('#close-log-button').addEventListener('click', () => {
  clearTimeout(pollTimer);
  window.close();
});

refreshIcons();
pollJob();
