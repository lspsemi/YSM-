import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const source = path.resolve(projectRoot, '..', '模型测试用例', '[香奈美]-重制');
const destination = path.resolve(projectRoot, 'public', 'assets', 'model-shanami');

async function copyDirectory(from, to) {
  await mkdir(to, { recursive: true });
  let count = 0;
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const input = path.join(from, entry.name);
    const output = path.join(to, entry.name);
    if (entry.isDirectory()) count += await copyDirectory(input, output);
    else if (entry.isFile()) { await copyFile(input, output); count += 1; }
  }
  return count;
}

try {
  if (!(await stat(source)).isDirectory()) throw new Error('模型路径不是文件夹');
  const files = await copyDirectory(source, destination);
  console.log(`已同步默认模型 [香奈美]-重制（${files} 个文件）`);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn('未找到模型测试用例目录，使用项目内已有的默认模型副本。');
  } else {
    throw error;
  }
}
