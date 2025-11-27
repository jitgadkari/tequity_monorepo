'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const useCases = [
  { id: 'data-room', label: 'Data Room', description: 'Securely share documents with investors' },
  { id: 'deal-flow', label: 'Deal Flow Management', description: 'Track and manage investment opportunities' },
  { id: 'portfolio', label: 'Portfolio Management', description: 'Monitor your portfolio companies' },
  { id: 'fundraising', label: 'Fundraising', description: 'Manage your fundraising process' },
  { id: 'due-diligence', label: 'Due Diligence', description: 'Conduct thorough due diligence' },
  { id: 'other', label: 'Other', description: 'Something else' },
];

export default function UseCaseOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) =>
      prev.includes(id) ? prev.filter((uc) => uc !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUseCases.length === 0) {
      setError('Please select at least one use case');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/platform/onboarding/use-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCases: selectedUseCases }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save use case');
      }

      router.push('/pricing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">How will you use Tequity?</h1>
          <p className="text-slate-600 mt-2">Select all that apply</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {useCases.map((useCase) => (
                <button
                  key={useCase.id}
                  type="button"
                  onClick={() => toggleUseCase(useCase.id)}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedUseCases.includes(useCase.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{useCase.label}</div>
                  <div className="text-sm text-slate-600 mt-1">{useCase.description}</div>
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || selectedUseCases.length === 0}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
