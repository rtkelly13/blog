import {
  Briefcase,
  Download,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import BracketText from '@/components/BracketText';
import Image from '@/components/Image';
import { PageSEO } from '@/components/SEO';
import SocialIcon from '@/components/social-icons';
import educationData from '@/data/about/education.json';
import experienceData from '@/data/about/experience.json';
import profileData from '@/data/about/profile.json';
import skillsData from '@/data/about/skills.json';
import projectsData from '@/data/projectsData';

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      profile: profileData,
      skills: skillsData,
      experience: experienceData,
      education: educationData,
      projects: projectsData,
    },
  };
};

export default function About({
  profile,
  skills,
  experience,
  education,
  projects,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO
        title={`About & CV - ${profile.name}`}
        description={`${profile.name} - ${profile.role}. Background, technical experience, open source projects, and downloadable CV.`}
      />

      <div className="space-y-10 pt-6 pb-12 font-mono">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b-2 border-zinc-800 pb-8 gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold leading-tight tracking-widest text-white uppercase sm:text-4xl md:text-5xl">
              <BracketText>ABOUT_ME</BracketText>
            </h1>
            <p className="text-sm text-zinc-400 mt-2">
              Software Engineer · Cloud & Data Architect · Open Source
              Contributor
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/cv.pdf"
              download="Ryan_Kelly_CV.pdf"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-brutalist-cyan bg-zinc-950 hover:bg-brutalist-cyan hover:text-black transition-colors font-bold uppercase text-xs tracking-wider shadow-glow-cyan text-white"
            >
              <Download className="w-4 h-4" />
              Download CV (PDF)
            </a>
          </div>
        </div>

        {/* Profile Card & Bio */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="flex flex-col items-center bg-black/80 border-2 border-brutalist-pink shadow-glow-pink p-6 rounded-md text-center">
            <Image
              src="/static/images/myprofile.jpg"
              alt="avatar"
              width="192"
              height="192"
              className="w-44 h-44 border-2 border-white object-cover rounded"
            />
            <h2 className="pt-4 pb-1 text-2xl font-bold uppercase text-white tracking-wider">
              {profile.name}
            </h2>
            <div className="text-brutalist-cyberOrange font-bold text-xs mb-1">
              &gt; {profile.role}
            </div>
            <div className="text-zinc-400 text-xs">{profile.location}</div>

            <div className="flex pt-6 space-x-4">
              <SocialIcon kind="mail" href={`mailto:${profile.social.email}`} />
              <SocialIcon kind="github" href={profile.social.github} />
              <SocialIcon kind="linkedin" href={profile.social.linkedin} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6 flex flex-col justify-center bg-zinc-950/60 border-2 border-zinc-800 p-6 rounded-md">
            <div className="flex items-center gap-2 text-brutalist-green uppercase text-xs font-bold tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>Bio & Overview</span>
            </div>
            <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
              {profile.summary}
            </p>
            <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
              <div>
                <span className="text-white font-bold">Email:</span>{' '}
                <a
                  href={`mailto:${profile.social.email}`}
                  className="text-brutalist-cyan hover:underline"
                >
                  {profile.social.email}
                </a>
              </div>
              <div>
                <span className="text-white font-bold">GitHub:</span>{' '}
                <a
                  href={profile.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brutalist-cyan hover:underline"
                >
                  github.com/rtkelly13
                </a>
              </div>
              <div>
                <span className="text-white font-bold">LinkedIn:</span>{' '}
                <a
                  href={profile.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brutalist-cyan hover:underline"
                >
                  linkedin.com/in/rtkelly94
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2">
            <Sparkles className="w-5 h-5 text-brutalist-cyan" />
            <h2 className="text-xl font-bold uppercase text-white tracking-wider">
              Technical Skillset
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skills.map((s) => (
              <div
                key={s.category}
                className="bg-zinc-950 border border-zinc-800 p-4 rounded hover:border-zinc-700 transition-colors"
              >
                <h3 className="text-xs font-bold uppercase text-brutalist-cyan tracking-wider mb-3">
                  {'//'} {s.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {s.items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Timeline */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2">
            <Briefcase className="w-5 h-5 text-brutalist-pink" />
            <h2 className="text-xl font-bold uppercase text-white tracking-wider">
              Experience & Career
            </h2>
          </div>

          <div className="space-y-6">
            {experience.map((job) => (
              <div
                key={job.company}
                className="bg-zinc-950 border-2 border-zinc-800 hover:border-zinc-700 transition-colors p-6 rounded-md relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-zinc-800 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {job.role}
                    </h3>
                    <a
                      href={job.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brutalist-pink hover:underline text-sm font-semibold mt-1"
                    >
                      {job.company}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 self-start sm:self-auto rounded">
                    {job.period}
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  {job.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-brutalist-green font-bold select-none">
                        &gt;
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Open Source & Projects */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-brutalist-cyberOrange" />
              <h2 className="text-xl font-bold uppercase text-white tracking-wider">
                Open Source &amp; Projects
              </h2>
            </div>
            <a
              href="/projects"
              className="text-xs font-bold text-brutalist-cyan hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              View All &gt;
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.title}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors p-5 rounded-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      {project.title}
                    </h3>
                    {project.asciiArt && (
                      <span className="font-mono text-xs text-brutalist-cyberOrange select-none">
                        {project.asciiArt}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-zinc-900">
                  {project.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.href && (
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brutalist-cyan hover:underline font-semibold"
                    >
                      <span>Code &amp; Repository</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2">
            <GraduationCap className="w-5 h-5 text-brutalist-yellow" />
            <h2 className="text-xl font-bold uppercase text-white tracking-wider">
              Education
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {education.map((edu) => (
              <div
                key={edu.institution}
                className="bg-zinc-950 border border-zinc-800 p-5 rounded-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase">
                    {edu.qualification}
                  </h3>
                  <span className="text-xs text-zinc-500">{edu.period}</span>
                </div>
                <a
                  href={edu.institutionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brutalist-cyan hover:underline inline-flex items-center gap-1"
                >
                  {edu.institution}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <div className="text-xs text-brutalist-yellow font-semibold">
                  {edu.grade}
                </div>
                {edu.details && (
                  <p className="text-xs text-zinc-400 pt-1 leading-relaxed">
                    {edu.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
