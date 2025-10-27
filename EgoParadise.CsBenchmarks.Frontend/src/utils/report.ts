export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Split a GitHub-style table row, preserving empty leading/trailing cells and inner empties
function splitTableRow(row: string): string[] {
  // Don't trim the whole row; we need to preserve leading/trailing empties
  // Remove a single leading and trailing pipe if present
  const trimmed = row.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
  return trimmed.split('|').map(c => c.trim());
}

function isTableDivider(line: string): boolean {
  // Accept variations like ---, :---, ---:, :---: with optional surrounding pipes/spaces
  if (!line.includes('-') && !line.includes('|')) return false;
  const cells = splitTableRow(line);
  if (cells.length === 0) return false;
  return cells.every(c => /^:?-{3,}:?$/.test(c));
}

// Normalize row to column count, padding with empty strings
function normalizeRow(row: string[], columns: number): string[] {
  if (row.length < columns) return row.concat(Array(columns - row.length).fill(''));
  if (row.length > columns) return row.slice(0, columns);
  return row;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripOuterSingleQuotesSmart(s: string): string {
  // Case 1: Bold wrapped content with quotes inside **'text'**
  const boldQuoted = /^\s*\*\*'(.*?)'\*\*\s*$/.exec(s);
  if (boldQuoted) return `**${boldQuoted[1]}**`;
  // Case 2: Plain quoted 'text'
  const plainQuoted = /^\s*'(.*?)'\s*$/.exec(s);
  if (plainQuoted) return plainQuoted[1];
  return s;
}

function renderInlineMdLimited(s: string): string {
  // Decode any pre-encoded entities first, then strip surrounding single quotes (also inside ** **)
  const decoded = stripOuterSingleQuotesSmart(decodeHtml(s));
  // Escape to prevent HTML injection
  const escaped = escapeHtml(decoded);
  // Support bold (**...**) inside tables
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Render only fenced code blocks and GitHub Markdown tables; other lines become simple paragraphs
export function renderGithubPartial(md: string): string {
  const lines = md.split('\n');
  let i = 0;
  let out = '';
  while (i < lines.length) {
    const line = lines[i];
    // fenced code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      i++;
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      if (i < lines.length && lines[i].startsWith('```')) i++;
      out += `<pre><code class="language-${lang}">${escapeHtml(code.join('\n'))}</code></pre>`;
      continue;
    }
    // tables
    if (line.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = splitTableRow(line);
      const columnCount = headers.length;
      i += 2; // skip header and divider
      const rows: string[][] = [];
      while (i < lines.length) {
        const rline = lines[i];
        if (!rline.includes('|')) break;
        if (rline.trim() === '') break;
        const row = splitTableRow(rline);
        rows.push(normalizeRow(row, columnCount));
        i++;
      }
      out += '<table><thead><tr>' + headers.map(h => `<th>${renderInlineMdLimited(h)}</th>`).join('') + '</tr></thead>';
      out += '<tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${renderInlineMdLimited(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
      continue;
    }
    // paragraphs (only non-empty)
    if (line.trim() !== '') {
      out += `<p>${escapeHtml(line)}</p>`;
    }
    i++;
  }
  return out;
}


