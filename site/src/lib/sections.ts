import { marked } from 'marked';

const allowed = ['The problem', 'What it does', 'How it was built', 'What we learned'];

interface Section {
  heading: string;
  html: string;
}

interface BodyContent {
  intro: string;
  sections: Section[];
}

export function sectionsFromBody(body: string): BodyContent {
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) return { intro: '', sections: [] };

  const sections: { heading: string; lines: string[] }[] = [];
  const introLines: string[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of text.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { heading: heading[1].trim(), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  const intro = marked.parse(introLines.join('\n').trim(), { async: false }) as string;

  return {
    intro: intro.trim() === '' ? '' : intro,
    sections: sections
      .filter((section) => allowed.includes(section.heading))
      .map((section) => ({
        heading: section.heading,
        html: marked.parse(section.lines.join('\n').trim(), { async: false }) as string,
      }))
      .filter((section) => section.html.trim() !== ''),
  };
}
