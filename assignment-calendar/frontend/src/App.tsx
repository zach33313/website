import { useState } from 'react';
import { Calendar, Settings, Github } from 'lucide-react';
import { CalendarPanel } from './components/calendar/CalendarPanel';
import { AssignmentPanel } from './components/assignment/AssignmentPanel';
import { CronDashboard } from './components/cron/CronDashboard';
import { TabNav } from './components/common/TabNav';
import { useAssignmentStore } from './stores/assignmentStore';

type MainTab = 'calendar' | 'jobs';

const MAIN_TABS = [
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
  { id: 'jobs', label: 'Scheduled Jobs', icon: <Settings size={16} /> },
];

function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('calendar');
  const { assignment } = useAssignmentStore();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Calendar className="text-primary-400" size={24} />
              </div>
              <div>
                <h1 className="font-semibold text-white">Assignment Calendar</h1>
                <p className="text-xs text-[#6a6a6a]">
                  Canvas LMS integration with AI-powered study guides
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#6a6a6a] hover:text-white transition-colors"
                title="View on GitHub"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <TabNav
            tabs={MAIN_TABS}
            activeTab={activeMainTab}
            onChange={(tab) => setActiveMainTab(tab as MainTab)}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeMainTab === 'calendar' && <CalendarPanel />}
        {activeMainTab === 'jobs' && <CronDashboard />}
      </main>

      {/* Assignment Panel (slide-over) */}
      {assignment && <AssignmentPanel />}

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6a6a6a]">
            <p>Canvas LMS Assignment Calendar with AI Study Guides</p>
            <div className="flex items-center gap-6">
              <a
                href="https://www.instructure.com/canvas"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                Canvas LMS
              </a>
              <a
                href="https://docs.trychroma.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                ChromaDB
              </a>
              <a
                href="https://openai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a0a0a0] transition-colors"
              >
                OpenAI
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
