import fs from 'node:fs';
import path from 'node:path';
import { SignUpClient } from './client';

function getMobileAppScreens(): string[] {
  const mobileDir = path.join(process.cwd(), 'public', 'designs', 'Mobile Apps');
  if (!fs.existsSync(mobileDir)) return [];

  const folders = fs.readdirSync(mobileDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const screens: string[] = [];
  for (const folder of folders) {
    const folderPath = path.join(mobileDir, folder);
    const images = fs.readdirSync(folderPath)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)\.\w+$/)?.[1] || '0');
        const numB = parseInt(b.match(/(\d+)\.\w+$/)?.[1] || '0');
        return numA - numB;
      });
    const pick = images[Math.min(3, images.length - 1)];
    if (pick) {
      screens.push(`/designs/Mobile Apps/${folder}/${pick}`);
    }
  }

  return screens;
}

export default function SignUpPage() {
  const screens = getMobileAppScreens();
  return <SignUpClient covers={screens} />;
}
