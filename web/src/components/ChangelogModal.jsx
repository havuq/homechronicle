import { X, Sparkles } from 'lucide-react';
import CHANGELOG from '../changelog.js';

export default function ChangelogModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">What's New</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Entries */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version + i}>
              <div className="mb-1.5">
                <span className="inline-block text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mb-1">{entry.version}</span>
                <div className="text-sm font-semibold text-gray-900">{entry.title}</div>
              </div>
              <ul className="space-y-1 list-none">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-0.5 text-blue-400 text-xs flex-shrink-0">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
              {i < CHANGELOG.length - 1 && <hr className="mt-4 border-gray-100" />}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
