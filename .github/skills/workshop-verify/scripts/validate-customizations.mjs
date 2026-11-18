import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(process.argv[2] ?? process.cwd());
const agents = ['workshop-builder', 'workshop-researcher', 'workshop-producer', 'workshop-reviewer'];
const skills = ['workshop-resources', 'workshop-design', 'workshop-labs', 'workshop-media', 'workshop-verify'];
const errors = [];
let checked = 0;

for (const [kind, names] of [['agents', agents], ['skills', skills]]) {
  for (const name of names) {
    const file = join(root, '.github', kind, kind === 'agents' ? `${name}.agent.md` : `${name}/SKILL.md`);
    if (!existsSync(file)) { errors.push(`Missing ${kind}/${name}`); continue; }
    checked++;
    const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const front = text.match(/^---\n([\s\S]+?)\n---\n/);
    if (!front) { errors.push(`Missing frontmatter: ${name}`); continue; }
    if (!front[1].includes(`name: ${name}\n`)) errors.push(`Name mismatch: ${name}`);
    const description = front[1].match(/^description: "([^\n]+)"$/m);
    if (!description || description[1].length > 1024) errors.push(`Missing quoted description or overlong description: ${name}`);
    if (kind === 'agents' && !/^tools: \[.+\]$/m.test(front[1])) errors.push(`Missing tools list: ${name}`);
    for (const [, link] of text.matchAll(/\]\((\.\/[\w./-]+)\)/g)) {
      if (!existsSync(resolve(dirname(file), link))) errors.push(`Broken skill resource: ${name}: ${link}`);
    }
    if (text.split('\n').length > 500) errors.push(`Customization too large: ${name}`);
  }
}

try {
  execFileSync('git', ['check-ignore', '--no-index', 'resourceinfo.txt'], { cwd: root, stdio: 'pipe' });
  const tracked = execFileSync('git', ['ls-files', '--', 'resourceinfo.txt'], { cwd: root, encoding: 'utf8' }).trim();
  if (tracked) errors.push('resourceinfo.txt is tracked; remove from version control and assess credential exposure.');
} catch { errors.push('resourceinfo.txt must be ignored in this repository.'); }

// Include file count for deterministic evidence, not file contents (the registry is never opened here).
const helper = join(root, '.github/skills/workshop-resources/tests');
const tests = existsSync(helper) ? readdirSync(helper).filter(f => f.endsWith('.test.mjs')).length : 0;
if (!tests) errors.push('Missing resource-helper tests.');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Validated ${checked} customizations, linked resources and secret-registry Git hygiene.`);
