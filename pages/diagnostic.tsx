import { GetServerSideProps } from 'next';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { IAdvisory } from '@/models/Advisory';

interface DiagnosticPageProps {
  advisory: IAdvisory | null;
  allFields: string[];
  error?: string;
}

export default function DiagnosticPage({ advisory, allFields, error }: DiagnosticPageProps) {
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Diagnostic Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!advisory) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">No Advisories Found</h1>
        <p>No advisories exist in the database.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Advisory Data Diagnostic</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Latest Advisory</h2>
        <div className="bg-gray-800 rounded-lg p-6 space-y-2">
          <p><strong>ID:</strong> {advisory._id.toString()}</p>
          <p><strong>Advisory ID:</strong> {advisory.advisoryId || 'N/A'}</p>
          <p><strong>Title:</strong> {advisory.title}</p>
          <p><strong>Full Title:</strong> {advisory.fullTitle || 'N/A'}</p>
          <p><strong>Severity:</strong> {advisory.severity}</p>
          <p><strong>Criticality:</strong> {advisory.criticality || 'N/A'}</p>
          <p><strong>Threat Type:</strong> {advisory.threatType || 'N/A'}</p>
          <p><strong>Category:</strong> {advisory.category}</p>
          <p><strong>TLP:</strong> {advisory.tlp || 'N/A'}</p>
          <p><strong>Vendor:</strong> {advisory.vendor || 'N/A'}</p>
          <p><strong>Affected Product:</strong> {advisory.affectedProduct || 'N/A'}</p>
          <p><strong>Affected Products:</strong> {advisory.affectedProducts?.join(', ') || 'N/A'}</p>
          <p><strong>Target Sectors:</strong> {advisory.targetSectors?.join(', ') || 'N/A'}</p>
          <p><strong>Regions:</strong> {advisory.regions?.join(', ') || 'N/A'}</p>
          <p><strong>CVE IDs:</strong> {advisory.cveIds?.join(', ') || 'N/A'}</p>
          <p><strong>MITRE Tactics Count:</strong> {advisory.mitreTactics?.length || 0}</p>
          <p><strong>Recommendations Count:</strong> {advisory.recommendations?.length || 0}</p>
          <p><strong>Patch Details Count:</strong> {advisory.patchDetails?.length || 0}</p>
          <p><strong>References Count:</strong> {advisory.references?.length || 0}</p>
          <p><strong>HTML File Name:</strong> {advisory.htmlFileName || 'N/A'}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">MITRE Tactics</h2>
        <div className="bg-gray-800 rounded-lg p-6">
          {advisory.mitreTactics && advisory.mitreTactics.length > 0 ? (
            <ul className="space-y-2">
              {advisory.mitreTactics.map((tactic, idx) => (
                <li key={idx} className="p-2 bg-gray-700 rounded">
                  <strong>{tactic.techniqueId}</strong> - {tactic.technique} ({tactic.tacticName})
                </li>
              ))}
            </ul>
          ) : (
            <p>No MITRE tactics found</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
        <div className="bg-gray-800 rounded-lg p-6">
          {advisory.recommendations && advisory.recommendations.length > 0 ? (
            <ul className="space-y-2 list-disc list-inside">
              {advisory.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          ) : (
            <p>No recommendations found</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">All Fields in Document ({allFields.length})</h2>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-3 gap-2">
            {allFields.map((field, idx) => (
              <div key={idx} className="p-2 bg-gray-700 rounded text-sm">
                {field}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    await dbConnect();
    
    // Fetch the latest advisory
    const advisoryDoc = await Advisory.findOne().sort({ createdAt: -1 }).lean();
    
    if (!advisoryDoc) {
      return {
        props: {
          advisory: null,
          allFields: [],
        }
      };
    }

    // Get all field names
    const allFields = Object.keys(advisoryDoc);
    
    // Serialize the advisory for JSON
    const advisory = JSON.parse(JSON.stringify(advisoryDoc));
    
    return {
      props: {
        advisory,
        allFields,
      }
    };
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return {
      props: {
        advisory: null,
        allFields: [],
        error: error.message || 'Unknown error',
      }
    };
  }
};
