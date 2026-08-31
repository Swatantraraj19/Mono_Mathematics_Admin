import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Globe, Lock, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../hooks/useAuth';
import { fetchAppAccessSettings, updateAppAccessMode } from '../../services/settingsService';

export const SettingsPage = () => {
  const { userProfile, instituteId: authInstituteId } = useAuth();
  const currentInstituteId = authInstituteId || userProfile?.instituteId || 'mono_math_01';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessMode, setAccessMode] = useState('open'); // 'open' | 'approval'
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchAppAccessSettings(currentInstituteId);
      setAccessMode(data.accessMode || 'open');
      if (data.updatedAt) {
        setLastUpdated(
          data.updatedAt.toDate
            ? data.updatedAt.toDate().toLocaleString()
            : new Date(data.updatedAt).toLocaleString()
        );
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [currentInstituteId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAppAccessMode(accessMode, currentInstituteId, userProfile?.name || 'Admin');
      toast.success('App access mode updated successfully!');
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <RefreshCw className="w-7 h-7 text-primary-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading access settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary-50 rounded-xl text-primary-600 border border-primary-100 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              App Access Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control student access permission mode for Mono Mathematics App.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadSettings}
          icon={RefreshCw}
          disabled={saving}
        >
          Refresh
        </Button>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-600" />
              Student Access Control Mode
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select how newly registered students gain access to class lectures.
            </p>
          </div>

          <Badge variant={accessMode === 'open' ? 'success' : 'warning'} size="sm">
            Current: {accessMode === 'open' ? 'Open Access' : 'Approval Required'}
          </Badge>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Open Access */}
          <div
            onClick={() => setAccessMode('open')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              accessMode === 'open'
                ? 'border-primary-600 bg-primary-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Open Access</h3>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Instant Access
                  </span>
                </div>
              </div>
              <input
                type="radio"
                name="accessMode"
                checked={accessMode === 'open'}
                onChange={() => setAccessMode('open')}
                className="mt-1 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              All registered students get instant access to videos & live classes without manual admin approval.
            </p>
          </div>

          {/* Option 2: Approval Required */}
          <div
            onClick={() => setAccessMode('approval')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              accessMode === 'approval'
                ? 'border-primary-600 bg-primary-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Approval Required</h3>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Manual Review
                  </span>
                </div>
              </div>
              <input
                type="radio"
                name="accessMode"
                checked={accessMode === 'approval'}
                onChange={() => setAccessMode('approval')}
                className="mt-1 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Students must be manually approved by admin before they can access video lectures or live classes.
            </p>
          </div>
        </div>

        {/* Footer info & Save button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {lastUpdated ? `Last updated: ${lastUpdated}` : 'Not yet modified'}
          </span>

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            icon={Save}
          >
            Save Access Mode
          </Button>
        </div>
      </form>
    </div>
  );
};
