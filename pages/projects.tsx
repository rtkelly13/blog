import { FolderGit2 } from 'lucide-react';
import Card from '@/components/Card';
import { PageSEO } from '@/components/SEO';
import projectsData from '@/data/projectsData';
import siteMetadata from '@/data/siteMetadata';

export default function Projects() {
  return (
    <>
      <PageSEO
        title={`Projects - ${siteMetadata.author}`}
        description="Open source projects and tools"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="pt-8 pb-10 px-6 bg-zinc-900">
          <div className="flex items-center gap-4 mb-4">
            <FolderGit2 className="w-10 h-10 text-brutalist-cyan" />
            <h1 className="text-4xl font-display font-bold uppercase text-white md:text-6xl">
              [ PROJECTS ]
            </h1>
          </div>
          <p className="text-lg font-mono text-zinc-400 mt-4">
            <span className="text-brutalist-yellow">&gt;</span> Open source
            projects and tools I build and maintain
          </p>
        </div>

        <div className="py-12 px-2">
          <div className="-m-4 flex flex-wrap">
            {projectsData.map((project) => (
              <Card
                key={project.title}
                title={project.title}
                description={project.description}
                imgSrc={project.imgSrc}
                href={project.href}
                filename={project.filename}
                asciiArt={project.asciiArt}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
