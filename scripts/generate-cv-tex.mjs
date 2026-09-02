import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const profile = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data/about/profile.json'), 'utf8'),
);
const skills = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data/about/skills.json'), 'utf8'),
);
const experience = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data/about/experience.json'), 'utf8'),
);
const education = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data/about/education.json'), 'utf8'),
);

function escapeLatex(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// Generate LaTeX skills list for sidebar
const skillsLatex = skills
  .map((cat) => {
    const items = cat.items
      .map((i) => `    \\item ${escapeLatex(i)}`)
      .join('\n');
    return `    {\\textbf{${escapeLatex(cat.category)}}}\n    {\\begin{itemize}[leftmargin=*,itemsep=0.5pt,topsep=1pt,partopsep=0pt,parsep=0pt]\n${items}\n    \\end{itemize}}`;
  })
  .join('\n    \\vspace{1mm}\n');

// Generate LaTeX Experience
const experienceLatex = experience
  .map((job) => {
    const periodParts = job.period.split(' - ');
    const fromDate = periodParts[0] ? `${periodParts[0]} -` : '';
    const toDate = periodParts[1] || '';

    const highlights = job.highlights
      .map((h) => `             \\item ${escapeLatex(h)}`)
      .join('\n');

    return `    \\twentyitem
        {${fromDate}}
        {${toDate}}
        {${escapeLatex(job.role)}}
        {\\href{${job.companyUrl}}{${escapeLatex(job.company)}}}
        {}
        {
          \\begin{itemize}[leftmargin=*,itemsep=0.5pt,topsep=1pt,partopsep=0pt,parsep=0pt]
${highlights}
          \\end{itemize}
          \\vspace{1mm}
        }`;
  })
  .join('\n\n');

// Generate LaTeX Education
const educationLatex = education
  .map((edu) => {
    const details = edu.details
      ? `\n             ${escapeLatex(edu.details)} \\vspace{1mm}`
      : '';
    const grade = edu.grade ? `{\\textbf{${escapeLatex(edu.grade)}}}` : '{}';

    return `    \\twentyitem
        {${escapeLatex(edu.period)}}
        {}
        {${escapeLatex(edu.qualification)}}
        {\\href{${edu.institutionUrl}}{${escapeLatex(edu.institution)}}}
        ${grade}
        {${details}}`;
  })
  .join('\n\n');

const texContent = `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Twenty Seconds Resume/CV
% Auto-generated from data/about/*.json via scripts/generate-cv-tex.mjs
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\documentclass[letterpaper]{twentysecondcv}

% Command for printing skill overview
\\newcommand\\skils{
    \\href{https://github.com/Resultful}{Open source projects under organisation \\textbf{Resultful} for functional .NET.}
    
    \\vspace{1.5mm}
    \\href{https://www.youtube.com/playlist?list=PLo9sP7bLtjB4v80KxhT-2J3kx5HWZ_b9C}{Speaker on F\\#, .NET architecture, and functional engineering.}
    
    \\vspace{1.5mm}
${skillsLatex}
}

% Projects and references sidebar text
\\projects{
\\textbf{Robert Roe} --- Tech Lead at Zuto \\\\
\\textbf{\\href{https://www.linkedin.com/in/dan-cartwright-23b30b38/}{Dan Cartwright}} --- Product Manager at AutoCoding Systems \\\\
\\vspace{1mm}
\\textbf{Contact Details:} Provided on request
}

%----------------------------------------------------------------------------------------
%	 PERSONAL INFORMATION
%----------------------------------------------------------------------------------------

\\cvname{${escapeLatex(profile.name.toUpperCase())}}
\\cvjobtitle{ ${escapeLatex(profile.role)} }

\\cvlinkedin{/in/rtkelly94/}
\\cvgithub{rtkelly13}
\\cvnumberphone{}
\\cvmail{${profile.social.email}}

%----------------------------------------------------------------------------------------

\\begin{document}

\\makeprofile % Print the sidebar

%----------------------------------------------------------------------------------------
%	 Personal Profile
%----------------------------------------------------------------------------------------

\\section{Personal Profile}

${escapeLatex(profile.summary)}

\\vspace{2mm}

%----------------------------------------------------------------------------------------
%	 Employment
%----------------------------------------------------------------------------------------
\\section{Employment History}
\\begin{twenty}
${experienceLatex}
\\end{twenty}

%----------------------------------------------------------------------------------------
%	 Education
%----------------------------------------------------------------------------------------
\\section{Education}
\\begin{twenty}
${educationLatex}
\\end{twenty}

\\end{document}
`;

fs.writeFileSync(path.join(rootDir, 'cv/template.tex'), texContent, 'utf8');
console.log('✓ Successfully generated cv/template.tex from data/about/*.json');
