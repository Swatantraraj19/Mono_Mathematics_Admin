import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Layers,
  BookOpen,
  Bookmark,
  Video,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchClasses } from '../../services/classService';
import { fetchStreams } from '../../services/streamService';
import { fetchClassSubjects } from '../../services/subjectService';
import { fetchChapters } from '../../services/chapterService';
import { fetchTotalVideoCount } from '../../services/videoService';
import { fetchLiveClasses } from '../../services/liveClassService';

export const Dashboard = () => {
  const { userProfile, instituteId: authInstituteId } = useAuth();
  const currentInstituteId = authInstituteId || userProfile?.instituteId || 'mono_math_01';
  const [counts, setCounts] = useState({
    classes: 0,
    streams: 0,
    subjects: 0,
    chapters: 0,
    videos: 0,
    liveClasses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [classesData, streamsData, subjectsData, chaptersData, videosCount, liveClassesData] = await Promise.allSettled([
          fetchClasses(currentInstituteId),
          fetchStreams(currentInstituteId),
          fetchClassSubjects(currentInstituteId),
          fetchChapters(currentInstituteId),
          fetchTotalVideoCount(currentInstituteId),
          fetchLiveClasses(currentInstituteId),
        ]);

        const totalClasses = classesData.status === 'fulfilled' ? classesData.value.length : 0;
        const totalStreams = streamsData.status === 'fulfilled' ? streamsData.value.length : 0;
        const totalSubjects = subjectsData.status === 'fulfilled' ? subjectsData.value.length : 0;
        const totalChapters = chaptersData.status === 'fulfilled' ? chaptersData.value.length : 0;
        const totalVideos = videosCount.status === 'fulfilled' ? videosCount.value : 0;
        const totalLiveClasses = liveClassesData.status === 'fulfilled' ? liveClassesData.value.length : 0;

        setCounts({
          classes: totalClasses,
          streams: totalStreams,
          subjects: totalSubjects,
          chapters: totalChapters,
          videos: totalVideos,
          liveClasses: totalLiveClasses,
        });
      } catch {
        // Fallback gracefully on network disruption
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, []);

  const stats = [
    { title: 'Academic Classes', count: loading ? '-' : counts.classes.toString(), subtitle: 'Classes 6 to 12', icon: GraduationCap, path: '/classes', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { title: 'Streams (11–12)', count: loading ? '-' : counts.streams.toString(), subtitle: 'Science, Commerce, Arts', icon: Layers, path: '/streams', color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { title: 'Mapped Subjects', count: loading ? '-' : counts.subjects.toString(), subtitle: 'Core curriculum', icon: BookOpen, path: '/subjects', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Course Chapters', count: loading ? '-' : counts.chapters.toString(), subtitle: 'Structured units', icon: Bookmark, path: '/chapters', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { title: 'Recorded Videos', count: loading ? '-' : counts.videos.toString(), subtitle: 'YouTube Unlisted', icon: Video, path: '/videos', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { title: 'Live Classes', count: loading ? '-' : counts.liveClasses.toString(), subtitle: 'Scheduled on Zoom', icon: Radio, path: '/live-classes', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  ];

  return (
    <div className="space-y-4">
      {/* Sleek Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-800 rounded-xl p-4 sm:p-5 text-white shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold mb-2 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            System Live & Connected
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            Welcome back, {userProfile?.name || 'Super Admin'}!
          </h2>
          <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
            Manage your coaching institute's academic curriculum, recorded video lectures, and live Zoom sessions.
          </p>
        </div>

        {/* Background icon decoration */}
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
          <GraduationCap className="w-36 h-36" />
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div>
        <div className="mb-2.5">
          <h3 className="text-sm font-bold text-slate-900">
            Institute Academic Overview
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Link
                key={idx}
                to={stat.path}
                className="admin-card group hover:border-primary-300 hover:shadow-card-hover p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-500">{stat.title}</span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stat.count}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${stat.color} shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{stat.subtitle}</span>
                  <span className="text-primary-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                    Manage <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
