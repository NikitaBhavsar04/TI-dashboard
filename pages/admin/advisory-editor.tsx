import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import HydrationSafe from '@/components/HydrationSafe';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function AdvisoryEditor() {
  const [advisory, setAdvisory] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user, hasRole, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || !hasRole('admin'))) {
      router.push('/login');
      return;
    }
    
    if (hasRole('admin')) {
      loadDraft();
    }
  }, [user, hasRole, authLoading, router]);

  const loadDraft = () => {
    const draft = localStorage.getItem('draft_advisory');
    if (draft) {
      const parsedAdvisory = JSON.parse(draft);
      console.log('[EDITOR] Loaded draft advisory:', {
        has_advisory_id: !!parsedAdvisory.advisory_id,
        advisory_id: parsedAdvisory.advisory_id,
        title: parsedAdvisory.title,
        has_created_at: !!parsedAdvisory.created_at,
        all_fields: Object.keys(parsedAdvisory)
      });
      setAdvisory(parsedAdvisory);
    } else {
      console.log('[EDITOR] No draft found in localStorage');
      router.push('/admin/raw-articles');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!advisory) return;

    try {
      setSaving(true);
      
      console.log('[EDITOR] Saving advisory:', {
        has_advisory_id: !!advisory.advisory_id,
        advisory_id: advisory.advisory_id,
        title: advisory.title
      });

      // Ensure advisory has created_at if not present
      const advisoryToSave = {
        ...advisory,
        created_at: advisory.created_at || new Date().toISOString()
      };
      
      const response = await fetch('/api/eagle-nest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(advisoryToSave)
      });

      const data = await response.json();

      console.log('[EDITOR] Save response:', data);

      if (data.success) {
        localStorage.removeItem('draft_advisory');
        alert('✅ Advisory saved to Eagle Nest successfully!');
        router.push('/admin/eagle-nest');
      } else {
        console.error('[EDITOR] Save failed:', data);
        alert(`Failed to save: ${data.error}${data.received_fields ? '\nReceived fields: ' + data.received_fields.join(', ') : ''}`);
      }
    } catch (error: any) {
      console.error('[EDITOR] Error saving advisory:', error);
      alert(`Error: ${error.message}`);
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
              LOADING EDITOR...
            </div>
          </div>
        </div>
      </HydrationSafe>
    );
  }

  if (!advisory) return null;

  return (
    <HydrationSafe>
      <div className="relative min-h-screen bg-tech-gradient">
        <AnimatedBackground opacity={0.6} />
        
        <div className="relative z-10">
          <Head>
            <title>Edit Advisory - EaglEye IntelDesk</title>
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
                    <h1 className="text-xl font-orbitron font-bold text-white">Advisory Editor</h1>
                    <p className="text-slate-400 font-rajdhani text-sm">{advisory.advisory_id}</p>
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
                      <span>Done - Save to Eagle Nest</span>
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
                />
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
                <label className="block text-white font-orbitron font-bold mb-2">Executive Summary</label>
                {advisory.exec_summary_parts && advisory.exec_summary_parts.map((part: string, index: number) => (
                  <textarea
                    key={index}
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
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani mb-3"
                    placeholder={`Paragraph ${index + 1}`}
                  />
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

              {/* CVSS Info (Read-only) */}
              {advisory.cvss && Object.keys(advisory.cvss).length > 0 && (
                <div>
                  <label className="block text-white font-orbitron font-bold mb-2">CVSS Scores</label>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    {Object.entries(advisory.cvss).map(([cve, data]: [string, any]) => (
                      <div key={cve} className="mb-2 text-slate-300 font-rajdhani">
                        <span className="font-bold text-cyan-400">{cve}:</span> Score {data.score} - {data.criticality}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MITRE ATT&CK (Read-only) */}
              {advisory.mitre && advisory.mitre.length > 0 && (
                <div>
                  <label className="block text-white font-orbitron font-bold mb-2">🕸️ MITRE ATT&CK Framework</label>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-green-500/10 border-b border-green-400/30">
                        <tr>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TACTIC NAME</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE ID</th>
                          <th className="text-left text-green-300 font-rajdhani font-semibold text-sm py-4 px-6">TECHNIQUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advisory.mitre.map((tactic: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-green-500/10 transition-colors">
                            <td className="py-4 px-6 text-white font-orbitron font-semibold">
                              {tactic.tactic || tactic.tacticName || tactic.name || 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-block text-green-400 font-mono bg-green-500/10 border border-green-400/30 rounded px-2 py-1">
                                {tactic.id || tactic.techniqueId || 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-300 font-rajdhani">
                              {tactic.technique || tactic.techniques?.[0] || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MBC (Read-only) */}
              {advisory.mbc && advisory.mbc.length > 0 && (
                <div>
                  <label className="block text-white font-orbitron font-bold mb-2">🦠 Malware Behavior Catalog (MBC)</label>
                  <div className="overflow-x-auto bg-slate-800/30 border border-slate-600/50 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-amber-500/10 border-b border-amber-400/30">
                        <tr>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">OBJECTIVE</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">BEHAVIOR ID</th>
                          <th className="text-left text-amber-300 font-rajdhani font-semibold text-sm py-4 px-6">BEHAVIOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advisory.mbc.map((behavior: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700/50 hover:bg-amber-500/10 transition-colors">
                            <td className="py-4 px-6 text-white font-orbitron font-semibold">
                              {behavior.objective || 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-block text-amber-400 font-mono bg-amber-500/10 border border-amber-400/30 rounded px-2 py-1">
                                {behavior.id || 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-300 font-rajdhani">
                              {behavior.behavior || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Recommendations</label>
                <textarea
                  value={advisory.recommendations?.join('\n') || ''}
                  onChange={(e) => setAdvisory({...advisory, recommendations: e.target.value.split('\n').filter(r => r.trim())})}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="Enter each recommendation on a new line"
                />
              </div>

              {/* Patch Details */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">Patch Details</label>
                <textarea
                  value={advisory.patch_details?.join('\n') || advisory.patch_details || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAdvisory({
                      ...advisory, 
                      patch_details: value.split('\n').filter(p => p.trim())
                    });
                  }}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="Enter patch details"
                />
              </div>

              {/* References */}
              <div>
                <label className="block text-white font-orbitron font-bold mb-2">References (one per line)</label>
                <textarea
                  value={advisory.references?.join('\n') || ''}
                  onChange={(e) => setAdvisory({...advisory, references: e.target.value.split('\n').filter(r => r.trim())})}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-neon-blue/50 font-rajdhani"
                  placeholder="Enter each reference URL on a new line"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafe>
  );
}
