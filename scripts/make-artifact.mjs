// 將 dist-single/index.html 轉成不含 <html>/<head>/<body> 外框的頁面內容（供嵌入式頁面發佈使用）。
// 用法：node scripts/make-artifact.mjs [輸出路徑]
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
const out = process.argv[2] ?? 'dist-single/artifact.html';

const lines = src.split('\n');
const headEnd = lines.findIndex((l) => l.trim() === '</head>');
if (headEnd < 0) throw new Error('找不到 </head>');
const head = lines.slice(0, headEnd).join('\n');
const tail = lines.slice(headEnd + 1).join('\n');

const pick = (re, s) => {
  const m = s.match(re);
  if (!m) throw new Error(`找不到 ${re}`);
  return m[0];
};

const title = pick(/<title>[\s\S]*?<\/title>/, head);
const fonts = pick(/<link\s+rel="stylesheet"[\s\S]*?\/>/, head);
const styleStart = head.indexOf('<style');
const style = head.slice(styleStart, head.indexOf('</style>', styleStart) + '</style>'.length);
const scriptStart = head.indexOf('<script type="module"');
const script = head.slice(scriptStart, styleStart).trim();
if (!script.endsWith('</script>')) throw new Error('script 區塊解析失敗');
if (!/<div id="root"><\/div>/.test(tail)) throw new Error('找不到 #root');

const page = [title, fonts, style, '<div id="root"></div>', script].join('\n');
writeFileSync(out, page);
console.log(`已寫入 ${out}（${(page.length / 1024).toFixed(0)} KB）`);
