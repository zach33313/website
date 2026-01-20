import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCronStore } from '../../stores/cronStore';
import { JobList } from './JobList';
import { JobHistory } from './JobHistory';
import { JobForm } from './JobForm';
import { Modal } from '../common/Modal';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function CronDashboard() {
  const {
    jobs,
    recentRuns,
    selectedJobId,
    jobHistory,
    jobTypes,
    loading,
    running,
    error,
    fetchJobs,
    fetchJobTypes,
    fetchRecentRuns,
    selectJob,
    createJob,
    deleteJob,
    runJob,
    toggleJob,
  } = useCronStore();

  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchJobTypes();
    fetchRecentRuns();
  }, [fetchJobs, fetchJobTypes, fetchRecentRuns]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const handleCreateJob = async (job: Parameters<typeof createJob>[0]) => {
    await createJob(job);
    setShowCreateModal(false);
  };

  const handleDeleteJob = async () => {
    if (selectedJobId && confirm('Are you sure you want to delete this job?')) {
      await deleteJob(selectedJobId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Scheduled Jobs</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchJobs();
              fetchRecentRuns();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[#2a2a2a] text-[#a0a0a0] hover:text-white transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            New Job
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Main content */}
      {loading && jobs.length === 0 ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job list */}
          <div className="lg:col-span-2">
            <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4">
              <h3 className="text-sm font-medium text-[#6a6a6a] mb-4">
                All Jobs ({jobs.length})
              </h3>
              <JobList
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelect={selectJob}
                onRun={runJob}
                onToggle={toggleJob}
                running={running}
              />
            </div>
          </div>

          {/* Job details / History */}
          <div className="space-y-4">
            {selectedJob ? (
              <>
                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[#6a6a6a]">
                      Job Details
                    </h3>
                    <button
                      onClick={handleDeleteJob}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete job"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-[#6a6a6a]">Name:</span>
                      <span className="ml-2 text-white">{selectedJob.name}</span>
                    </div>
                    <div>
                      <span className="text-[#6a6a6a]">Type:</span>
                      <span className="ml-2 text-white">{selectedJob.job_type}</span>
                    </div>
                    <div>
                      <span className="text-[#6a6a6a]">Schedule:</span>
                      <span className="ml-2 text-white font-mono">
                        {selectedJob.schedule}
                      </span>
                    </div>
                    {selectedJob.config && (
                      <div>
                        <span className="text-[#6a6a6a]">Config:</span>
                        <pre className="mt-1 p-2 bg-[#0a0a0a] rounded text-xs text-[#a0a0a0] overflow-x-auto">
                          {JSON.stringify(selectedJob.config, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4">
                  <h3 className="text-sm font-medium text-[#6a6a6a] mb-4">
                    Run History
                  </h3>
                  <JobHistory runs={jobHistory} />
                </div>
              </>
            ) : (
              <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-4">
                <h3 className="text-sm font-medium text-[#6a6a6a] mb-4">
                  Recent Activity
                </h3>
                <JobHistory runs={recentRuns} showJobName />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Job"
      >
        <JobForm
          jobTypes={jobTypes}
          onSubmit={handleCreateJob}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}
