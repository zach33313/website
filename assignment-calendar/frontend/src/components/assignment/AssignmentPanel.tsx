import { useEffect } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  Award,
  BookOpen,
  Search,
  Zap,
} from 'lucide-react';
import { useAssignmentStore } from '../../stores/assignmentStore';
import { TabNav } from '../common/TabNav';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ChunksPanel } from './ChunksPanel';
import { StudyGuideViewer } from './StudyGuideViewer';
import { SolutionPanel } from './SolutionPanel';
import type { AssignmentTab } from '../../types';

const TABS = [
  { id: 'knowledge', label: 'Knowledge', icon: <Search size={16} /> },
  { id: 'study-guide', label: 'Study Guide', icon: <BookOpen size={16} /> },
  { id: 'solution', label: 'Solution', icon: <Zap size={16} /> },
];

export function AssignmentPanel() {
  const {
    assignment,
    chunks,
    studyGuide,
    solution,
    activeTab,
    loading,
    generating,
    error,
    clearAssignment,
    setActiveTab,
    processChunks,
    fetchStudyGuide,
    generateStudyGuide,
    fetchSolution,
    generateSolution,
  } = useAssignmentStore();

  useEffect(() => {
    if (assignment && activeTab === 'study-guide' && !studyGuide) {
      fetchStudyGuide();
    }
    if (assignment && activeTab === 'solution' && !solution) {
      fetchSolution();
    }
  }, [assignment, activeTab, studyGuide, solution, fetchStudyGuide, fetchSolution]);

  if (!assignment) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-[#2a2a2a] shadow-xl z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#2a2a2a]">
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-xs text-primary-400 mb-1">
            {assignment.course_name}
          </div>
          <h2 className="text-lg font-semibold text-white truncate">
            {assignment.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[#6a6a6a]">
            {assignment.due_at && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(assignment.due_at)}
              </div>
            )}
            {assignment.points_possible && (
              <div className="flex items-center gap-1">
                <Award size={14} />
                {assignment.points_possible} points
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assignment.html_url && (
            <a
              href={assignment.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#6a6a6a] hover:text-white transition-colors"
              title="Open in Canvas"
            >
              <ExternalLink size={20} />
            </a>
          )}
          <button
            onClick={clearAssignment}
            className="p-2 text-[#6a6a6a] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <TabNav
          tabs={TABS}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as AssignmentTab)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && !chunks.length && !studyGuide && !solution ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {activeTab === 'knowledge' && (
              <ChunksPanel
                chunks={chunks}
                loading={loading}
                hasChunks={assignment.chunks_generated}
                onProcess={processChunks}
              />
            )}
            {activeTab === 'study-guide' && (
              <StudyGuideViewer
                content={studyGuide}
                loading={loading}
                generating={generating}
                onGenerate={generateStudyGuide}
                onFetch={fetchStudyGuide}
              />
            )}
            {activeTab === 'solution' && (
              <SolutionPanel
                content={solution}
                loading={loading}
                generating={generating}
                onGenerate={generateSolution}
                onFetch={fetchSolution}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
