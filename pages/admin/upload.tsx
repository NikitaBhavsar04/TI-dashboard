import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  Hash, 
  Globe, 
  Mail, 
  Server, 
  Plus, 
  X, 
  Shield,
  Eye,
  Download,
  Terminal,
  Zap
} from 'lucide-react';
import { CyberCard, CyberButton, CyberBadge, CyberLoading } from '@/components/ui/cyber-components';
import { HolographicOverlay, NeonText, TerminalWindow } from '@/components/ui/cyber-effects';
import HydrationSafe from '@/components/HydrationSafe';

interface IOC {
  type: 'IP' | 'Hash' | 'URL' | 'Domain' | 'Email';
  value: string;
  description?: string;
}

interface MitreTactic {
  id: string;
  name: string;
  techniques: string[];
}

const IOC_TYPES = ['IP', 'Hash', 'URL', 'Domain', 'Email'] as const;
const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;

const MITRE_TACTIC_NAMES = [
  'Initial Access',
  'Execution', 
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
  'Resource Development',
  'Reconnaissance'
];

const MITRE_TACTIC_IDS = [
  'TA0001', 'TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006', 'TA0007',
  'TA0008', 'TA0009', 'TA0010', 'TA0011', 'TA0040', 'TA0042', 'TA0043'
];

const TLP_LEVELS = [
  'TLP:RED',
  'TLP:AMBER',
  'TLP:GREEN',
  'TLP:WHITE'
];

const TARGET_SECTORS = [
  'Financial Services',
  'Healthcare',
  'Government',
  'Energy & Utilities',
  'Technology',
  'Manufacturing',
  'Retail',
  'Education',
  'Transportation',
  'Telecommunications',
  'Defense',
  'Critical Infrastructure',
  'Media & Entertainment',
  'Real Estate',
  'Legal Services',
  'Non-Profit',
  'Other'
];

const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia-Pacific',
  'Middle East',
  'Africa',
  'Global',
  'Arctic',
  'Caribbean',
  'Central Asia',
  'Eastern Europe',
  'Western Europe',
  'Southeast Asia',
  'East Asia',
  'South Asia',
  'Oceania'
];

