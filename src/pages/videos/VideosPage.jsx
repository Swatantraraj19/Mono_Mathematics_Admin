import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  X,
  GraduationCap,
  BookOpen,
  Bookmark,
  Layers,
  Maximize,
  Minimize,
  RotateCw,
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
import { useAuth } from '../../hooks/useAuth';

export const VideosPage = () => {
  const { instituteId: authInstituteId, userProfile } = useAuth();
  const currentInstituteId = authInstituteId || userProfile?.instituteId || 'mono_math_01';

  // Master Metadata
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);

  // Academic Context Drilldown Selectors
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all'); // 'all' | 'CBSE' | 'BSEB'

  // Chapter-Scoped Video Data
  const [chapterVideos, setChapterVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // In-App Video Player State
  const [playingVideo, setPlayingVideo] = useState(null);
  const playerContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);

  // Part 2: Custom Fullscreen (Untouched - opens portrait fullscreen with Exit button)
  const toggleCustomFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      setIsLandscapeMode(false);
      if (window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch (e) {}
      }
    }
  };

  // Part 3: Dedicated Landscape Mode (Forces 16:9 full landscape view)
  const toggleLandscapeMode = async () => {
    if (!playerContainerRef.current) return;
    const nextState = !isLandscapeMode;
    setIsLandscapeMode(nextState);

    if (nextState) {
      // 1. Enter Fullscreen for true distraction-free view
      if (!document.fullscreenElement && playerContainerRef.current.requestFullscreen) {
        try {
          await playerContainerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (e) {}
      }
      // 2. Try native hardware orientation lock if supported
      if (window.screen?.orientation?.lock) {
        try {
          await window.screen.orientation.lock('landscape');
        } catch (e) {}
      }
    } else {
      // Exit Landscape Mode
      if (window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch (e) {}
      }
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen) {
        setIsLandscapeMode(false);
        if (window.screen?.orientation?.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch (e) {}
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
      setMetaError(null);
      const [classesData, streamsData, subjectsData, chaptersData] = await Promise.all([
        fetchClasses(currentInstituteId),
        fetchStreams(currentInstituteId),
        fetchClassSubjects(currentInstituteId),
        fetchChapters(currentInstituteId),
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
      setMetaError('Failed to load academic syllabus structure. Please try again.');
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
      if (selectedBoardFilter !== 'all') {
        const board = cs.board || 'ALL';
        if (board !== 'ALL' && board !== selectedBoardFilter) return false;
      }
      return true;
    });
  }, [classSubjects, selectedClassId, selectedStreamId, activeClassHasStreams, selectedBoardFilter]);

  // Keep selectedSubjectId in sync with availableSubjects
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  // Available Chapters under active Subject
  const availableChapters = useMemo(() => {
    return chapters.filter((ch) => ch.classSubjectId === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  // Keep selectedChapterId in sync with availableChapters
  useEffect(() => {
    if (availableChapters.length > 0) {
      if (!availableChapters.some((ch) => ch.id === selectedChapterId)) {
        setSelectedChapterId(availableChapters[0].id);
      }
    } else {
      setSelectedChapterId('');
    }
  }, [availableChapters, selectedChapterId]);

  // Active Subject & Chapter Objects
  const activeSubjectObj = classSubjects.find((s) => s.id === selectedSubjectId);
  const activeChapterObj = chapters.find((ch) => ch.id === selectedChapterId);

  // Helper for board badge styling
  const renderBoardBadge = (board) => {
    const b = board || 'ALL';
    if (b === 'CBSE') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          CBSE
        </span>
      );
    }
    if (b === 'BSEB') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          BSEB
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        All Boards
      </span>
    );
  };

  const formatSubjectOptionLabel = (s) => {
    const b = s.board || 'ALL';
    const bLabel = b === 'CBSE' ? 'CBSE' : b === 'BSEB' ? 'BSEB' : 'All Boards';
    return `${s.subjectName} (${bLabel})`;
  };

  // 3. Lazy Scoped Video Loading: Triggered only when selectedChapterId changes
  const loadChapterVideos = async (chapterId) => {
    if (!chapterId) {
      setChapterVideos([]);
      return;
    }
    try {
      setVideosLoading(true);
      setVideoError(null);
      const data = await fetchVideosByChapter(currentInstituteId, chapterId);
      setChapterVideos(data);
    } catch (err) {
      setVideoError('Could not fetch lectures for this chapter. Please check connection and retry.');
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
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const results = await searchGlobalVideos(currentInstituteId, trimmed);
        setSearchResults(results);
      } catch (err) {
        setSearchError(err?.message || 'Search query failed. Please check network and retry.');
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentInstituteId]);

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

  // Auto-calculate next available lecture number in form
  useEffect(() => {
    if (!editingVideo && formChapterId) {
      const vids = chapterVideos.filter((v) => v.chapterId === formChapterId);
      if (vids.length > 0) {
        const maxOrder = Math.max(...vids.map((v) => Number(v.orderIndex) || 0), 0);
        setFormOrderIndex((maxOrder + 1).toString());
      } else {
        setFormOrderIndex('1');
      }
    }
  }, [formChapterId, chapterVideos, editingVideo]);

  const parsedFormVideoId = useMemo(() => {
    return extractYouTubeVideoId(formVideoUrl);
  }, [formVideoUrl]);

  // Real-time conflict detection for lecture number within the target chapter
  const orderConflict = useMemo(() => {
    const orderNum = Number(formOrderIndex);
    if (!orderNum || !formChapterId) return null;
    const targetList = formChapterId === selectedChapterId ? chapterVideos : [];
    return targetList.find(
      (v) => (editingVideo ? v.id !== editingVideo.id : true) && Number(v.orderIndex) === orderNum
    );
  }, [formOrderIndex, formChapterId, selectedChapterId, chapterVideos, editingVideo]);

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

    const targetOrder = Number(formOrderIndex);
    if (!targetOrder || targetOrder < 1) {
      toast.error('Please enter a valid lecture number (1 or greater).');
      return;
    }

    // Strict Unique Lecture # Validation across chapter
    const vidsToCheck =
      formChapterId === selectedChapterId
        ? chapterVideos
        : await fetchVideosByChapter(currentInstituteId, formChapterId);

    const duplicate = vidsToCheck.find(
      (v) => (editingVideo ? v.id !== editingVideo.id : true) && Number(v.orderIndex) === targetOrder
    );

    if (duplicate) {
      toast.error(
        `Lecture #${targetOrder} is already assigned to "${duplicate.title}". Please choose a unique lecture number.`
      );
      return;
    }

    const payload = {
      title: formTitle.trim(),
      videoUrl: formVideoUrl.trim(),
      duration: formDuration.trim() || 'N/A',
      orderIndex: targetOrder,
      classId: matchedChapter.classId,
      className: matchedChapter.className,
      streamId: matchedChapter.streamId || null,
      streamName: matchedChapter.streamName || null,
      subjectId: matchedChapter.subjectId,
      subjectName: matchedChapter.subjectName,
      chapterId: matchedChapter.id,
      chapterName: matchedChapter.name,
      board: matchedChapter.board || activeSubjectObj?.board || 'ALL',
      status: formStatus,
    };

    setIsSaving(true);
    try {
      if (editingVideo) {
        await updateVideo(editingVideo.id, payload);
        toast.success(`Updated "${payload.title}" successfully!`);
      } else {
        await createVideo(payload, currentInstituteId);
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
    <div className="space-y-3.5 sm:space-y-4">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-50 text-primary-600 inline-flex">
              <Video className="w-5 h-5" />
            </span>
            Recorded Video Lectures
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage video lectures organized by syllabus structure.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenCreateModal}
          disabled={chapters.length === 0}
          className="w-full sm:w-auto shadow-xs font-medium cursor-pointer"
        >
          Add Video Lecture
        </Button>
      </div>

      {/* Academic Drill-down & Global Search Filter Panel */}
      <div className="admin-card !p-2.5 sm:!p-4 space-y-2 sm:space-y-3 shadow-xs">
        {/* Top Control Row: Global Search & Reload */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
          <div className="relative w-full sm:flex-1">
            <Input
              type="text"
              placeholder="Search all video lectures across institute..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs py-1.5 sm:py-2 pr-8 sm:pr-11"
              aria-label="Global Search Videos"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-0 bottom-0 min-w-[36px] sm:min-w-[44px] w-9 sm:w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 rounded-r-lg cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Board Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-lg">
              {[
                { id: 'all', label: 'All Boards' },
                { id: 'CBSE', label: 'CBSE' },
                { id: 'BSEB', label: 'BSEB' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBoardFilter(b.id)}
                  className={`px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    selectedBoardFilter === b.id
                      ? 'bg-white text-primary-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                loadMetadata();
                if (selectedChapterId) loadChapterVideos(selectedChapterId);
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 min-w-[32px] sm:min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Refresh academic data"
              aria-label="Refresh academic data"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Academic Hierarchy Selectors: Class -> Stream -> Subject -> Chapter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-slate-100">
          {/* Class Selector */}
          <div>
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
              Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              className="text-xs py-1 sm:py-2 bg-slate-50/70"
              aria-label="Select Class"
            />
          </div>

          {/* Stream Selector (Only for Senior Classes) */}
          {activeClassHasStreams && (
            <div>
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
                Stream
              </label>
              <Select
                value={selectedStreamId}
                onChange={(e) => handleStreamChange(e.target.value)}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                className="text-xs py-1 sm:py-2 bg-purple-50/40 text-purple-900 border-purple-200"
                aria-label="Select Stream"
              />
            </div>
          )}

          {/* Subject Selector */}
          <div className={!activeClassHasStreams ? 'col-span-1' : ''}>
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
              Subject
            </label>
            <Select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              options={availableSubjects.map((s) => ({
                value: s.id,
                label: formatSubjectOptionLabel(s),
              }))}
              className="text-xs py-1 sm:py-2 bg-slate-50/70"
              aria-label="Select Subject"
            />
          </div>

          {/* Chapter Selector */}
          <div className={!activeClassHasStreams ? 'col-span-2 sm:col-span-2' : 'col-span-1'}>
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 sm:text-slate-500 uppercase tracking-wider block mb-0.5 sm:mb-1">
              Chapter
            </label>
            <Select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              options={availableChapters.map((ch) => ({
                value: ch.id,
                label: `#${ch.chapterNumber} ${ch.name}`,
              }))}
              className="text-xs py-1 sm:py-2 bg-indigo-50/30 text-indigo-900 border-indigo-200 font-medium"
              aria-label="Select Chapter"
            />
          </div>
        </div>

        {/* Compact Result Summary Line */}
        {!metaLoading && (
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 flex-wrap gap-1">
            {searchQuery.trim() ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                <span>
                  Global Search for "<strong>{searchQuery.trim()}</strong>":
                </span>
                <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px]">
                  {searchResults.length} matching lecture{searchResults.length !== 1 ? 's' : ''}
                </span>
              </span>
            ) : selectedChapterId && activeChapterObj ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700 font-medium">
                  {chapterVideos.length} lecture{chapterVideos.length !== 1 ? 's' : ''} in this chapter
                </span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline text-[11px]">
                  Ch #{activeChapterObj.chapterNumber} {activeChapterObj.name}
                </span>
              </span>
            ) : (
              <span className="text-slate-400 text-[10px] sm:text-[11px]">Select a chapter above to view lectures</span>
            )}

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] sm:text-[11px] font-semibold text-primary-600 hover:text-primary-800 hover:underline inline-flex items-center cursor-pointer"
              >
                Back to chapter view
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {metaLoading ? (
        /* Metadata Skeleton */
        <div className="admin-card !p-4 space-y-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : metaError ? (
        /* Metadata Error State */
        <div className="admin-card !p-6 flex flex-col items-center justify-center text-center space-y-3 border-status-error/30 bg-red-50/30">
          <AlertCircle className="w-8 h-8 text-status-error" />
          <h3 className="text-sm font-bold text-slate-900">Unable to load syllabus structure</h3>
          <p className="text-xs text-slate-500 max-w-sm">{metaError}</p>
          <Button variant="primary" size="sm" icon={RefreshCw} onClick={loadMetadata} className="min-h-[44px]">
            Retry Loading
          </Button>
        </div>
      ) : searchQuery.trim() ? (
        /* ======================== GLOBAL SEARCH VIEW ======================== */
        <div className="space-y-2.5">
          {isSearching ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="admin-card !p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-16 h-10 bg-slate-200 rounded-md shrink-0"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  </div>
                  <div className="w-16 h-6 bg-slate-200 rounded shrink-0"></div>
                </div>
              ))}
            </div>
          ) : searchError ? (
            <div className="admin-card !p-6 flex flex-col items-center justify-center text-center space-y-3 border-status-error/30 bg-red-50/30">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <h3 className="text-sm font-bold text-slate-900">Search Error</h3>
              <p className="text-xs text-slate-500 max-w-sm">{searchError}</p>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                className="min-h-[44px]"
                onClick={async () => {
                  setIsSearching(true);
                  setSearchError(null);
                  try {
                    const results = await searchGlobalVideos(currentInstituteId, searchQuery.trim());
                    setSearchResults(results);
                  } catch (err) {
                    setSearchError(err?.message || 'Search failed. Please retry.');
                  } finally {
                    setIsSearching(false);
                  }
                }}
              >
                Retry Search
              </Button>
            </div>
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Video Lectures"
              description={`No videos found matching "${searchQuery}". Try a different title or keyword.`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <div className="space-y-2">
              {searchResults.map((v) => (
                <div
                  key={v.id}
                  className="admin-card !p-2.5 sm:!p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-primary-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* YouTube Thumbnail with Play Button */}
                    <div
                      onClick={() => setPlayingVideo(v)}
                      className="relative w-18 h-11 sm:w-20 sm:h-12 rounded-lg bg-slate-900 overflow-hidden shrink-0 group cursor-pointer border border-slate-200 shadow-2xs"
                      title="Click to preview lecture"
                    >
                      <img
                        src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                      </div>
                      {v.duration && v.duration !== 'N/A' && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] sm:text-[9px] px-1 rounded-xs font-mono">
                          {v.duration}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-primary-700">
                          {v.className}
                        </span>
                        {v.streamName && (
                          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                            {v.streamName}
                          </span>
                        )}
                        <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate max-w-[200px]">
                          • {v.subjectName} • {v.chapterName}
                        </span>
                        {renderBoardBadge(v.board)}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                        L#{v.orderIndex} - {v.title}
                      </h4>
                    </div>
                  </div>

                  {/* Actions & Status with 44x44px touch targets on mobile */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Badge variant={v.status === 'active' ? 'active' : 'inactive'} dot size="sm">
                      {v.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>

                    <div className="flex items-center gap-1 sm:gap-0.5">
                      <button
                        type="button"
                        onClick={() => setPlayingVideo(v)}
                        className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-primary-600 hover:bg-primary-50 active:bg-primary-100 transition-colors cursor-pointer"
                        title="Preview / Play Lecture"
                        aria-label="Preview lecture"
                      >
                        <Play className="w-4 h-4 fill-primary-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(v)}
                        className={`min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                          v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100' : 'text-slate-400 hover:bg-slate-100 active:bg-slate-200'
                        }`}
                        title={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                        aria-label={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                      >
                        {v.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors cursor-pointer"
                        title="Edit Lecture"
                        aria-label="Edit lecture"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
                        title="Delete Lecture"
                        aria-label="Delete lecture"
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
        /* ==================== CHAPTER-SCOPED VIEW ==================== */
        <div className="space-y-2.5">
          {/* Inline Loading Skeleton for Chapter Content */}
          {videosLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="admin-card !p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-16 h-10 bg-slate-200 rounded-md shrink-0"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                  <div className="w-20 h-6 bg-slate-200 rounded shrink-0"></div>
                </div>
              ))}
            </div>
          ) : videoError ? (
            /* Inline Chapter Query Error State with Retry */
            <div className="admin-card !p-6 flex flex-col items-center justify-center text-center space-y-3 border-status-error/30 bg-red-50/30">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <h3 className="text-sm font-bold text-slate-900">Failed to load lectures</h3>
              <p className="text-xs text-slate-500 max-w-sm">{videoError}</p>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                className="min-h-[44px]"
                onClick={() => loadChapterVideos(selectedChapterId)}
              >
                Retry
              </Button>
            </div>
          ) : !selectedChapterId ? (
            <EmptyState
              icon={Bookmark}
              title="No Chapter Selected"
              description="Please select a class, subject, and chapter above to view and manage video lectures."
            />
          ) : chapterVideos.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No lectures added yet"
              description={`No videos attached to "${activeChapterObj?.name || 'this chapter'}" yet.`}
              actionLabel="Add Video Lecture"
              onAction={handleOpenCreateModal}
              actionIcon={Plus}
            />
          ) : (
            <>
              {/* 1. Mobile High-Density Compact Cards (< 640px) */}
              <div className="grid grid-cols-1 gap-1.5 sm:hidden">
                {chapterVideos.map((v) => (
                  <div
                    key={v.id}
                    className="admin-card !p-2 flex items-center justify-between gap-2 hover:border-primary-200 transition-colors shadow-2xs"
                  >
                    {/* Left: Thumbnail with Click-to-play */}
                    <div
                      onClick={() => setPlayingVideo(v)}
                      className="relative w-16 h-10 rounded-md bg-slate-900 overflow-hidden shrink-0 group cursor-pointer border border-slate-200 shadow-2xs"
                      title="Click to preview lecture"
                    >
                      <img
                        src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white fill-white" />
                      </div>
                    </div>

                    {/* Middle: Title & Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight truncate" title={v.title}>
                          {v.title}
                        </h4>
                        {renderBoardBadge(v.board || activeChapterObj?.board || activeSubjectObj?.board)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono font-bold text-primary-700 bg-indigo-50 px-1 py-0.2 rounded">
                          #{v.orderIndex}
                        </span>
                        <span>•</span>
                        <span className={v.status === 'active' ? 'text-emerald-600 font-medium' : 'text-slate-400 font-medium'}>
                          {v.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        {v.duration && v.duration !== 'N/A' && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{v.duration}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPlayingVideo(v)}
                        className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 active:bg-primary-100 cursor-pointer"
                        title="Preview / Play Lecture"
                        aria-label="Preview lecture"
                      >
                        <Play className="w-3.5 h-3.5 fill-primary-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(v)}
                        className={`p-1.5 rounded-md cursor-pointer ${
                          v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                        aria-label={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                      >
                        {v.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-primary-600 hover:bg-indigo-50 active:bg-indigo-100 cursor-pointer"
                        title="Edit Lecture"
                        aria-label="Edit lecture"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-status-error hover:bg-red-50 active:bg-red-100 cursor-pointer"
                        title="Delete Lecture"
                        aria-label="Delete lecture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                      <Table.Head className="w-24">Board</Table.Head>
                      <Table.Head className="w-28">Duration</Table.Head>
                      <Table.Head className="w-28">Status</Table.Head>
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
                            title="Click to preview lecture"
                          >
                            <img
                              src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                              alt={v.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
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
                          {renderBoardBadge(v.board || activeChapterObj?.board || activeSubjectObj?.board)}
                        </Table.Cell>

                        <Table.Cell>
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {v.duration && v.duration !== 'N/A' ? v.duration : 'N/A'}
                          </span>
                        </Table.Cell>

                        <Table.Cell>
                          <Badge variant={v.status === 'active' ? 'active' : 'inactive'} dot size="sm">
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
                              aria-label="Play video"
                            >
                              <Play className="w-4 h-4 fill-primary-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(v)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                v.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                              aria-label={v.status === 'active' ? 'Deactivate lecture' : 'Activate lecture'}
                            >
                              {v.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(v)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Lecture"
                              aria-label="Edit lecture"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(v)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-status-error hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Lecture"
                              aria-label="Delete lecture"
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
        <form onSubmit={handleSaveVideo} className="space-y-2.5">
          {/* Class and Stream / Status Selectors */}
          {formClassHasStreams ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                label="Academic Class"
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
              <Select
                label="Academic Stream"
                value={formStreamId}
                onChange={(e) => setFormStreamId(e.target.value)}
                options={streams.map((s) => ({ value: s.id, label: s.name }))}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <Select
                label="Academic Class"
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
              <Select
                label="Video Status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                options={[
                  { value: 'active', label: 'Active (Visible to Students)' },
                  { value: 'inactive', label: 'Hidden from Students' },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {/* Subject Selector */}
            <Select
              label="Subject"
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              options={availableFormSubjects.map((s) => ({
                value: s.id,
                label: formatSubjectOptionLabel(s),
              }))}
              helperText={availableFormSubjects.length === 0 ? 'No subjects in context.' : undefined}
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
              helperText={availableFormChapters.length === 0 ? 'No chapters in subject.' : undefined}
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

          <div className="space-y-1">
            <Input
              label="YouTube Video Link (Unlisted)"
              placeholder="e.g. https://youtu.be/dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
              value={formVideoUrl}
              onChange={(e) => setFormVideoUrl(e.target.value)}
              required
            />

            {/* Live Video Preview Thumbnail */}
            {parsedFormVideoId ? (
              <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                <img
                  src={`https://img.youtube.com/vi/${parsedFormVideoId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-14 h-9 rounded object-cover border border-emerald-300 shrink-0"
                />
                <div className="text-[10px] text-emerald-800 leading-tight">
                  <span className="font-bold flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Valid YouTube Video Link
                  </span>
                  <span className="text-slate-600 font-mono text-[9px]">ID: {parsedFormVideoId}</span>
                </div>
              </div>
            ) : formVideoUrl.trim() ? (
              <p className="text-[10px] text-status-error font-medium">
                Invalid YouTube URL format. Please paste a standard YouTube watch/share URL.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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
              min="1"
              value={formOrderIndex}
              onChange={(e) => setFormOrderIndex(e.target.value)}
              error={orderConflict ? `Lecture #${formOrderIndex} already used for "${orderConflict.title}"` : undefined}
              required
            />
          </div>

          {formClassHasStreams && (
            <Select
              label="Video Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Active (Visible to Students)' },
                { value: 'inactive', label: 'Hidden from Students' },
              ]}
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              disabled={isSaving || !parsedFormVideoId || availableFormChapters.length === 0 || Boolean(orderConflict)}
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
          onClose={() => {
            setIsLandscapeMode(false);
            if (window.screen?.orientation?.unlock) {
              try {
                window.screen.orientation.unlock();
              } catch (e) {}
            }
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            setPlayingVideo(null);
          }}
          title={playingVideo.title}
          subtitle={`${playingVideo.className} • ${playingVideo.subjectName} • Chapter: ${playingVideo.chapterName}`}
          maxWidth="max-w-2xl"
          closeOnBackdropClick={false}
        >
          {/* Modal Header Bar Controls */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 truncate min-w-0">
              Lectures
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleCustomFullscreen}
                className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap border border-transparent"
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                    <span>Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                    <span>Full Screen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleLandscapeMode}
                className={`inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap border ${
                  isLandscapeMode
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30'
                }`}
                title="Rotate to Full Landscape Mode"
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span>Landscape</span>
              </button>
            </div>
          </div>

          <div
            ref={playerContainerRef}
            className={`relative bg-black select-none flex items-center justify-center transition-all ${
              isLandscapeMode
                ? 'player-force-landscape'
                : 'aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-slate-800'
            }`}
          >
            <iframe
              src={`https://www.youtube.com/embed/${playingVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`}
              title={playingVideo.title}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />

            {/* Percentage-Based Top Left Overlay: Mobile ke liye 75% width & 26% height, Desktop ke liye exact 70% width & 17% height */}
            <div
              className={`absolute top-0 left-0 z-20 pointer-events-auto bg-transparent cursor-default select-none ${
                (isFullscreen || isLandscapeMode) ? 'w-[70%] h-[18%] sm:h-[17%]' : 'w-[55%] sm:w-[70%] h-[30%] sm:h-[17%]'
              }`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />

            {/* Floating Buttons in Fullscreen mode (Part 2) */}
            {isFullscreen && !isLandscapeMode && (
              <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-1/2 sm:-translate-x-1/2 z-40 flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleCustomFullscreen}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-black text-white text-[11px] sm:text-xs font-semibold shadow-xl border border-slate-700 transition-all cursor-pointer backdrop-blur-md"
                  title="Exit Fullscreen"
                >
                  <Minimize className="w-4 h-4 text-primary-400" />
                  <span>Exit Fullscreen</span>
                </button>

                <button
                  type="button"
                  onClick={toggleLandscapeMode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/90 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-semibold shadow-xl border border-amber-400 transition-all cursor-pointer backdrop-blur-md"
                  title="Rotate to Landscape"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate</span>
                </button>
              </div>
            )}

            {/* Floating Exit Button in Landscape Mode (Part 3) */}
            {isLandscapeMode && (
              <div className="absolute top-3 left-3 z-40 flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleLandscapeMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-black text-white text-xs font-semibold shadow-2xl border border-slate-700 transition-all cursor-pointer backdrop-blur-md"
                  title="Exit Landscape"
                >
                  <Minimize className="w-4 h-4 text-primary-400" />
                  <span>Exit Landscape</span>
                </button>
              </div>
            )}

            {/* Dynamic State-Aware Bottom Overlay: Auto-calibrates height for Mobile Normal (45px), Large Phone/Phablet (54px), Desktop (64px), and Fullscreen (58px/64px) */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 pointer-events-auto bg-transparent cursor-default select-none ${
                (isFullscreen || isLandscapeMode) ? 'h-[58px] sm:h-[64px]' : 'h-[45px] min-[450px]:h-[59px] sm:h-[64px]'
              }`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />
          </div>
        </Modal>
      )}

      {/* Delete Video Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Video Lecture"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Video"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

