import { useState } from 'react';
import { Bell, Calendar, ChevronRight, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const notices = [
{
  id: 1,
  title: 'New Excise Tax Rates Effective April 2026',
  category: 'Policy Update',
  date: '2026-04-20',
  summary: 'Updated excise tax rates for alcohol and tobacco products have been approved and will take effect from April 1, 2026.',
  content: 'The Ministry of Finance has approved new excise tax rates for all alcohol and tobacco products. Manufacturers and distributors are advised to review the updated tax rates and ensure compliance. The new rates will be applicable for all products manufactured or imported after April 1, 2026.',
  important: true,
  pinned: true
},
{
  id: 2,
  title: 'Online Stamp Verification System Launch',
  category: 'System Update',
  date: '2026-04-15',
  summary: 'Public can now verify stamp authenticity using our new online verification system with QR code scanning.',
  content: 'We are pleased to announce the launch of our new online stamp verification system. Citizens can now verify the authenticity of excise stamps by visiting the Verify Stamp page and scanning the QR code on any stamp. This system helps combat counterfeit stamps and ensures product authenticity.',
  important: false,
  pinned: true
},
{
  id: 3,
  title: 'License Renewal Deadline - June 30, 2026',
  category: 'Reminder',
  date: '2026-04-10',
  summary: 'All license holders are reminded to renew their licenses before the deadline to avoid penalties.',
  content: 'This is a reminder that the license renewal deadline is June 30, 2026. All license holders must submit their renewal applications at least 30 days before the deadline. Late renewals will incur additional fees and may result in license suspension.',
  important: true,
  pinned: false
},
{
  id: 4,
  title: 'New Online Payment Portal',
  category: 'System Update',
  date: '2026-04-05',
  summary: 'A new and improved online payment portal is now available for all tax payments.',
  content: 'We have launched a new and improved online payment portal with enhanced security features and a more user-friendly interface. The new portal supports multiple payment methods including credit/debit cards and bank transfers. All users are encouraged to use the new portal for their tax payments.',
  important: false,
  pinned: false
},
{
  id: 5,
  title: 'Training Workshop for Manufacturers',
  category: 'Event',
  date: '2026-03-28',
  summary: 'A training workshop on compliance requirements will be held in Colombo next month.',
  content: 'The Excise Department will conduct a training workshop for all licensed manufacturers on updated compliance requirements and new regulations. The workshop will cover topics including stamp application procedures, reporting requirements, and compliance best practices. Registration is now open.',
  important: false,
  pinned: false
},
{
  id: 6,
  title: 'Anti-Counterfeit Campaign',
  category: 'Awareness',
  date: '2026-03-20',
  summary: 'Public awareness campaign launched to combat counterfeit excise stamps.',
  content: 'The Excise Department has launched a public awareness campaign to help citizens identify counterfeit excise stamps. The campaign includes educational materials and a verification system. Report any suspicious stamps to the nearest excise office or call our hotline.',
  important: false,
  pinned: false
},
{
  id: 7,
  title: 'System Maintenance Notice',
  category: 'Announcement',
  date: '2026-03-15',
  summary: 'Scheduled system maintenance on March 20, 2026 from 2:00 AM to 6:00 AM.',
  content: 'The IECMS system will undergo scheduled maintenance on March 20, 2026 from 2:00 AM to 6:00 AM. During this time, some services may be temporarily unavailable. We apologize for any inconvenience caused.',
  important: false,
  pinned: false
},
{
  id: 8,
  title: 'Quarterly Compliance Report Released',
  category: 'Report',
  date: '2026-03-10',
  summary: 'The quarterly compliance report for Q1 2026 is now available.',
  content: 'The quarterly compliance report for the first quarter of 2026 has been published. The report highlights key compliance metrics, enforcement actions, and industry trends. All stakeholders are encouraged to review the report.',
  important: false,
  pinned: false
}];


const NoticesAnnouncements = () => {
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [filter, setFilter] = useState('all');

  const categories = ['all', ...new Set(notices.map((n) => n.category))];

  const filteredNotices = filter === 'all' ?
  notices :
  notices.filter((n) => n.category === filter);

  const pinnedNotices = filteredNotices.filter((n) => n.pinned);
  const regularNotices = filteredNotices.filter((n) => !n.pinned);

  const getCategoryColor = (category) => {
    const colors = {
      'Policy Update': 'bg-blue-100 text-blue-800',
      'System Update': 'bg-green-100 text-green-800',
      'Reminder': 'bg-yellow-100 text-yellow-800',
      'Event': 'bg-purple-100 text-purple-800',
      'Awareness': 'bg-cyan-100 text-cyan-800',
      'Announcement': 'bg-gray-100 text-gray-800',
      'Report': 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Notices & Announcements"
        description="Latest updates and public notices from the Excise Department" />
      

      {}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) =>
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
            filter === cat ?
            'bg-gray-900 text-white border-gray-900' :
            'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`
            }>
            
              {cat === 'all' ? 'All' : cat}
            </button>
          )}
        </div>
      </div>

      {}
      {pinnedNotices.length > 0 &&
      <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Pinned
          </h2>
          <div className="space-y-3">
            {pinnedNotices.map((notice) =>
          <Card
            key={notice.id}
            className={`!p-0 cursor-pointer hover:shadow-md transition-shadow ${notice.important ? 'border-l-4 border-l-red-500' : ''}`}
            onClick={() => setSelectedNotice(notice)}>
            
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(notice.category)}`}>
                          {notice.category}
                        </span>
                        {notice.important &&
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                      </div>
                      <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{notice.summary}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {new Date(notice.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
          )}
          </div>
        </div>
      }

      {}
      {regularNotices.length > 0 &&
      <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">All Notices</h2>
          <div className="space-y-3">
            {regularNotices.map((notice) =>
          <Card
            key={notice.id}
            className="!p-0 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedNotice(notice)}>
            
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(notice.category)}`}>
                          {notice.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{notice.summary}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {new Date(notice.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
          )}
          </div>
        </div>
      }

      {}
      {selectedNotice &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(selectedNotice.category)}`}>
                  {selectedNotice.category}
                </span>
                <button
                onClick={() => setSelectedNotice(null)}
                className="text-gray-400 hover:text-gray-600">
                
                  ✕
                </button>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNotice.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedNotice.date).toLocaleDateString()}
                </span>
                {selectedNotice.important &&
              <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    Important
                  </span>
              }
              </div>
              <div className="prose prose-sm max-w-none text-gray-600">
                <p className="mb-4">{selectedNotice.summary}</p>
                <p>{selectedNotice.content}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setSelectedNotice(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

};

export default NoticesAnnouncements;