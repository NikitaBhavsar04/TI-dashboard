import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import HydrationSafe from '@/components/HydrationSafe';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  Radar,
  Shield,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';


export default function AdvisoryEditor() {
  const [advisory, setAdvisory] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResults, setSweepResults] = useState<any>(null);

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    if (hasRole('admin')) {
      const advisory_id = router.query.advisory_id || router.query.id;
      console.log('[EDITOR] Extracted advisory_id from router.query:', advisory_id, router.query);
      
      if (advisory_id) {
        const idStr = advisory_id as string;
        
        // Validate ID format
        if (!idStr.includes('-') && idStr.length > 30) {
          console.error('[EDITOR] ⚠️ This looks like an article ID (hash), not an advisory ID!');
          console.error('[EDITOR] Article ID format: long hex string (e.g., 0e08fc7810c9e8a64e...)');
          console.error('[EDITOR] Advisory ID format: SOC-TA-YYYYMMDD-HHMMSS');
          toast.error(`Invalid ID format! This appears to be an article ID. Advisory IDs should be in format: SOC-TA-YYYYMMDD-HHMMSS`);
          router.push('/admin/raw-articles');
          return;
        }
        
        fetchAdvisoryWithRetry(idStr);
      } else {
        console.log('[EDITOR] No advisory_id found - creating blank advisory template');
        createBlankAdvisory();
      }
    }
    // eslint-disable-next-line
  }, [user, hasRole, authLoading, router.query]);

  // Retry logic for fetching advisory
  const fetchAdvisoryWithRetry = async (advisoryId: string, attempts = 0) => {
    setLoading(true);
    try {
      console.log(`[EDITOR] Attempting to fetch advisory (attempt ${attempts + 1}):`, advisoryId);
      await fetchAdvisory(advisoryId);
    } catch (err: any) {
      console.error(`[EDITOR] Fetch advisory failed (attempt ${attempts + 1}):`, err);
      if (attempts < 3) {
        setTimeout(() => fetchAdvisoryWithRetry(advisoryId, attempts + 1), 1000);
      } else {
        const errorMsg = err.message || 'Unknown error';
        toast.error(`Failed to load advisory: ${errorMsg}`);
        router.push('/admin/raw-articles');
      }
    }
  };

  const fetchAdvisory = async (advisoryId: string) => {
    console.log('[EDITOR] Fetching advisory from API:', `/api/generated-advisory/${advisoryId}`);
    const res = await fetch(`/api/generated-advisory/${advisoryId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('[EDITOR] API response status:', res.status, res.statusText);
    
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        console.error('[EDITOR] API error response:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
        if (errorData.details) {
          console.error('[EDITOR] Error details:', errorData.details);
        }
      } catch (e) {
        const text = await res.text();
        console.error('[EDITOR] API error response (text):', text);
        if (text) errorMessage += ` - ${text}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await res.json();
    console.log('[EDITOR] API response data:', data);
    
    // Map OpenSearch data to editor format
    const src = data._source || data;
    if (!src) {
      throw new Error('Invalid response format: missing _source or data');
    }
    
    const mapped = mapAdvisoryData(src);
    console.log('[EDITOR] Mapped advisory data:', mapped);
    setAdvisory(mapped);
    setLoading(false);
  };

  // Map OpenSearch advisory data to editor format
  function mapAdvisoryData(src: any) {
    // Convert cvss array to object { [cve]: { score, ... } }
    let cvssObj: any = {};
    if (Array.isArray(src.cvss)) {
      src.cvss.forEach((item: any) => {
        if (item.cve) {
          cvssObj[item.cve] = {
            score: item.score,
            vector: item.vector,
            criticality: item.criticality,
            source: item.source
          };
        }
      });
    } else if (typeof src.cvss === 'object') {
      cvssObj = src.cvss;
    }

    // Load IP sweep results if present
    if (src.ip_sweep) {
      setSweepResults(src.ip_sweep);
    }

    return {
      ...src,
      cvss: cvssObj,
      exec_summary_parts: src.exec_summary_parts || (src.exec_summary ? src.exec_summary.split('\n\n') : []),
      sectors: src.sectors || [],
      regions: src.regions || [],
      cves: src.cves || [],
      mitre: src.mitre || [],
      mbc: src.mbc || [],
      iocs: src.iocs || [],
      recommendations: src.recommendations || [],
      patch_details: src.patch_details || [],
      references: src.references || [],
      ip_sweep: src.ip_sweep || null,
    };
  }

  // Create a blank advisory template for new advisory creation
  const createBlankAdvisory = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('.')[0].replace(/[-:T]/g, '').slice(0, 15); // Format: YYYYMMDDHHMMSS
    const advisory_id = `SOC-TA-${timestamp}`;

    const blankAdvisory = {
      advisory_id: advisory_id,
      title: '',
      exec_summary: '',
      exec_summary_parts: ['', '', ''],
      severity: 'Medium',
      timestamp: now.toISOString(),
      created_at: now.toISOString(),
      sectors: [],
      regions: [],
      cves: [],
      cvss: {},
      mitre: [],
      mbc: [],
      iocs: [],
      recommendations: [''],
      patch_details: [''],
      references: [''],
      sources: [],
      is_new: true // Flag to indicate this is a new advisory
    };

    console.log('[EDITOR] Created blank advisory template:', blankAdvisory);
    setAdvisory(blankAdvisory);
    setLoading(false);
  };

  const handleIPSweep = async () => {
    if (!advisory) {
      toast.error('Advisory data not loaded');
      return;
    }

    try {
      setSweeping(true);
      let advisoryId = advisory.advisory_id;

      // If advisory is new (unsaved), save it first before running IP sweep
      if (advisory.is_new) {
        console.log('[EDITOR] Advisory is new, auto-saving before IP sweep...');
        toast.info('Saving advisory first...');
        
        try {
          const advisoryToSave = {
            ...advisory,
            created_at: advisory.created_at || new Date().toISOString(),
            timestamp: advisory.timestamp || new Date().toISOString()
          };
          delete advisoryToSave.is_new;

          const saveResponse = await fetch('/api/eagle-nest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(advisoryToSave)
          });
          
          const saveData = await saveResponse.json();
          if (!saveData.success) {
            throw new Error(saveData.error || 'Failed to save advisory');
          }
          
          // Update the advisory state with the saved version
          setAdvisory({ ...advisory, is_new: false });
          toast.success('Advisory saved successfully!');
        } catch (saveError: any) {
          console.error('[EDITOR] Auto-save failed:', saveError);
          toast.error(`Failed to save advisory: ${saveError.message}`);
          setSweeping(false);
          return;
        }
      }

      console.log('[EDITOR] Starting IP sweep for:', advisoryId);
      toast.success('IP Sweep started... This may take a moment.');

      const response = await fetch('/api/advisory/ip-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ advisory_id: advisoryId })
      });

      const data = await response.json();
      console.log('[EDITOR] IP Sweep response:', data);

      if (data.success) {
        setSweepResults(data.results);
        setAdvisory({ ...advisory, ip_sweep: data.results });

        const impactedCount = data.results.impacted_clients?.length || 0;
        if (impactedCount > 0) {
          toast.success(`IP Sweep completed! Found matches in ${impactedCount} client(s)`);
        } else {
          toast.success('IP Sweep completed! No matches found in any client firewall logs');
        }
      } else {
        console.error('[EDITOR] IP Sweep failed:', data);
        toast.error(`IP Sweep failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('[EDITOR] Error running IP sweep:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSweeping(false);
    }
  };

  const handleSave = async () => {
    if (!advisory) return;
    try {
      setSaving(true);
      console.log('[EDITOR] Saving advisory:', {
        has_advisory_id: !!advisory.advisory_id,
        advisory_id: advisory.advisory_id,
        title: advisory.title,
        is_new: advisory.is_new
      });

      // Ensure advisory has created_at if not present
      const advisoryToSave = {
        ...advisory,
        created_at: advisory.created_at || new Date().toISOString(),
        timestamp: advisory.timestamp || new Date().toISOString(),
        // Filter out empty strings from recommendations, patch_details, and references
        recommendations: (advisory.recommendations || []).filter((r: string) => r.trim()),
        patch_details: (advisory.patch_details || []).filter((p: string) => p.trim()),
        references: (advisory.references || []).filter((ref: string) => ref.trim())
      };

      // Remove the is_new flag before saving
      delete advisoryToSave.is_new;

      const response = await fetch('/api/eagle-nest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(advisoryToSave)
      });
      const data = await response.json();
      console.log('[EDITOR] Save response:', data);
      if (data.success) {
        const message = advisory.is_new ? 'New advisory created and saved to Eagle Nest successfully!' : 'Advisory updated and saved to Eagle Nest successfully!';
        toast.success(message);
        router.push('/admin/eagle-nest');
      } else {
        console.error('[EDITOR] Save failed:', data);
        toast.error(`Failed to save: ${data.error}`);
      }
    } catch (error: any) {
      console.error('[EDITOR] Error saving advisory:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <HydrationSafe>
        <div className="min-h-screen bg-tech-gradient flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="spinner-neon mx-auto"></div>
            <div className="text-neon-blue font-orbitron text-lg tracking-wider animate-pulse">
              Loading advisory from database...<br />
              <span className="text-xs text-slate-400">If this takes too long, please wait a few seconds or refresh.</span>
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  if (!advisory) return null;

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        
        <div className="relative z-10">
          <Head>
            <title>{advisory.is_new ? 'Create Advisory' : 'Edit Advisory'} - EaglEye IntelDesk</title>
          </Head>

          {/* Header */}
          <div className="glass-panel border-b border-slate-700/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/admin/raw-articles">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-all duration-200">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="font-rajdhani">Cancel</span>
                    </button>
                  </Link>
                  <div>
                    <h1 className="text-xl font-orbitron font-bold text-white">
                      {advisory.is_new ? 'Create New Advisory' : 'Advisory Editor'}
                    </h1>
                    <p className="text-slate-400 font-rajdhani text-sm">
                      {advisory.is_new ? 'Generate a new threat intelligence advisory' : advisory.advisory_id}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg text-white hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron font-bold shadow-lg shadow-green-500/20"
                >
                  {saving ? (
                    <>
                      <Save className="h-5 w-5 animate-pulse" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>{advisory.is_new ? 'Create & Save to Eagle Nest' : 'Done - Save to Eagle Nest'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="glass-panel-hover p-8 space-y-6">
              
              {/* Advisory ID (Read-only) */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Advisory ID</label>
                <input
                  type="text"
                  value={advisory.advisory_id || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 font-mono"
                  placeholder={advisory.is_new ? "Auto-generated when saved" : ""}
                />
                {advisory.is_new && (
                  <p className="text-slate-400 text-sm mt-1 font-rajdhani">
                    Advisory ID will be automatically generated when you save this advisory
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Title</label>
                <input
                  type="text"
                  value={advisory.title || ''}
                  onChange={(e) => setAdvisory({...advisory, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                />
              </div>

              {/* Criticality */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Criticality</label>
                <select
                  value={advisory.criticality || 'MEDIUM'}
                  onChange={(e) => setAdvisory({...advisory, criticality: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Threat Type */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Threat Type</label>
                <input
                  type="text"
                  value={advisory.threat_type || ''}
                  onChange={(e) => setAdvisory({...advisory, threat_type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                />
              </div>

              {/* TLP Classification */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">TLP Classification</label>
                <select
                  value={advisory.tlp || 'AMBER'}
                  onChange={(e) => setAdvisory({...advisory, tlp: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                >
                  <option value="WHITE">WHITE</option>
                  <option value="GREEN">GREEN</option>
                  <option value="AMBER">AMBER</option>
                  <option value="RED">RED</option>
                </select>
              </div>

              {/* Executive Summary */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-white font-orbitron font-bold">Executive Summary</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newParts = [...(advisory.exec_summary_parts || [])];
                      newParts.push('');
                      setAdvisory({ ...advisory, exec_summary_parts: newParts });
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-orbitron"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Paragraph</span>
                  </button>
                </div>
                {advisory.exec_summary_parts && advisory.exec_summary_parts.map((part: string, index: number) => (
                  <div key={index} className="relative mb-4 group">
                    <textarea
                      value={part}
                      onChange={(e) => {
                        const newParts = [...advisory.exec_summary_parts];
                        newParts[index] = e.target.value;
                        setAdvisory({
                          ...advisory, 
                          exec_summary_parts: newParts,
                          exec_summary: newParts.join('\n\n')
                        });
                      }}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                      placeholder={
                        index === 0 ? "Paragraph 1: Threat Overview (What is the vulnerability/incident?)" :
                        index === 1 ? "Paragraph 2: Impact Analysis (What are the risks and consequences?)" :
                        index === 2 ? "Paragraph 3: Recommendations & Conclusion (Suggested actions and next steps)" :
                        `Paragraph ${index + 1}`
                      }
                    />
                    {advisory.exec_summary_parts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newParts = advisory.exec_summary_parts.filter((_: any, i: number) => i !== index);
                          setAdvisory({
                            ...advisory,
                            exec_summary_parts: newParts,
                            exec_summary: newParts.join('\n\n')
                          });
                        }}
                        className="absolute -right-2 -top-2 p-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                        title="Delete paragraph"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Affected Product */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Affected Product</label>
                <input
                  type="text"
                  value={advisory.affected_product || ''}
                  onChange={(e) => setAdvisory({...advisory, affected_product: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Vendor</label>
                <input
                  type="text"
                  value={advisory.vendor || ''}
                  onChange={(e) => setAdvisory({...advisory, vendor: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                />
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Sectors (comma-separated)</label>
                <input
                  type="text"
                  value={advisory.sectors?.join(', ') || ''}
                  onChange={(e) => setAdvisory({...advisory, sectors: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="e.g., Financial, Healthcare, Government"
                />
              </div>

              {/* Regions */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Regions (comma-separated)</label>
                <input
                  type="text"
                  value={advisory.regions?.join(', ') || ''}
                  onChange={(e) => setAdvisory({...advisory, regions: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="e.g., North America, Europe, Asia"
                />
              </div>

              {/* CVEs */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">CVEs (comma-separated)</label>
                <input
                  type="text"
                  value={advisory.cves?.join(', ') || ''}
                  onChange={(e) => setAdvisory({...advisory, cves: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="e.g., CVE-2024-1234, CVE-2024-5678"
                />
              </div>

              {/* CVSS Scores (Editable) */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">CVSS Scores (Editable)</label>
                <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-cyan-500/10 border-b border-cyan-400/30">
                      <tr>
                        <th className="text-left text-cyan-300 font-rajdhani font-semibold text-sm py-4 px-6">CVE</th>
                        <th className="text-left text-cyan-300 font-rajdhani font-semibold text-sm py-4 px-6">SCORE</th>
                        <th className="text-left text-cyan-300 font-rajdhani font-semibold text-sm py-4 px-6">CRITICALITY</th>
                        <th className="text-left text-cyan-300 font-rajdhani font-semibold text-sm py-4 px-6">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(advisory.cvss && Object.entries(advisory.cvss).length > 0
                        ? Object.entries(advisory.cvss)
                        : []).map(([cve, data]: [string, any], idx: number) => (
                        <tr key={cve} className="border-b border-slate-700/50 hover:bg-cyan-500/10 transition-colors">
                          <td className="py-4 px-6">
                            <input
                              type="text"
                              value={cve}
                              onChange={e => {
                                const newCvss = { ...(advisory.cvss || {}) };
                                const value = e.target.value;
                                if (value !== cve) {
                                  newCvss[value] = newCvss[cve];
                                  delete newCvss[cve];
                                }
                                setAdvisory({ ...advisory, cvss: newCvss });
                              }}
                              className="w-full bg-slate-900/50 border border-cyan-400/30 rounded px-2 py-1 text-cyan-400 font-mono"
                              placeholder="CVE-2024-XXXX"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={data.score || ''}
                              onChange={e => {
                                const newCvss = { ...(advisory.cvss || {}) };
                                newCvss[cve] = { ...newCvss[cve], score: e.target.value };
                                setAdvisory({ ...advisory, cvss: newCvss });
                              }}
                              className="w-full bg-slate-900/50 border border-cyan-400/30 rounded px-2 py-1 text-white font-rajdhani"
                              placeholder="Score"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={data.criticality || ''}
                              onChange={e => {
                                const newCvss = { ...(advisory.cvss || {}) };
                                newCvss[cve] = { ...newCvss[cve], criticality: e.target.value };
                                setAdvisory({ ...advisory, cvss: newCvss });
                              }}
                              className="w-full bg-slate-900/50 border border-cyan-400/30 rounded px-2 py-1 text-cyan-400 font-rajdhani"
                            >
                              <option value="">Select</option>
                              <option value="LOW">LOW</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HIGH">HIGH</option>
                              <option value="CRITICAL">CRITICAL</option>
                            </select>
                          </td>
                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={() => {
                                const newCvss = { ...(advisory.cvss || {}) };
                                delete newCvss[cve];
                                setAdvisory({ ...advisory, cvss: newCvss });
                              }}
                              className="px-3 py-1 bg-red-600/70 hover:bg-red-600/90 text-white rounded font-rajdhani text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => {
                      const newCvss = { ...(advisory.cvss || {}) };
                      let newCve = "CVE-" + (Math.floor(Math.random() * 9000) + 1000) + "-" + (Math.floor(Math.random() * 900000) + 100000);
                      let i = 0;
                      while (newCvss[newCve]) {
                        newCve = `CVE-NEW-${++i}`;
                      }
                      newCvss[newCve] = { score: '', criticality: '' };
                      setAdvisory({ ...advisory, cvss: newCvss });
                    }}
                    className="mt-3 px-4 py-2 bg-cyan-600/70 hover:bg-cyan-600/90 text-white rounded font-orbitron"
                  >
                    + Add CVSS Row
                  </button>
                </div>
              </div>

              {/* MITRE ATT&CK (Editable) */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">⚔️ MITRE ATT&CK Framework</label>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-green-500/10 border-b border-green-400/30">
                        <tr>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TACTIC NAME</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE ID</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(advisory.mitre || []).map((tactic: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-green-500/10 transition-colors">
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={tactic.tactic || tactic.tacticName || tactic.name || ''}
                                onChange={(e) => {
                                  const newMitre = [...advisory.mitre];
                                  newMitre[idx] = { ...newMitre[idx], tactic: e.target.value };
                                  setAdvisory({ ...advisory, mitre: newMitre });
                                }}
                                className="w-full bg-slate-900/50 border border-green-400/30 rounded px-2 py-1 text-white font-rajdhani"
                                placeholder="Tactic name"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={tactic.id || tactic.techniqueId || ''}
                                onChange={(e) => {
                                  const newMitre = [...advisory.mitre];
                                  newMitre[idx] = { ...newMitre[idx], id: e.target.value };
                                  setAdvisory({ ...advisory, mitre: newMitre });
                                }}
                                className="w-full bg-slate-900/50 border border-green-400/30 rounded px-2 py-1 text-green-400 font-mono"
                                placeholder="T1234"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={tactic.technique || tactic.techniques?.[0] || ''}
                                onChange={(e) => {
                                  const newMitre = [...advisory.mitre];
                                  newMitre[idx] = { ...newMitre[idx], technique: e.target.value };
                                  setAdvisory({ ...advisory, mitre: newMitre });
                                }}
                                className="w-full bg-slate-900/50 border border-green-400/30 rounded px-2 py-1 text-white font-rajdhani"
                                placeholder="Technique name"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <button
                                type="button"
                                onClick={() => {
                                  const newMitre = advisory.mitre.filter((_: any, i: number) => i !== idx);
                                  setAdvisory({ ...advisory, mitre: newMitre });
                                }}
                                className="px-3 py-1 bg-red-600/70 hover:bg-red-600/90 text-white rounded font-rajdhani text-sm"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      onClick={() => setAdvisory({ ...advisory, mitre: [...(advisory.mitre || []), { tactic: '', id: '', technique: '' }] })}
                      className="mt-3 px-4 py-2 bg-green-600/70 hover:bg-green-600/90 text-white rounded font-orbitron"
                    >
                      + Add MITRE Row
                    </button>
                  </div>
                </div>

              {/* MBC (Editable) */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">🦠 Malware Behavior Catalog (MBC)</label>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-amber-500/10 border-b border-amber-400/30">
                        <tr>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">BEHAVIOR</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">OBJECTIVE</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">CONFIDENCE</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">EVIDENCE</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(advisory.mbc || []).map((behavior: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-amber-500/10 transition-colors">
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={behavior.behavior || ''}
                                onChange={(e) => {
                                  const newMbc = [...advisory.mbc];
                                  newMbc[idx] = { ...newMbc[idx], behavior: e.target.value };
                                  setAdvisory({ ...advisory, mbc: newMbc });
                                }}
                                className="w-full bg-slate-900/50 border border-amber-400/30 rounded px-2 py-1 text-white font-rajdhani"
                                placeholder="Behavior"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={behavior.objective || ''}
                                onChange={(e) => {
                                  const newMbc = [...advisory.mbc];
                                  newMbc[idx] = { ...newMbc[idx], objective: e.target.value };
                                  setAdvisory({ ...advisory, mbc: newMbc });
                                }}
                                className="w-full bg-slate-900/50 border border-amber-400/30 rounded px-2 py-1 text-white font-rajdhani"
                                placeholder="Objective"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <select
                                value={behavior.confidence || ''}
                                onChange={(e) => {
                                  const newMbc = [...advisory.mbc];
                                  newMbc[idx] = { ...newMbc[idx], confidence: e.target.value };
                                  setAdvisory({ ...advisory, mbc: newMbc });
                                }}
                                className="w-full bg-slate-900/50 border border-amber-400/30 rounded px-2 py-1 text-amber-400 font-mono"
                              >
                                <option value="">Select</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </td>
                            <td className="py-4 px-6">
                              <textarea
                                value={behavior.evidence || ''}
                                onChange={(e) => {
                                  const newMbc = [...advisory.mbc];
                                  newMbc[idx] = { ...newMbc[idx], evidence: e.target.value };
                                  setAdvisory({ ...advisory, mbc: newMbc });
                                }}
                                className="w-full bg-slate-900/50 border border-amber-400/30 rounded px-2 py-1 text-white font-rajdhani text-sm"
                                placeholder="Evidence"
                                rows={2}
                              />
                            </td>
                            <td className="py-4 px-6">
                              <button
                                type="button"
                                onClick={() => {
                                  const newMbc = advisory.mbc.filter((_: any, i: number) => i !== idx);
                                  setAdvisory({ ...advisory, mbc: newMbc });
                                }}
                                className="px-3 py-1 bg-red-600/70 hover:bg-red-600/90 text-white rounded font-rajdhani text-sm"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      onClick={() => setAdvisory({ ...advisory, mbc: [...(advisory.mbc || []), { behavior: '', objective: '', confidence: '', evidence: '' }] })}
                      className="mt-3 px-4 py-2 bg-amber-600/70 hover:bg-amber-600/90 text-white rounded font-orbitron"
                    >
                      + Add MBC Row
                    </button>
                  </div>
                </div>

              {/* IOCs (Indicators of Compromise) */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">🔍 Indicators of Compromise (IOCs)</label>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-red-500/10 border-b border-red-400/30">
                        <tr>
                          <th className="text-left text-red-300 font-rajdhani font-semibold text-sm py-4 px-6">TYPE</th>
                          <th className="text-left text-red-300 font-rajdhani font-semibold text-sm py-4 px-6">VALUE</th>
                          <th className="text-left text-red-300 font-rajdhani font-semibold text-sm py-4 px-6">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(advisory.iocs || []).map((ioc: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-red-500/10 transition-colors">
                            <td className="py-4 px-6">
                              <select
                                value={ioc.type || ''}
                                onChange={(e) => {
                                  const newIocs = [...advisory.iocs];
                                  newIocs[idx] = { ...newIocs[idx], type: e.target.value };
                                  setAdvisory({ ...advisory, iocs: newIocs });
                                }}
                                className="w-full bg-slate-900/50 border border-red-400/30 rounded px-2 py-1 text-red-400 font-mono uppercase"
                              >
                                <option value="">Select Type</option>
                                <option value="domain">DOMAIN</option>
                                <option value="url">URL</option>
                                <option value="ip">IP</option>
                                <option value="ipv4">IPV4</option>
                                <option value="hash">HASH</option>
                                <option value="md5">MD5</option>
                                <option value="sha1">SHA1</option>
                                <option value="sha256">SHA256</option>
                                <option value="email">EMAIL</option>
                                <option value="file">FILE</option>
                              </select>
                            </td>
                            <td className="py-4 px-6">
                              <input
                                type="text"
                                value={ioc.value || ''}
                                onChange={(e) => {
                                  const newIocs = [...advisory.iocs];
                                  newIocs[idx] = { ...newIocs[idx], value: e.target.value };
                                  setAdvisory({ ...advisory, iocs: newIocs });
                                }}
                                className="w-full bg-slate-900/50 border border-red-400/30 rounded px-2 py-1 text-white font-mono text-sm"
                                placeholder="IOC value"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <button
                                type="button"
                                onClick={() => {
                                  const newIocs = advisory.iocs.filter((_: any, i: number) => i !== idx);
                                  setAdvisory({ ...advisory, iocs: newIocs });
                                }}
                                className="px-3 py-1 bg-red-600/70 hover:bg-red-600/90 text-white rounded font-rajdhani text-sm"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      onClick={() => setAdvisory({ ...advisory, iocs: [...(advisory.iocs || []), { type: '', value: '' }] })}
                      className="mt-3 px-4 py-2 bg-red-600/70 hover:bg-red-600/90 text-white rounded font-orbitron"
                    >
                      + Add IOC
                    </button>
                  </div>
                </div>

              {/* Recommendations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-white font-orbitron font-bold">Recommendations</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newRecs = [...(advisory.recommendations || []), ''];
                      setAdvisory({ ...advisory, recommendations: newRecs });
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-orbitron"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Recommendation</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {(advisory.recommendations || []).map((rec: string, index: number) => (
                    <div key={index} className="relative group">
                      <input
                        type="text"
                        value={rec}
                        onChange={(e) => {
                          const newRecs = [...advisory.recommendations];
                          newRecs[index] = e.target.value;
                          setAdvisory({ ...advisory, recommendations: newRecs });
                        }}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani pr-12"
                        placeholder={`Recommendation ${index + 1}`}
                      />
                      {(advisory.recommendations || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRecs = advisory.recommendations.filter((_: any, i: number) => i !== index);
                            setAdvisory({ ...advisory, recommendations: newRecs });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                          title="Delete recommendation"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Patch Details */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-white font-orbitron font-bold">Patch Details</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newPatches = [...(advisory.patch_details || []), ''];
                      setAdvisory({ ...advisory, patch_details: newPatches });
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-orbitron"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Patch Detail</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {(advisory.patch_details || []).map((patch: string, index: number) => (
                    <div key={index} className="relative group">
                      <input
                        type="text"
                        value={patch}
                        onChange={(e) => {
                          const newPatches = [...advisory.patch_details];
                          newPatches[index] = e.target.value;
                          setAdvisory({ ...advisory, patch_details: newPatches });
                        }}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani pr-12"
                        placeholder={`Patch Detail ${index + 1}`}
                      />
                      {(advisory.patch_details || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPatches = advisory.patch_details.filter((_: any, i: number) => i !== index);
                            setAdvisory({ ...advisory, patch_details: newPatches });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                          title="Delete patch detail"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* References */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-white font-orbitron font-bold">References</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newRefs = [...(advisory.references || []), ''];
                      setAdvisory({ ...advisory, references: newRefs });
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 hover:bg-blue-500/30 transition-all text-xs font-orbitron"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Reference</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {(advisory.references || []).map((ref: string, index: number) => (
                    <div key={index} className="relative group">
                      <input
                        type="text"
                        value={ref}
                        onChange={(e) => {
                          const newRefs = [...advisory.references];
                          newRefs[index] = e.target.value;
                          setAdvisory({ ...advisory, references: newRefs });
                        }}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani pr-12"
                        placeholder={`Reference URL ${index + 1} (e.g., https://example.com)`}
                      />
                      {(advisory.references || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRefs = advisory.references.filter((_: any, i: number) => i !== index);
                            setAdvisory({ ...advisory, references: newRefs });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                          title="Delete reference"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* IP Sweep Section */}
              <div className="border-t border-slate-700/50 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-orbitron font-bold text-lg flex items-center space-x-2">
                      <Radar className="h-5 w-5 text-purple-400" />
                      <span>🔍 IP Sweep - Check Client Impact</span>
                    </h3>
                    <p className="text-slate-400 font-rajdhani text-sm mt-1">
                      Scan all client firewall logs to check if any IOCs from this advisory have been detected
                    </p>
                  </div>
                  <button
                    onClick={handleIPSweep}
                    disabled={sweeping || !advisory}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron font-bold shadow-lg shadow-purple-500/20"
                    title={advisory.is_new ? 'Advisory will be auto-saved before running IP sweep' : 'Scan firewall logs for detected IOCs'}
                  >
                    {sweeping ? (
                      <>
                        <Radar className="h-5 w-5 animate-spin" />
                        <span>{advisory.is_new ? 'Saving & Scanning...' : 'Scanning...'}</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        <span>{advisory.is_new ? 'Save & Run IP Sweep' : 'Run IP Sweep'}</span>
                      </>
                    )}
                  </button>
                </div>

                {advisory.is_new && (
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-blue-400 font-rajdhani font-semibold">Auto-Save Enabled</div>
                      <div className="text-slate-300 font-rajdhani text-sm">
                        This advisory will be automatically saved before running IP sweep
                      </div>
                    </div>
                  </div>
                )}

                {/* IP Sweep Results */}
                {(advisory.ip_sweep || sweepResults) && !advisory.is_new && (
                  <div className="mt-4 bg-slate-800/30 border border-slate-600/50 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Clock className="h-5 w-5 text-slate-400" />
                      <div className="text-slate-400 font-rajdhani text-sm">
                        Last checked: {new Date((advisory.ip_sweep || sweepResults).checked_at).toLocaleString()}
                      </div>
                    </div>

                    {((advisory.ip_sweep || sweepResults).impacted_clients?.length || 0) === 0 ? (
                      <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-green-400 font-rajdhani font-semibold">No Matches Found</div>
                          <div className="text-slate-300 font-rajdhani text-sm">
                            None of the IOCs from this advisory were detected in any client firewall logs
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-4 flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-red-400 font-rajdhani font-semibold">
                              {(advisory.ip_sweep || sweepResults).impacted_clients.length} Client(s) Impacted
                            </div>
                            <div className="text-slate-300 font-rajdhani text-sm">
                              IOCs from this advisory were detected in the following client firewall logs
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {(advisory.ip_sweep || sweepResults).impacted_clients.map((client: any, idx: number) => (
                            <div key={idx} className="bg-slate-900/50 border border-slate-600/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="text-white font-orbitron font-bold">{client.client_name}</div>
                                  <div className="text-slate-400 font-rajdhani text-sm">ID: {client.client_id}</div>
                                </div>
                                <div className="px-3 py-1 bg-red-500/20 border border-red-400/30 rounded-lg text-red-400 font-rajdhani text-sm font-semibold">
                                  {client.matches.length} Match{client.matches.length !== 1 ? 'es' : ''}
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-slate-800/50 border-b border-slate-600/50">
                                    <tr>
                                      <th className="text-left text-slate-400 font-rajdhani text-xs py-2 px-3">IOC</th>
                                      <th className="text-left text-slate-400 font-rajdhani text-xs py-2 px-3">Field</th>
                                      <th className="text-left text-slate-400 font-rajdhani text-xs py-2 px-3">Log Index</th>
                                      <th className="text-left text-slate-400 font-rajdhani text-xs py-2 px-3">Timestamp</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {client.matches.map((match: any, matchIdx: number) => (
                                      <tr key={matchIdx} className="border-b border-slate-700/50">
                                        <td className="py-2 px-3 text-red-400 font-mono text-sm">{match.ioc}</td>
                                        <td className="py-2 px-3 text-slate-300 font-rajdhani text-sm">{match.matched_field}</td>
                                        <td className="py-2 px-3 text-slate-400 font-rajdhani text-xs">{match.log_index}</td>
                                        <td className="py-2 px-3 text-slate-400 font-rajdhani text-xs">
                                          {new Date(match.timestamp).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