interface SelectedTactic {
  id: string;
  name: string;
  technique: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    severity: 'Medium' as typeof SEVERITY_LEVELS[number],
    category: '',
    content: '',
    author: '',
    tags: [] as string[],
    references: [] as string[],
    cveIds: [] as string[],
    affectedProduct: '',
    targetSectors: [] as string[],
    regions: [] as string[],
    tlp: 'TLP:AMBER' as typeof TLP_LEVELS[number],
    recommendations: [] as string[],
    patchDetails: [] as string[]
  });
  
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [selectedTactics, setSelectedTactics] = useState<SelectedTactic[]>([]);
  const [newTactic, setNewTactic] = useState<SelectedTactic>({ id: '', name: '', technique: '' });
  
  // Temporary inputs
  const [newTag, setNewTag] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newCve, setNewCve] = useState('');
  const [newIoc, setNewIoc] = useState<IOC>({ type: 'IP', value: '', description: '' });
  const [newRecommendation, setNewRecommendation] = useState('');
  const [newPatchDetail, setNewPatchDetail] = useState('');

  // Prevent Enter key from submitting form in input fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { field: formData.title, name: 'Threat Designation' },
      { field: formData.summary, name: 'Executive Summary / Threat Description' },
      { field: formData.category, name: 'Threat Category' }
      // Temporarily removing ALL strict validation to test database saving
    ];

    const missingFields = requiredFields.filter(({ field }) => !field).map(({ name }) => name);
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n• ${missingFields.join('\n• ')}`);
      return false;
    }
    
    console.log('Form validation passed');
    console.log('Form data at validation:', JSON.stringify(formData, null, 2));
    console.log('Selected tactics:', JSON.stringify(selectedTactics, null, 2));
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields before submitting
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.summary, // Use summary as description
        summary: formData.summary,
        severity: formData.severity,
        category: formData.category,
        author: formData.author || 'Unknown Analyst',
        content: formData.summary || 'Advisory content',
        tags: formData.tags || [],
        references: formData.references || [],
        cveIds: formData.cveIds || [],
        iocs: iocs || [],
        mitreTactics: selectedTactics || [],
        // New fields with fallbacks
        affectedProduct: formData.affectedProduct || '',
        targetSectors: formData.targetSectors || [],
        regions: formData.regions || [],
        tlp: formData.tlp || 'TLP:AMBER',
        recommendations: formData.recommendations || [],
        patchDetails: formData.patchDetails || []
      };

      // Debug: Log the payload to console
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Submitting payload:', payload);
      console.log('Form data breakdown:');
      console.log('- formData.affectedProduct:', formData.affectedProduct);
      console.log('- formData.targetSectors:', formData.targetSectors);
      console.log('- formData.regions:', formData.regions);
      console.log('- formData.tlp:', formData.tlp);
      console.log('- formData.recommendations:', formData.recommendations);
      console.log('- formData.patchDetails:', formData.patchDetails);
      console.log('- selectedTactics:', selectedTactics);
      console.log('- iocs:', iocs);
      
      // Check if fields are actually populated
      console.log('Field population check:');
      Object.keys(payload).forEach(key => {
        const value = payload[key as keyof typeof payload];
        console.log(`${key}:`, typeof value, Array.isArray(value) ? `Array(${value.length})` : value);
      });

      const response = await fetch('/api/advisories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Successfully created advisory:', result);
        router.push('/admin/eagle-nest');
      } else {
        const errorData = await response.text();
        console.error('Failed to create advisory. Response:', errorData);
        throw new Error(`Failed to create advisory: ${response.status} ${errorData}`);
      }
    } catch (error) {
      console.error('Error creating advisory:', error);
      alert('Failed to create advisory. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addReference = () => {
    if (newReference.trim() && !formData.references.includes(newReference.trim())) {
      setFormData(prev => ({ ...prev, references: [...prev.references, newReference.trim()] }));
      setNewReference('');
    }
  };

  const removeReference = (ref: string) => {
    setFormData(prev => ({ ...prev, references: prev.references.filter(r => r !== ref) }));
  };

  const addCve = () => {
    if (newCve.trim() && !formData.cveIds.includes(newCve.trim())) {
      setFormData(prev => ({ ...prev, cveIds: [...prev.cveIds, newCve.trim()] }));
      setNewCve('');
    }
  };

  const removeCve = (cve: string) => {
    setFormData(prev => ({ ...prev, cveIds: prev.cveIds.filter(c => c !== cve) }));
  };

  const addIoc = () => {
    if (newIoc.value.trim()) {
      setIocs(prev => [...prev, { ...newIoc, value: newIoc.value.trim() }]);
      setNewIoc({ type: 'IP', value: '', description: '' });
    }
  };

  const removeIoc = (index: number) => {
    setIocs(prev => prev.filter((_, i) => i !== index));
  };

  const addTactic = () => {
    if (newTactic.id && newTactic.name && newTactic.technique) {
      // Check if tactic already exists
      const exists = selectedTactics.some(tactic => tactic.id === newTactic.id);
      if (!exists) {
        setSelectedTactics(prev => [...prev, { ...newTactic }]);
        setNewTactic({ id: '', name: '', technique: '' });
      }
    }
  };

  const removeTactic = (tacticId: string) => {
    setSelectedTactics(prev => prev.filter(tactic => tactic.id !== tacticId));
  };

  const toggleSector = (sector: string) => {
    setFormData(prev => ({
      ...prev,
      targetSectors: prev.targetSectors.includes(sector)
        ? prev.targetSectors.filter(s => s !== sector)
        : [...prev.targetSectors, sector]
    }));
  };

  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  };

  const addRecommendation = () => {
    if (newRecommendation.trim() && !formData.recommendations.includes(newRecommendation.trim())) {
      setFormData(prev => ({ ...prev, recommendations: [...prev.recommendations, newRecommendation.trim()] }));
      setNewRecommendation('');
    }
  };

  const removeRecommendation = (recommendation: string) => {
    setFormData(prev => ({ ...prev, recommendations: prev.recommendations.filter(r => r !== recommendation) }));
  };

  const addPatchDetail = () => {
    if (newPatchDetail.trim() && !formData.patchDetails.includes(newPatchDetail.trim())) {
      setFormData(prev => ({ ...prev, patchDetails: [...prev.patchDetails, newPatchDetail.trim()] }));
      setNewPatchDetail('');
    }
  };

  const removePatchDetail = (patchDetail: string) => {
    setFormData(prev => ({ ...prev, patchDetails: prev.patchDetails.filter(p => p !== patchDetail) }));
  };

  const getIconForIOCType = (type: string) => {
    switch (type) {
      case 'IP': return <Server className="h-4 w-4" />;
      case 'Hash': return <Hash className="h-4 w-4" />;
      case 'URL': return <Globe className="h-4 w-4" />;
      case 'Domain': return <Globe className="h-4 w-4" />;
      case 'Email': return <Mail className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <HydrationSafe>
        <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="relative z-10">
            <Head>
              <title>CYBER THREAT ADVISORY GENERATOR - CLASSIFIED</title>
            </Head>

        {/* Header */}
        <div className="border-b border-cyber-blue/30 bg-cyber-dark/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <HolographicOverlay>
                  <Shield className="h-10 w-10 text-cyber-blue" />
                </HolographicOverlay>
                <div>
                  <h1 className="text-2xl font-mono font-bold">
                    <NeonText color="blue" intensity="high">
                      THREAT ADVISORY GENERATOR
                    </NeonText>
                  </h1>
                  <p className="text-cyber-green/70 font-mono text-sm">
                    [CLASSIFICATION: RESTRICTED]
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CyberButton
                  variant="ghost"
                  glowColor="green"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? 'EDIT MODE' : 'PREVIEW'}
                </CyberButton>
                <CyberButton variant="hologram" glowColor="blue" onClick={() => router.push('/advisories')}>
                  <Terminal className="h-4 w-4 mr-2" />
                  RETURN TO CONSOLE
                </CyberButton>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Basic Information Section */}
            <CyberCard variant="matrix" className="p-8">
              <TerminalWindow title="BASIC THREAT PARAMETERS">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        THREAT DESIGNATION *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                 focus:ring-2 focus:ring-cyber-blue/20"
                        placeholder="Enter threat designation..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        THREAT CATEGORY *
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                 focus:ring-2 focus:ring-cyber-blue/20"
                        placeholder="e.g., Malware, APT, Vulnerability..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        ANALYST ID
                      </label>
                      <input
                        type="text"
                        value={formData.author}
                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                 focus:ring-2 focus:ring-cyber-blue/20"
                        placeholder="Enter analyst identifier..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        THREAT LEVEL
                      </label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                        className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                 focus:ring-2 focus:ring-cyber-blue/20"
                        required
                      >
                        {SEVERITY_LEVELS.map(level => (
                          <option key={level} value={level} className="bg-cyber-dark">
                            {level.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        TLP CLASSIFICATION
                      </label>
                      <select
                        value={formData.tlp}
                        onChange={(e) => setFormData(prev => ({ ...prev, tlp: e.target.value as typeof TLP_LEVELS[number] }))}
                        className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                 text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                 focus:ring-2 focus:ring-cyber-blue/20"
                      >
                        {TLP_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        CVE IDENTIFIERS
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCve}
                          onChange={(e) => setNewCve(e.target.value)}
                          onKeyDown={(e) => {
                            handleKeyDown(e);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCve();
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                   text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                   focus:ring-2 focus:ring-cyber-blue/20"
                          placeholder="CVE-YYYY-NNNN"
                        />
                        <CyberButton type="button" variant="cyber" glowColor="blue" onClick={addCve}>
                          <Plus className="h-4 w-4" />
                        </CyberButton>
                      </div>
                      {formData.cveIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.cveIds.map((cve, index) => (
                            <CyberBadge key={index} variant="warning" className="flex items-center space-x-1">
                              <span>{cve}</span>
                              <button type="button" onClick={() => removeCve(cve)}>
                                <X className="h-3 w-3" />
                              </button>
                            </CyberBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Threat Details Section */}
            <CyberCard variant="holographic" className="p-8">
              <TerminalWindow title="THREAT DETAILS">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-mono text-cyber-green mb-2">
                      EXECUTIVE SUMMARY / THREAT DESCRIPTION *
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20 resize-none"
                      placeholder="Comprehensive executive summary and threat description..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-cyber-green mb-2">
                      AFFECTED PRODUCT *
                    </label>
                    <input
                      type="text"
                      value={formData.affectedProduct}
                      onChange={(e) => setFormData(prev => ({ ...prev, affectedProduct: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20"
                      placeholder="e.g., Windows 11, Apache HTTP Server, Chrome Browser..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-cyber-green mb-2">
                      TARGET SECTORS *
                    </label>
                    <div className="bg-cyber-dark/30 border border-cyber-blue/30 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {TARGET_SECTORS.map(sector => (
                          <label key={sector} className={`flex items-center space-x-2 cursor-pointer group p-2 rounded transition-all ${
                            formData.targetSectors.includes(sector) 
                              ? 'bg-cyber-purple/20 border border-cyber-purple/40' 
                              : 'hover:bg-cyber-blue/10'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.targetSectors.includes(sector)}
                              onChange={() => toggleSector(sector)}
                              className="form-checkbox bg-cyber-dark border-cyber-purple/50 text-cyber-purple 
                                       focus:ring-cyber-purple/30 rounded"
                            />
                            <span className={`font-mono text-sm transition-colors ${
                              formData.targetSectors.includes(sector)
                                ? 'text-cyber-purple font-bold'
                                : 'text-cyber-green/80 group-hover:text-cyber-green'
                            }`}>
                              {sector}
                            </span>
                          </label>
                        ))}
                      </div>
                      {formData.targetSectors.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-cyber-purple/20">
                          <div className="flex flex-wrap gap-2">
                            {formData.targetSectors.map(sector => (
                              <CyberBadge key={sector} variant="info" className="text-xs bg-cyber-purple/20 border-cyber-purple text-cyber-purple">
                                {sector}
                              </CyberBadge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-cyber-green mb-2">
                      REGIONS *
                    </label>
                    <div className="bg-cyber-dark/30 border border-cyber-blue/30 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {REGIONS.map(region => (
                          <label key={region} className={`flex items-center space-x-2 cursor-pointer group p-2 rounded transition-all ${
                            formData.regions.includes(region) 
                              ? 'bg-warning-orange/20 border border-warning-orange/40' 
                              : 'hover:bg-cyber-blue/10'
                          }`}>
                            <input
                              type="checkbox"
                              checked={formData.regions.includes(region)}
                              onChange={() => toggleRegion(region)}
                              className="form-checkbox bg-cyber-dark border-warning-orange/50 text-warning-orange 
                                       focus:ring-warning-orange/30 rounded"
                            />
                            <span className={`font-mono text-sm transition-colors ${
                              formData.regions.includes(region)
                                ? 'text-warning-orange font-bold'
                                : 'text-cyber-green/80 group-hover:text-cyber-green'
                            }`}>
                              {region}
                            </span>
                          </label>
                        ))}
                      </div>
                      {formData.regions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-warning-orange/20">
                          <div className="flex flex-wrap gap-2">
                            {formData.regions.map(region => (
                              <CyberBadge key={region} variant="warning" className="text-xs bg-warning-orange/20 border-warning-orange text-warning-orange">
                                {region}
                              </CyberBadge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* IOCs Section */}
            <CyberCard variant="neon" glowColor="red" className="p-8">
              <TerminalWindow title="INDICATORS OF COMPROMISE">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={newIoc.type}
                      onChange={(e) => setNewIoc(prev => ({ ...prev, type: e.target.value as any }))}
                      className="px-4 py-3 bg-cyber-dark/50 border border-cyber-red/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-red 
                               focus:ring-2 focus:ring-cyber-red/20"
                    >
                      {IOC_TYPES.map(type => (
                        <option key={type} value={type} className="bg-cyber-dark">
                          {type}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={newIoc.value}
                      onChange={(e) => setNewIoc(prev => ({ ...prev, value: e.target.value }))}
                      onKeyDown={(e) => {
                        handleKeyDown(e);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addIoc();
                        }
                      }}
                      className="px-4 py-3 bg-cyber-dark/50 border border-cyber-red/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-red 
                               focus:ring-2 focus:ring-cyber-red/20"
                      placeholder="IOC value..."
                    />

                    <CyberButton type="button" variant="cyber" glowColor="red" onClick={addIoc}>
                      <Plus className="h-4 w-4 mr-2" />
                      ADD IOC
                    </CyberButton>
                  </div>

                  <input
                    type="text"
                    value={newIoc.description || ''}
                    onChange={(e) => setNewIoc(prev => ({ ...prev, description: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-red/30 rounded-lg 
                             text-cyber-green font-mono focus:outline-none focus:border-cyber-red 
                             focus:ring-2 focus:ring-cyber-red/20"
                    placeholder="IOC description (optional)..."
                  />

                  {iocs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-mono text-cyber-red">DETECTED INDICATORS:</h4>
                      {iocs.map((ioc, index) => (
                        <div key={index} className="flex items-center justify-between bg-cyber-dark/30 p-3 rounded border border-cyber-red/20">
                          <div className="flex items-center space-x-3">
                            {getIconForIOCType(ioc.type)}
                            <span className="font-mono text-cyber-green">{ioc.type}</span>
                            <span className="font-mono text-cyber-blue">{ioc.value}</span>
                            {ioc.description && (
                              <span className="text-sm text-cyber-green/70">- {ioc.description}</span>
                            )}
                          </div>
                          <CyberButton 
                            type="button" 
                            variant="ghost" 
                            glowColor="red" 
                            onClick={() => removeIoc(index)}
                          >
                            <X className="h-4 w-4" />
                          </CyberButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* MITRE ATT&CK Section */}
            <CyberCard variant="glitch" className="p-8">
              <TerminalWindow title="MITRE ATT&CK FRAMEWORK">
                <div className="space-y-6">
                  {/* Add New Tactic */}
                  <div className="bg-cyber-dark/20 border border-cyber-purple/30 rounded-lg p-4">
                    <h4 className="font-mono text-cyber-purple font-bold mb-4 flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      ADD MITRE ATT&CK TACTIC
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-mono text-cyber-green/70 mb-1">
                          TECHNIQUE ID *
                        </label>
                        <input
                          type="text"
                          value={newTactic.id}
                          onChange={(e) => setNewTactic(prev => ({ ...prev, id: e.target.value }))}
                          onKeyDown={handleKeyDown}
                          placeholder="e.g., T1566, T1190, T1078"
                          className="w-full bg-cyber-dark border border-cyber-blue/30 rounded px-3 py-2 text-cyber-green font-mono text-sm focus:outline-none focus:border-cyber-purple"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-cyber-green/70 mb-1">
                          TACTIC NAME *
                        </label>
                        <select
                          value={newTactic.name}
                          onChange={(e) => setNewTactic(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-cyber-dark border border-cyber-blue/30 rounded px-3 py-2 text-cyber-green font-mono text-sm focus:outline-none focus:border-cyber-purple"
                        >
                          <option value="">Select Tactic Name</option>
                          {MITRE_TACTIC_NAMES.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-cyber-green/70 mb-1">
                          TECHNIQUE *
                        </label>
                        <input
                          type="text"
                          value={newTactic.technique}
                          onChange={(e) => setNewTactic(prev => ({ ...prev, technique: e.target.value }))}
                          onKeyDown={handleKeyDown}
                          placeholder="Describe the technique used..."
                          className="w-full bg-cyber-dark border border-cyber-blue/30 rounded px-3 py-2 text-cyber-green font-mono text-sm focus:outline-none focus:border-cyber-purple"
                        />
                      </div>
                    </div>
                    <CyberButton 
                      type="button"
                      variant="cyber" 
                      glowColor="purple"
                      onClick={addTactic}
                      disabled={!newTactic.id || !newTactic.name || !newTactic.technique}
                      className="w-full md:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      ADD TACTIC
                    </CyberButton>
                  </div>

                  {/* Selected Tactics List */}
                  {selectedTactics.length > 0 && (
                    <div className="bg-cyber-dark/20 border border-cyber-green/30 rounded-lg p-4">
                      <h4 className="font-mono text-cyber-green font-bold mb-4 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        SELECTED TACTICS ({selectedTactics.length})
                      </h4>
                      <div className="space-y-3">
                        {selectedTactics.map((tactic, index) => (
                          <div 
                            key={`${tactic.id}-${index}`}
                            className="bg-cyber-dark/30 border border-cyber-purple/30 rounded-lg p-3 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <CyberBadge variant="info" className="text-xs">
                                  {tactic.id}
                                </CyberBadge>
                                <span className="font-mono text-cyber-purple font-bold text-sm">
                                  {tactic.name}
                                </span>
                              </div>
                              <p className="text-cyber-green/80 font-mono text-xs">
                                <span className="text-cyber-blue font-bold">TECHNIQUE:</span> {tactic.technique}
                              </p>
                            </div>
                            <CyberButton
                              type="button"
                              variant="ghost"
                              glowColor="red"
                              onClick={() => removeTactic(tactic.id)}
                              className="ml-3"
                            >
                              <X className="h-4 w-4" />
                            </CyberButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTactics.length === 0 && (
                    <div className="text-center py-8 text-cyber-green/50 font-mono text-sm">
                      No MITRE ATT&CK tactics selected yet. Add tactics above to enhance threat intelligence.
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Recommendations Section */}
            <CyberCard variant="neon" glowColor="green" className="p-8">
              <TerminalWindow title="RECOMMENDATIONS">
                <div className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-mono text-cyber-green mb-2">
                      SECURITY RECOMMENDATIONS *
                    </label>
                    <p className="text-xs font-mono text-cyber-green/70 mb-3">
                      Add at least one security recommendation
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newRecommendation}
                      onChange={(e) => setNewRecommendation(e.target.value)}
                      onKeyDown={(e) => {
                        handleKeyDown(e);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRecommendation();
                        }
                      }}
                      placeholder="Enter security recommendation..."
                      className="flex-1 px-4 py-3 bg-cyber-dark/50 border border-cyber-green/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-green 
                               focus:ring-2 focus:ring-cyber-green/20"
                    />
                    <CyberButton 
                      type="button"
                      variant="cyber" 
                      glowColor="green"
                      onClick={addRecommendation}
                    >
                      <Plus className="h-4 w-4" />
                    </CyberButton>
                  </div>
                  {formData.recommendations.length > 0 && (
                    <div className="space-y-2">
                      {formData.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-center justify-between bg-cyber-dark/30 border border-cyber-green/20 rounded-lg p-3">
                          <span className="text-cyber-green font-mono text-sm flex-1">{recommendation}</span>
                          <CyberButton
                            type="button"
                            variant="ghost"
                            glowColor="red"
                            onClick={() => removeRecommendation(recommendation)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </CyberButton>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.recommendations.length === 0 && (
                    <div className="text-center py-4 text-cyber-green/50 font-mono text-sm">
                      No recommendations added yet
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Patch Details Section */}
            <CyberCard variant="matrix" className="p-8">
              <TerminalWindow title="PATCH DETAILS">
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newPatchDetail}
                      onChange={(e) => setNewPatchDetail(e.target.value)}
                      onKeyDown={(e) => {
                        handleKeyDown(e);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPatchDetail();
                        }
                      }}
                      placeholder="Enter patch information..."
                      className="flex-1 px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                               text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                               focus:ring-2 focus:ring-cyber-blue/20"
                    />
                    <CyberButton 
                      type="button"
                      variant="cyber" 
                      glowColor="blue"
                      onClick={addPatchDetail}
                    >
                      <Plus className="h-4 w-4" />
                    </CyberButton>
                  </div>
                  {formData.patchDetails.length > 0 && (
                    <div className="space-y-2">
                      {formData.patchDetails.map((patchDetail, index) => (
                        <div key={index} className="flex items-center justify-between bg-cyber-dark/30 border border-cyber-blue/20 rounded-lg p-3">
                          <span className="text-cyber-green font-mono text-sm flex-1">{patchDetail}</span>
                          <CyberButton
                            type="button"
                            variant="ghost"
                            glowColor="red"
                            onClick={() => removePatchDetail(patchDetail)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </CyberButton>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.patchDetails.length === 0 && (
                    <div className="text-center py-4 text-cyber-green/50 font-mono text-sm">
                      No patch details added yet
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Metadata Section */}
            <CyberCard variant="matrix" className="p-8">
              <TerminalWindow title="METADATA & REFERENCES">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Tags */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        CLASSIFICATION TAGS
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            handleKeyDown(e);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                   text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                   focus:ring-2 focus:ring-cyber-blue/20"
                          placeholder="Add tag..."
                        />
                        <CyberButton type="button" variant="cyber" glowColor="blue" onClick={addTag}>
                          <Plus className="h-4 w-4" />
                        </CyberButton>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {formData.tags.map((tag, index) => (
                            <CyberBadge key={index} variant="success" className="flex items-center space-x-1">
                              <span>{tag}</span>
                              <button type="button" onClick={() => removeTag(tag)}>
                                <X className="h-3 w-3" />
                              </button>
                            </CyberBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* References */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-mono text-cyber-green mb-2">
                        EXTERNAL REFERENCES
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={newReference}
                          onChange={(e) => setNewReference(e.target.value)}
                          onKeyDown={(e) => {
                            handleKeyDown(e);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addReference();
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-cyber-dark/50 border border-cyber-blue/30 rounded-lg 
                                   text-cyber-green font-mono focus:outline-none focus:border-cyber-blue 
                                   focus:ring-2 focus:ring-cyber-blue/20"
                          placeholder="https://..."
                        />
                        <CyberButton type="button" variant="cyber" glowColor="blue" onClick={addReference}>
                          <Plus className="h-4 w-4" />
                        </CyberButton>
                      </div>
                      {formData.references.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {formData.references.map((ref, index) => (
                            <div key={index} className="flex items-center justify-between bg-cyber-dark/30 p-2 rounded border border-cyber-blue/20">
                              <span className="font-mono text-cyber-blue text-sm truncate flex-1 mr-2">{ref}</span>
                              <CyberButton 
                                type="button" 
                                variant="ghost" 
                                glowColor="blue" 
                                onClick={() => removeReference(ref)}
                              >
                                <X className="h-3 w-3" />
                              </CyberButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TerminalWindow>
            </CyberCard>

            {/* Submit Section */}
            <CyberCard variant="holographic" className="p-8">
              <div className="flex justify-center space-x-6">
                <CyberButton
                  type="button"
                  variant="ghost"
                  glowColor="red"
                  onClick={() => router.push('/advisories')}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  ABORT OPERATION
                </CyberButton>
                
                <CyberButton
                  type="submit"
                  variant="cyber"
                  glowColor="green"
                  disabled={isLoading}
                  className="px-8"
                >
                  {isLoading ? (
                    <CyberLoading variant="cyber" size="sm" className="mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'PROCESSING...' : 'DEPLOY ADVISORY'}
                </CyberButton>
              </div>
            </CyberCard>
          </form>
        </div>
        </div>
      </div>
    </HydrationSafe>
    </ProtectedRoute>
  );
}
