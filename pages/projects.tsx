import { ExternalLink, FolderGit2 } from 'lucide-react';
import { useState } from 'react';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import { GithubIcon } from '@/components/social-icons/icons';
import projectsData from '@/data/projectsData';
import siteMetadata from '@/data/siteMetadata';

type CategoryFilter = 'all' | 'libraries' | 'tooling' | 'applications';

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Projects' },
  { id: 'libraries', label: 'Libraries & Compilers' },
  { id: 'tooling', label: 'Tooling & Infrastructure' },
  { id: 'applications', label: 'Apps & Platforms' },
];

export default function Projects() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredProjects =
    activeCategory === 'all'
      ? projectsData
      : projectsData.filter((p) => p.category === activeCategory);

  return (
    <>
      <PageSEO
        title={`Projects - ${siteMetadata.author}`}
        description="Open source projects, libraries, and developer tooling by Ryan Kelly."
      />
      <div className="divide-y divide-white border-2 border-white bg-black font-mono">
        <PageHeader
          title="PROJECTS"
          icon={FolderGit2}
          subtitle="Open source libraries, compilers, and developer tooling I build and maintain."
        />

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 bg-zinc-950 gap-4 border-b-2 border-white">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors border-2 ${
                    isActive
                      ? 'bg-brutalist-cyan text-black border-brutalist-cyan shadow-glow-cyan'
                      : 'bg-black text-zinc-400 border-zinc-700 hover:border-white hover:text-white'
                  }`}
                >
                  [ {cat.label} ]
                </button>
              );
            })}
          </div>

          <a
            href={siteMetadata.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 border-2 border-brutalist-pink bg-black text-white hover:bg-brutalist-pink hover:text-black transition-colors text-xs font-bold uppercase tracking-wider shadow-glow-pink self-start sm:self-auto"
          >
            <GithubIcon className="w-3.5 h-3.5 fill-current" />
            <span>GitHub Profile</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Projects Grid */}
        <div className="py-10 px-4 sm:px-6">
          <div className="-m-4 flex flex-wrap">
            {filteredProjects.map((project) => (
              <Card
                key={project.title}
                title={project.title}
                description={project.description}
                imgSrc={project.imgSrc}
                href={project.href}
                filename={project.filename}
                asciiArt={project.asciiArt}
                badge={project.badge}
                accent={project.accent}
              >
                {project.tags && (
                  <div className="mt-4 mb-4 flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
