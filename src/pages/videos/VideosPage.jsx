import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  GraduationCap,
  BookOpen,
  Bookmark,
  Play,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchVideosByChapter,
  searchGlobalVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  toggleVideoStatus,
  extractYouTubeVideoId,
} from '../../services/videoService';
import { fetchChapters } from '../../services/chapterService';
import { fetchClassSubjects } from '../../services/subjectService';
import { fetchClasses } from '../../services/classService';
import { fetchStreams } from '../../services/streamService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Table } from '../../components/common/Table';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';

export const VideosPage = () => {
  // Master Metadata
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // Academic Context Drilldown Selectors
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Chapter-Scoped Video Data
  const [chapterVideos, setChapterVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // In-App Video Player State
  const [playingVideo, setPlayingVideo] = useState(null);

  // Add / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  // Form states
  const [formClassId, setFormClassId] = useState('');
  const [formStreamId, setFormStreamId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formChapterId, setFormChapterId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formOrderIndex, setFormOrderIndex] = useState('1');
  const [formStatus, setFormStatus] = useState('active');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Initial Load: Fetch Academic Hierarchy Metadata
  const loadMetadata = async () => {
    try {
      setMetaLoading(true);
      const [classesData, streamsData, subjectsData, chaptersData] = await Promise.all([
        fetchClasses('mono_math_01'),
        fetchStreams('mono_math_01'),
        fetchClassSubjects('mono_math_01'),
        fetchChapters('mono_math_01'),
      ]);

      setClasses(classesData);
      setStreams(streamsData);
      setClassSubjects(subjectsData);
      setChapters(chaptersData);

      // Auto-initialize Drilldown to first available Class -> Stream -> Subject -> Chapter
      if (classesData.length > 0 && !selectedClassId) {
        const firstClass = classesData[0];
        setSelectedClassId(firstClass.id);

        const isSenior = firstClass.hasStreams || firstClass.name.includes('11') || firstClass.name.includes('12');
        const firstStream = isSenior && streamsData.length > 0 ? streamsData[0].id : '';
        setSelectedStreamId(firstStream);

        const initialSubjects = subjectsData.filter(
          (s) => s.classId === firstClass.id && (isSenior ? s.streamId === firstStream : true)
        );
        const firstSubjectId = initialSubjects.length > 0 ? initialSubjects[0].id : '';
        setSelectedSubjectId(firstSubjectId);

        const initialChapters = chaptersData.filter((ch) => ch.classSubjectId === firstSubjectId);
        const firstChapterId = initialChapters.length > 0 ? initialChapters[0].id : '';
        setSelectedChapterId(firstChapterId);
      }
    } catch (err) {
      toast.error('Failed to load academic hierarchy');
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // 2. Determine Senior Class Status
  const activeClassObj = classes.find((c) => c.id === selectedClassId);
  const activeClassHasStreams =
    activeClassObj?.hasStreams ||
    activeClassObj?.name?.includes('11') ||
    activeClassObj?.name?.includes('12');

  // Available Subjects under active Class & Stream
  const availableSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== selectedClassId) return false;
      if (activeClassHasStreams && selectedStreamId && cs.streamId !== selectedStreamId) return false;
      return true;
    });
  }, [classSubjects, selectedClassId, selectedStreamId, activeClassHasStreams]);

  // Available Chapters under active Subject
  const availableChapters = useMemo(() => {
    return chapters.filter((ch) => ch.classSubjectId === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  // Active Subject & Chapter Objects
  const activeSubjectObj = classSubjects.find((s) => s.id === selectedSubjectId);
  const activeChapterObj = chapters.find((ch) => ch.id === selectedChapterId);

  // 3. Scoped Video Loading: Triggered only when selectedChapterId changes
  const loadChapterVideos = async (chapterId) => {
    if (!chapterId) {
      setChapterVideos([]);
      return;
    }
    try {
      setVideosLoading(true);
      const data = await fetchVideosByChapter('mono_math_01', chapterId);
      setChapterVideos(data);
    } catch (err) {
      toast.error('Failed to load videos for the selected chapter');
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChapterId && !searchQuery.trim()) {
      loadChapterVideos(selectedChapterId);
    }
  }, [selectedChapterId, searchQuery]);

  // Handle Class change in drilldown
  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    const isSenior = cls?.hasStreams || cls?.name?.includes('11') || cls?.name?.includes('12');
    const newStreamId = isSenior && streams.length > 0 ? streams[0].id : '';
    setSelectedStreamId(newStreamId);

    const nextSubjects = classSubjects.filter(
      (s) => s.classId === newClassId && (isSenior ? s.streamId === newStreamId : true)
    );
    const nextSubId = nextSubjects.length > 0 ? nextSubjects[0].id : '';
    setSelectedSubjectId(nextSubId);

    const nextChapters = chapters.filter((ch) => ch.classSubjectId === nextSubId);
    const nextChId = nextChapters.length > 0 ? nextChapters[0].id : '';
    setSelectedChapterId(nextChId);
  };

  // Handle Stream change in drilldown
  const handleStreamChange = (newStreamId) => {
    setSelectedStreamId(newStreamId);
    const nextSubjects = classSubjects.filter(
      (s) => s.classId === selectedClassId && s.streamId === newStreamId
    );
    const nextSubId = nextSubjects.length > 0 ? nextSubjects[0].id : '';
    setSelectedSubjectId(nextSubId);

    const nextChapters = chapters.filter((ch) => ch.classSubjectId === nextSubId);
    const nextChId = nextChapters.length > 0 ? nextChapters[0].id : '';
    setSelectedChapterId(nextChId);
  };

  // Handle Subject change in drilldown
  const handleSubjectChange = (newSubId) => {
    setSelectedSubjectId(newSubId);
    const nextChapters = chapters.filter((ch) => ch.classSubjectId === newSubId);
    const nextChId = nextChapters.length > 0 ? nextChapters[0].id : '';
    setSelectedChapterId(nextChId);
  };

  // 4. Global Search Handler (Debounced)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchGlobalVideos('mono_math_01', trimmed);
        setSearchResults(results);
      } catch (err) {
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Form Cascading Helpers
  const formClassObj = classes.find((c) => c.id === formClassId);
  const formClassHasStreams =
    formClassObj?.hasStreams ||
    formClassObj?.name?.includes('11') ||
    formClassObj?.name?.includes('12');

  const availableFormSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (cs.classId !== formClassId) return false;
      if (formClassHasStreams && cs.streamId !== formStreamId) return false;
      return true;
    });
  }, [classSubjects, formClassId, formStreamId, formClassHasStreams]);

  useEffect(() => {
    if (availableFormSubjects.length > 0) {
      if (!availableFormSubjects.some((s) => s.id === formSubjectId)) {
        setFormSubjectId(availableFormSubjects[0].id);
      }
    } else {
      setFormSubjectId('');
    }
  }, [availableFormSubjects, formSubjectId]);

  const availableFormChapters = useMemo(() => {
    return chapters.filter((ch) => ch.classSubjectId === formSubjectId);
  }, [chapters, formSubjectId]);

  useEffect(() => {
    if (availableFormChapters.length > 0) {
      if (!availableFormChapters.some((ch) => ch.id === formChapterId)) {
        setFormChapterId(availableFormChapters[0].id);
      }
    } else {
      setFormChapterId('');
    }
  }, [availableFormChapters, formChapterId]);

  // Auto-calculate next lecture number in form
  useEffect(() => {
    if (!editingVideo && formChapterId) {
      const vids = chapterVideos.filter((v) => v.chapterId === formChapterId);
      setFormOrderIndex((vids.length + 1).toString());
    }
  }, [formChapterId, chapterVideos, editingVideo]);

  const parsedFormVideoId = useMemo(() => {
    return extractYouTubeVideoId(formVideoUrl);
  }, [formVideoUrl]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingVideo(null);
    setFormClassId(selectedClassId || classes[0]?.id || '');
    setFormStreamId(selectedStreamId || streams[0]?.id || '');
    setFormSubjectId(selectedSubjectId || '');
    setFormChapterId(selectedChapterId || '');
    setFormTitle('');
    setFormVideoUrl('');
    setFormDuration('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (v) => {
    setEditingVideo(v);
    setFormClassId(v.classId);
    setFormStreamId(v.streamId || '');
    setFormSubjectId(v.subjectId);
    setFormChapterId(v.chapterId);
    setFormTitle(v.title);
    setFormVideoUrl(v.videoUrl);
    setFormDuration(v.duration && v.duration !== 'N/A' ? v.duration : '');
    setFormOrderIndex((v.orderIndex || 1).toString());
    setFormStatus(v.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error('Please enter a video lecture title.');
      return;
    }

    const videoId = extractYouTubeVideoId(formVideoUrl);
    if (!videoId) {
      toast.error('Invalid YouTube link. Please enter a valid YouTube video URL.');
      return;
    }

    if (!formChapterId) {
      toast.error('Please select a valid chapter to attach this video to.');
      return;
    }

    const matchedChapter = chapters.find((ch) => ch.id === formChapterId);
    if (!matchedChapter) {
      toast.error('Selected chapter not found.');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      videoUrl: formVideoUrl.trim(),
      duration: formDuration.trim() || 'N/A',
      orderIndex: Number(formOrderIndex) || 1,
      classId: matchedChapter.classId,
      className: matchedChapter.className,
      streamId: matchedChapter.streamId || null,
      streamName: matchedChapter.streamName || null,
      subjectId: matchedChapter.subjectId,
      subjectName: matchedChapter.subjectName,
      chapterId: matchedChapter.id,
      chapterName: matchedChapter.name,
      status: formStatus,
    };

    setIsSaving(true);
    try {
      if (editingVideo) {
        await updateVideo(editingVideo.id, payload);
        toast.success(`Updated "${payload.title}" successfully!`);
      } else {
        await createVideo(payload, 'mono_math_01');
        toast.success(`Added lecture "${payload.title}"!`);
      }
      setIsModalOpen(false);

      // If the saved video belongs to the active chapter, refresh chapter video list
      if (payload.chapterId === selectedChapterId) {
        loadChapterVideos(selectedChapterId);
      } else {
        // Switch to the chapter of the newly created video
        setSelectedClassId(payload.classId);
        if (payload.streamId) setSelectedStreamId(payload.streamId);
        setSelectedSubjectId(matchedChapter.classSubjectId);
        setSelectedChapterId(payload.chapterId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save video');
    } finally {
      setIsSaving(false);
    }
  };

  // Status Toggle
  const handleToggleStatus = async (v) => {
    try {
      await toggleVideoStatus(v.id, v.status);
      toast.success(`"${v.title}" marked as ${v.status === 'active' ? 'inactive' : 'active'}`);
      const updatedStatus = v.status === 'active' ? 'inactive' : 'active';

      setChapterVideos((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, status: updatedStatus } : item))
      );
      setSearchResults((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, status: updatedStatus } : item))
      );
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVideo(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);

      if (deleteTarget.chapterId === selectedChapterId) {
        loadChapterVideos(selectedChapterId);
      }
      setSearchResults((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Recorded Video Lectures
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage YouTube Unlisted video lectures organized by class, subject, and chapter.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={chapters.length === 0}
          className="w-full sm:w-auto shadow-xs"
        >
          Add Video Lecture
        </Button>
      </div>

      {/* Context-Based Academic Drilldown & Global Search Bar */}
      <div className="admin-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="w-full md:w-80">
            <Input
              type="text"
              placeholder="Global Search video lectures..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs py-1.5"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Academic Context:
            </span>
            <button
              type="button"
              onClick={() => {
                loadMetadata();
                if (selectedChapterId) loadChapterVideos(selectedChapterId);
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cascade Dropdown Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {/* Class Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              className="text-xs py-1.5 bg-slate-50/50"
            />
          </div>

          {/* Stream Selector (Only for Senior Classes) */}
          {activeClassHasStreams && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Stream
              </label>
              <Select
                value={selectedStreamId}
                onChange={(e) => handleStreamChange(e.target.value)}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                className="text-xs py-1.5 bg-purple-50/30 text-purple-900 border-purple-200"
              />
            </div>
          )}

          {/* Subject Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Subject
            </label>
            <Select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              options={availableSubjects.map((s) => ({
                value: s.id,
                label: s.subjectName,
              }))}
              className="text-xs py-1.5 bg-slate-50/50"
            />
          </div>

          {/* Chapter Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Chapter
            </label>
            <Select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              options={availableChapters.map((ch) => ({
                value: ch.id,
                label: `#${ch.chapterNumber} ${ch.name}`,
              }))}
              className="text-xs py-1.5 bg-amber-50/30 text-amber-900 border-amber-200 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {metaLoading ? (
        <SkeletonLoader rows={4} />
      ) : searchQuery.trim() ? (
        /* GLOBAL SEARCH RESULTS VIEW */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              Global Search Results for "<strong>{searchQuery.trim()}</strong>":
            </span>
            <span className="font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
              {searchResults.length} matching lecture{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isSearching ? (
            <SkeletonLoader rows={3} />
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Video Lectures"
              description={`No videos found matching "${searchQuery}". Try a different title or keyword.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {searchResults.map((v) => (
                <div
                  key={v.id}
                  className="admin-card p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    {/* Thumbnail */}
                    <div
                      onClick={() => setPlayingVideo(v)}
                      className="relative w-20 h-12 sm:w-24 sm:h-14 rounded-lg bg-slate-900 overflow-hidden shrink-0 group cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      <img
                        src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                      {v.duration && v.duration !== 'N/A' && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded-xs font-mono">
                          {v.duration}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-primary-700">
                          {v.className}
                        </span>
                        {v.streamName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                            {v.streamName}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-500">
                          • {v.subjectName} • Chapter: {v.chapterName}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        L#{v.orderIndex} - {v.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <Badge variant={v.status === 'active' ? 'active' : 'inactive'}>
                      {v.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPlayingVideo(v)}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                        title="Watch Video"
                      >
                        <Play className="w-4 h-4 fill-primary-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(v)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={v.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {v.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* CHAPTER DRILLDOWN VIDEO LIST VIEW */
        <div className="space-y-3">
          {/* Active Context Breadcrumb Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-primary-700">
                <GraduationCap className="w-3.5 h-3.5" />
                {activeClassObj?.name || 'Class'}
              </span>

              {activeClassHasStreams && selectedStreamId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700">
                  <Layers className="w-3.5 h-3.5" />
                  {streams.find((s) => s.id === selectedStreamId)?.name || 'Stream'}
                </span>
              )}

              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
                <BookOpen className="w-3.5 h-3.5" />
                {activeSubjectObj?.subjectName || 'Subject'}
              </span>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Bookmark className="w-3.5 h-3.5" />
                {activeChapterObj ? `Chapter ${activeChapterObj.chapterNumber}: ${activeChapterObj.name}` : 'Chapter'}
              </span>
            </div>

            <div className="shrink-0 text-xs font-semibold text-slate-500">
              {chapterVideos.length} Lecture{chapterVideos.length !== 1 ? 's' : ''} in this chapter
            </div>
          </div>

          {/* Videos List Container */}
          {videosLoading ? (
            <SkeletonLoader rows={4} />
          ) : !selectedChapterId ? (
            <EmptyState
              icon={Bookmark}
              title="No Chapter Selected"
              description="Please select a class, subject, and chapter above to manage video lectures."
            />
          ) : chapterVideos.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No Video Lectures in this Chapter"
              description={`No videos attached to "${activeChapterObj?.name || 'this chapter'}" yet.`}
              actionLabel="Add Video Lecture"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <>
              {/* 1. Mobile Compact Cards (< 640px) */}
              <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                {chapterVideos.map((v) => (
                  <div
                    key={v.id}
                    className="admin-card p-3 flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        onClick={() => setPlayingVideo(v)}
                        className="relative w-16 h-10 rounded-md bg-slate-900 overflow-hidden shrink-0 group cursor-pointer border border-slate-200"
                      >
                        <img
                          src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                          alt={v.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-primary-700 shrink-0">
                            L#{v.orderIndex}
                          </span>
                          <Badge variant={v.status === 'active' ? 'active' : 'inactive'} className="text-[9px] py-0 px-1">
                            {v.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {v.title}
                        </h4>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {v.duration && v.duration !== 'N/A' ? v.duration : 'N/A'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPlayingVideo(v)}
                          className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 cursor-pointer"
                          title="Play"
                        >
                          <Play className="w-3.5 h-3.5 fill-primary-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v)}
                          className={`p-1.5 rounded-md cursor-pointer ${
                            v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {v.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 rounded-md text-status-error hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop High-Density Table (>= 640px) */}
              <div className="hidden sm:block">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="w-16">L #</Table.Head>
                      <Table.Head className="w-24">Preview</Table.Head>
                      <Table.Head>Lecture Title</Table.Head>
                      <Table.Head className="w-28">Duration</Table.Head>
                      <Table.Head className="w-24">Status</Table.Head>
                      <Table.Head className="text-right w-28 pr-6">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {chapterVideos.map((v) => (
                      <Table.Row key={v.id}>
                        <Table.Cell>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-primary-700 rounded-md">
                            #{v.orderIndex}
                          </span>
                        </Table.Cell>

                        <Table.Cell>
                          <div
                            onClick={() => setPlayingVideo(v)}
                            className="relative w-16 h-10 rounded-md bg-slate-900 overflow-hidden shrink-0 group cursor-pointer border border-slate-200"
                          >
                            <img
                              src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                              alt={v.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
                              <Play className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          </div>
                        </Table.Cell>

                        <Table.Cell>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{v.title}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{v.youtubeVideoId}</span>
                          </div>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {v.duration && v.duration !== 'N/A' ? v.duration : 'N/A'}
                          </span>
                        </Table.Cell>

                        <Table.Cell>
                          <Badge variant={v.status === 'active' ? 'active' : 'inactive'}>
                            {v.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Cell>

                        <Table.Cell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPlayingVideo(v)}
                              className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                              title="Play Video"
                            >
                              <Play className="w-4 h-4 fill-primary-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(v)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={v.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {v.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(v)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(v)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Video Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingVideo ? `Edit Lecture: ${editingVideo.title}` : 'Add Recorded Video Lecture'}
        subtitle="Attach a YouTube Unlisted video lecture under a specific syllabus chapter."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveVideo} className="space-y-3.5">
          {/* Class Selector */}
          <Select
            label="Academic Class"
            value={formClassId}
            onChange={(e) => setFormClassId(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          {/* Stream Selector (Only for Senior Classes 11 & 12) */}
          {formClassHasStreams && (
            <Select
              label="Academic Stream"
              value={formStreamId}
              onChange={(e) => setFormStreamId(e.target.value)}
              options={streams.map((s) => ({ value: s.id, label: s.name }))}
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Subject Selector */}
            <Select
              label="Subject"
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              options={availableFormSubjects.map((s) => ({
                value: s.id,
                label: s.subjectName,
              }))}
              helperText={availableFormSubjects.length === 0 ? 'No subjects in this context.' : undefined}
              required
            />

            {/* Chapter Selector */}
            <Select
              label="Chapter"
              value={formChapterId}
              onChange={(e) => setFormChapterId(e.target.value)}
              options={availableFormChapters.map((ch) => ({
                value: ch.id,
                label: `#${ch.chapterNumber} ${ch.name}`,
              }))}
              helperText={availableFormChapters.length === 0 ? 'No chapters in this subject.' : undefined}
              required
            />
          </div>

          <Input
            label="Lecture Title"
            placeholder="e.g. Lecture 01: Real Numbers & Euclid Lemma"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <Input
              label="YouTube Video Link (Unlisted)"
              placeholder="e.g. https://youtu.be/dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
              value={formVideoUrl}
              onChange={(e) => setFormVideoUrl(e.target.value)}
              required
            />

            {/* Live Video Preview Thumbnail */}
            {parsedFormVideoId ? (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <img
                  src={`https://img.youtube.com/vi/${parsedFormVideoId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-16 h-10 rounded object-cover border border-emerald-300 shrink-0"
                />
                <div className="text-[11px] text-emerald-800 leading-tight">
                  <span className="font-bold flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid YouTube Video Link
                  </span>
                  <span className="text-slate-600 font-mono text-[10px]">ID: {parsedFormVideoId}</span>
                </div>
              </div>
            ) : formVideoUrl.trim() ? (
              <p className="text-[11px] text-status-error font-medium">
                Invalid YouTube URL format. Please paste a standard YouTube watch/share URL.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (optional)"
              placeholder="e.g. 45:30"
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
              icon={Clock}
            />

            <Input
              label="Lecture #"
              type="number"
              value={formOrderIndex}
              onChange={(e) => setFormOrderIndex(e.target.value)}
              required
            />
          </div>

          <Select
            label="Video Status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Active (Visible to Students)' },
              { value: 'inactive', label: 'Hidden from Students' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isSaving || !parsedFormVideoId || availableFormChapters.length === 0}
            >
              {editingVideo ? 'Save Changes' : 'Add Video Lecture'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* In-App Video Player Modal */}
      {playingVideo && (
        <Modal
          isOpen={Boolean(playingVideo)}
          onClose={() => setPlayingVideo(null)}
          title={playingVideo.title}
          subtitle={`${playingVideo.className} • ${playingVideo.subjectName} • Chapter: ${playingVideo.chapterName}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-3">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideo.youtubeVideoId}?autoplay=1&rel=0`}
                title={playingVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-mono">YouTube ID: {playingVideo.youtubeVideoId}</span>
              <a
                href={`https://www.youtube.com/watch?v=${playingVideo.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Open in YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Video Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Video Lecture"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete Video"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
