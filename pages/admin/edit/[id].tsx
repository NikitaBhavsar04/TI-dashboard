import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Save,
  ArrowLeft,
  Shield,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { CyberCard, CyberButton, CyberBadge } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';
import { IAdvisory } from '@/models/Advisory';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';

interface EditAdvisoryProps {
  advisory: IAdvisory;
}

export default function EditAdvisory({ advisory }: EditAdvisoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: advisory.title || '',
    description: advisory.description || '',
    content: advisory.content || '',
    summary: advisory.summary || '',
    severity: advisory.severity || 'Medium',
    category: advisory.category || '',
    author: advisory.author || '',
    cvss: advisory.cvss || '',
    tlp: advisory.tlp || '',
    affectedProduct: advisory.affectedProduct || '',
    tags: advisory.tags || [],
    cveIds: advisory.cveIds || [],
    targetSectors: advisory.targetSectors || [],
    regions: advisory.regions || [],
    recommendations: advisory.recommendations || [],
    patchDetails: advisory.patchDetails || [],
    mitreTactics: advisory.mitreTactics || [],
    iocs: advisory.iocs || [],
    references: advisory.references || []
  });

  // State for dynamic arrays
  const [newTag, setNewTag] = useState('');
  const [newCve, setNewCve] = useState('');
  const [newSector, setNewSector] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newRecommendation, setNewRecommendation] = useState('');
  const [newPatchDetail, setNewPatchDetail] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newIoc, setNewIoc] = useState({ type: 'IP', value: '', description: '' });
  const [newTactic, setNewTactic] = useState({ id: '', name: '', technique: '' });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addArrayItem = (field: string, item: any, setState: any) => {
    if (field === 'iocs' && (!item.type || !item.value)) return;
    if (field === 'mitreTactics' && (!item.id || !item.name)) return;
    if (typeof item === 'string' && !item.trim()) return;

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], item]
    }));
    setState(field === 'iocs' ? { type: 'IP', value: '', description: '' } : 
              field === 'mitreTactics' ? { id: '', name: '', technique: '' } : '');
  };

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/advisories/${advisory._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        router.push(`/advisory/${advisory._id}`);
      } else {
        const error = await response.json();
        alert('Failed to update advisory: ' + error.message);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update advisory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <HydrationSafe>
        <div className="min-h-screen bg-cyber-dark">
          <Head>
            <title>Edit Advisory - THREATWATCH INTELLIGENCE</title>
            <meta name="description" content="Edit threat advisory" />
          </Head>

          {/* Header */}
          <div className="border-b border-cyber-blue/30 bg-cyber-dark/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <CyberButton 
                    variant="ghost" 
                    glowColor="blue" 
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    RETURN
                  </CyberButton>
                  
                  <div className="flex items-center space-x-2">
                    <HolographicOverlay>
                      <Shield className="h-6 w-6 text-cyber-blue" />
                    </HolographicOverlay>
                    <span className="font-mono text-cyber-green">
                      EDIT THREAT ADVISORY
                    </span>
                  </div>
                </div>
                
                <CyberBadge variant="warning">ADMIN EDIT MODE</CyberBadge>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Information */}
              <CyberCard variant="glitch" className="p-8">
                <TerminalWindow title="BASIC INFORMATION">
                  <div className="space-y-6">
                    <div>
                      <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                        TITLE *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                        DESCRIPTION *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          SEVERITY *
                        </label>
                        <select
                          value={formData.severity}
                          onChange={(e) => handleInputChange('severity', e.target.value)}
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                          required
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Info">Info</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          CATEGORY *
                        </label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          AUTHOR *
                        </label>
                        <input
                          type="text"
                          value={formData.author}
                          onChange={(e) => handleInputChange('author', e.target.value)}
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          CVSS SCORE
                        </label>
                        <input
                          type="text"
                          value={formData.cvss}
                          onChange={(e) => handleInputChange('cvss', e.target.value)}
                          placeholder="e.g., 9.8"
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          TLP LEVEL
                        </label>
                        <select
                          value={formData.tlp}
                          onChange={(e) => handleInputChange('tlp', e.target.value)}
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        >
                          <option value="">Select TLP</option>
                          <option value="TLP:RED">TLP:RED</option>
                          <option value="TLP:AMBER">TLP:AMBER</option>
                          <option value="TLP:GREEN">TLP:GREEN</option>
                          <option value="TLP:WHITE">TLP:WHITE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                          AFFECTED PRODUCT
                        </label>
                        <input
                          type="text"
                          value={formData.affectedProduct}
                          onChange={(e) => handleInputChange('affectedProduct', e.target.value)}
                          className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </TerminalWindow>
              </CyberCard>

              {/* Content */}
              <CyberCard variant="matrix" className="p-8">
                <TerminalWindow title="CONTENT & ANALYSIS">
                  <div className="space-y-6">
                    <div>
                      <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                        EXECUTIVE SUMMARY
                      </label>
                      <textarea
                        value={formData.summary}
                        onChange={(e) => handleInputChange('summary', e.target.value)}
                        rows={3}
                        className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        placeholder="Brief executive summary of the threat..."
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-cyber-blue text-sm font-bold mb-2">
                        DETAILED CONTENT *
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        rows={12}
                        className="w-full bg-cyber-dark/50 border border-cyber-blue/30 rounded px-4 py-3 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                        placeholder="Detailed threat analysis content..."
                        required
                      />
                    </div>
                  </div>
                </TerminalWindow>
              </CyberCard>

              {/* Dynamic Arrays */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Tags */}
                <CyberCard variant="holographic" className="p-6">
                  <TerminalWindow title="TAGS">
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag..."
                          className="flex-1 bg-cyber-dark/50 border border-cyber-blue/30 rounded px-3 py-2 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('tags', newTag, setNewTag))}
                        />
                        <CyberButton
                          type="button"
                          variant="ghost"
                          glowColor="blue"
                          onClick={() => addArrayItem('tags', newTag, setNewTag)}
                        >
                          <Plus className="h-4 w-4" />
                        </CyberButton>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <div key={index} className="flex items-center bg-cyber-blue/20 rounded px-2 py-1">
                            <span className="text-cyber-blue font-mono text-xs">{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeArrayItem('tags', index)}
                              className="ml-2 text-cyber-red hover:text-cyber-red/70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>

                {/* CVE IDs */}
                <CyberCard variant="holographic" className="p-6">
                  <TerminalWindow title="CVE IDENTIFIERS">
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCve}
                          onChange={(e) => setNewCve(e.target.value)}
                          placeholder="CVE-YYYY-NNNN"
                          className="flex-1 bg-cyber-dark/50 border border-cyber-blue/30 rounded px-3 py-2 text-cyber-green font-mono focus:border-cyber-blue focus:outline-none"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('cveIds', newCve, setNewCve))}
                        />
                        <CyberButton
                          type="button"
                          variant="ghost"
                          glowColor="orange"
                          onClick={() => addArrayItem('cveIds', newCve, setNewCve)}
                        >
                          <Plus className="h-4 w-4" />
                        </CyberButton>
                      </div>
                      
                      <div className="space-y-2">
                        {formData.cveIds.map((cve, index) => (
                          <div key={index} className="flex items-center justify-between bg-cyber-dark/30 border border-warning-orange/20 rounded px-3 py-2">
                            <span className="text-warning-orange font-mono text-sm">{cve}</span>
                            <button
                              type="button"
                              onClick={() => removeArrayItem('cveIds', index)}
                              className="text-cyber-red hover:text-cyber-red/70"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TerminalWindow>
                </CyberCard>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <CyberButton
                  type="button"
                  variant="ghost"
                  glowColor="blue"
                  onClick={() => router.back()}
                >
                  CANCEL
                </CyberButton>
                
                <CyberButton
                  type="submit"
                  variant="cyber"
                  glowColor="green"
                  disabled={loading}
                >
                  {loading ? (
                    <>UPDATING...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      UPDATE ADVISORY
                    </>
                  )}
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      </HydrationSafe>
    </ProtectedRoute>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  await dbConnect();
  
  const advisory = await Advisory.findById(params?.id).lean();
  
  if (!advisory) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      advisory: JSON.parse(JSON.stringify(advisory)),
    },
  };
};
