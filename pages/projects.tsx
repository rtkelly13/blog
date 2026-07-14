import { FolderGit2 } from 'lucide-react';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
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
        <PageHeader
          title="PROJECTS"
          icon={FolderGit2}
          subtitle="Open source projects and tools I build and maintain"
        />

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
