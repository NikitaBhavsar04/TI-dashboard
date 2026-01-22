// pages/api/preview-email.js
import dbConnect from '../../lib/db';
import Advisory from '../../models/Advisory';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Get the specific advisory for testing - try to find any advisory if the provided ID doesn't work
    let advisoryId = req.query.id || '6894441d2038c841fde030a6';
    let advisory;
    
    try {
      advisory = await Advisory.findById(advisoryId);
    } catch (error) {
      // If the ID format is invalid, get the first available advisory
      advisory = await Advisory.findOne();
    }
    
    if (!advisory) {
      // If still no advisory found, create a sample one for preview
      advisory = {
        _id: 'sample-id',
        title: 'Sample Critical Vulnerability Advisory',
        severity: 'critical',
        category: 'Vulnerability',
        publishedDate: new Date(),
        author: 'Security Team',
        tlp: 'amber',
        cveIds: ['CVE-2024-1234', 'CVE-2024-5678'],
        executiveSummary: 'This is a sample threat advisory demonstrating the new dark theme email template. A critical vulnerability has been discovered affecting multiple systems worldwide.',
        affectedProducts: ['Windows Server', 'Linux Systems', 'Network Infrastructure'],
        targetSectors: ['Financial Services', 'Healthcare', 'Government'],
        regions: ['North America', 'Europe', 'Asia-Pacific'],
        mitreTactics: [
          { name: 'Initial Access', id: 'T1190', technique: 'Exploit Public-Facing Application' },
          { name: 'Execution', id: 'T1059', technique: 'Command and Scripting Interpreter' }
        ],
        recommendations: [
          'Apply security patches immediately to all affected systems',
          'Monitor network traffic for suspicious activities',
          'Implement additional access controls and authentication measures',
          'Conduct thorough security assessments of all public-facing applications'
        ]
      };
    }

    // Generate the email HTML using the same function from send-advisory.js
    const emailHTML = generateEmailBody(advisory, 'This is a preview of our professional threat advisory email template. Our security team has reviewed this advisory and recommends immediate attention to the outlined recommendations.');

    // Return the HTML directly for preview
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(emailHTML);

  } catch (error) {
    console.error('Preview email error:', error);
    res.status(500).json({ message: 'Failed to generate email preview' });
  }
}

function generateEmailBody(advisory, customMessage = '') {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
  
  // TLP Color mapping
  const tlpColors = {
    'clear': { bg: '#f8fafc', text: '#1e293b', border: '#64748b' },
    'white': { bg: '#ffffff', text: '#1e293b', border: '#94a3b8' },
    'green': { bg: '#22c55e', text: '#ffffff', border: '#16a34a' },
    'amber': { bg: '#f59e0b', text: '#ffffff', border: '#d97706' },
    'yellow': { bg: '#eab308', text: '#ffffff', border: '#ca8a04' },
    'red': { bg: '#ef4444', text: '#ffffff', border: '#dc2626' }
  };
  
  const tlpColor = tlpColors[advisory.tlp?.toLowerCase()] || tlpColors.clear;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Threat Advisory: ${advisory.title}</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #e5e7eb; 
            background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%);
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
        }
        
        .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            border: 1px solid #374151;
            min-height: 100vh;
        }
        
        /* Full responsive breakpoints for all devices */
        @media only screen and (min-width: 1920px) {
            .container {
                max-width: 1400px;
                margin: 20px auto;
                border-radius: 16px;
                min-height: calc(100vh - 40px);
            }
            .content {
                padding: 50px !important;
            }
            .header h1 {
                font-size: 42px !important;
            }
            .header h2 {
                font-size: 24px !important;
            }
        }
        
        @media only screen and (min-width: 1440px) and (max-width: 1919px) {
            .container {
                max-width: 1200px;
                margin: 15px auto;
                border-radius: 12px;
            }
            .content {
                padding: 40px !important;
            }
        }
        
        @media only screen and (min-width: 1024px) and (max-width: 1439px) {
            .container {
                max-width: 1000px;
                margin: 10px auto;
                border-radius: 8px;
            }
            .content {
                padding: 35px !important;
            }
        }
        
        @media only screen and (min-width: 768px) and (max-width: 1023px) {
            .container {
                width: 95% !important;
                margin: 5px auto !important;
                border-radius: 6px !important;
            }
            .content {
                padding: 25px !important;
            }
            .header {
                padding: 35px 25px !important;
            }
            .header h1 {
                font-size: 28px !important;
            }
            .header h2 {
                font-size: 18px !important;
            }
            .logos {
                flex-direction: row !important;
                gap: 20px !important;
            }
            .logo, .logo-placeholder {
                max-width: 130px !important;
            }
            .metadata-grid {
                grid-template-columns: repeat(2, 1fr) !important;
            }
        }
        
        @media only screen and (min-width: 600px) and (max-width: 767px) {
            .container {
                width: 98% !important;
                margin: 2px auto !important;
                border-radius: 4px !important;
            }
            .content {
                padding: 20px !important;
            }
            .header {
                padding: 30px 20px !important;
            }
            .header h1 {
                font-size: 24px !important;
            }
            .header h2 {
                font-size: 16px !important;
            }
            .logos {
                flex-direction: column !important;
                gap: 15px !important;
            }
            .logo, .logo-placeholder {
                max-width: 120px !important;
            }
            .metadata-grid {
                grid-template-columns: 1fr !important;
                gap: 12px !important;
            }
            .mitre-table {
                font-size: 12px !important;
                overflow-x: auto !important;
                display: block !important;
                white-space: nowrap !important;
            }
            .mitre-table th,
            .mitre-table td {
                padding: 8px 6px !important;
                min-width: 100px;
            }
        }
        
        @media only screen and (min-width: 480px) and (max-width: 599px) {
            .container {
                width: 100% !important;
                margin: 0 !important;
                border-radius: 0 !important;
            }
            .content {
                padding: 18px !important;
            }
            .header {
                padding: 25px 18px !important;
            }
            .header h1 {
                font-size: 22px !important;
            }
            .header h2 {
                font-size: 15px !important;
            }
            .section {
                padding: 18px !important;
                margin: 16px 0 !important;
            }
            .section-header {
                padding: 14px 18px !important;
                flex-direction: column !important;
                text-align: center !important;
                gap: 10px !important;
            }
            .section-icon {
                width: 34px !important;
                height: 34px !important;
                font-size: 15px !important;
            }
            .recommendation-list li {
                padding: 16px 16px 16px 52px !important;
            }
            .recommendation-list li::before {
                left: 14px !important;
                width: 26px !important;
                height: 26px !important;
                font-size: 12px !important;
            }
        }
        
        @media only screen and (max-width: 479px) {
            .container {
                width: 100% !important;
                margin: 0 !important;
                border-radius: 0 !important;
                border: none !important;
            }
            .content {
                padding: 15px !important;
            }
            .header {
                padding: 20px 15px !important;
            }
            .header h1 {
                font-size: 20px !important;
                line-height: 1.2 !important;
            }
            .header h2 {
                font-size: 14px !important;
            }
            .logos {
                flex-direction: column !important;
                gap: 12px !important;
            }
            .logo-placeholder {
                width: 120px !important;
                height: 50px !important;
                font-size: 11px !important;
            }
            .section {
                padding: 16px !important;
                margin: 12px 0 !important;
            }
            .section-header {
                padding: 12px 16px !important;
                flex-direction: column !important;
                text-align: center !important;
                gap: 8px !important;
            }
            .section-icon {
                width: 32px !important;
                height: 32px !important;
                font-size: 14px !important;
            }
            .section-title {
                font-size: 16px !important;
            }
            .metadata-grid {
                grid-template-columns: 1fr !important;
                gap: 10px !important;
            }
            .metadata-item {
                padding: 12px !important;
            }
            .tag, .cve-tag {
                font-size: 11px !important;
                padding: 4px 8px !important;
                margin: 3px 4px 3px 0 !important;
            }
            .mitre-table {
                font-size: 11px !important;
                overflow-x: auto !important;
                display: block !important;
                white-space: nowrap !important;
            }
            .mitre-table th,
            .mitre-table td {
                padding: 6px 4px !important;
                min-width: 80px !important;
            }
            .recommendation-list li {
                padding: 14px 14px 14px 48px !important;
                font-size: 14px !important;
            }
            .recommendation-list li::before {
                left: 12px !important;
                width: 24px !important;
                height: 24px !important;
                font-size: 11px !important;
            }
            .link-panel {
                padding: 18px !important;
            }
            .link-panel a {
                font-size: 14px !important;
                padding: 10px 20px !important;
            }
        }
        
        /* Landscape orientation optimizations */
        @media only screen and (orientation: landscape) and (max-height: 500px) {
            .header {
                padding: 15px 20px !important;
            }
            .header h1 {
                font-size: 18px !important;
            }
            .header h2 {
                font-size: 13px !important;
            }
            .content {
                padding: 15px !important;
            }
            .section {
                margin: 10px 0 !important;
                padding: 15px !important;
            }
        }
        
        @media only screen and (max-width: 480px) {
            .section {
                padding: 16px !important;
                margin: 16px 0 !important;
            }
            .section-header {
                padding: 12px 16px !important;
                flex-direction: column !important;
                text-align: center !important;
                gap: 8px !important;
            }
            .section-icon {
                width: 32px !important;
                height: 32px !important;
                font-size: 14px !important;
            }
            .tag, .cve-tag {
                font-size: 11px !important;
                padding: 4px 8px !important;
            }
        }
        
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white; 
            padding: 25px 30px; 
            text-align: center;
            position: relative;
            border-bottom: 3px solid #3b82f6;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
            animation: shine 3s ease-in-out infinite;
        }
        
        @keyframes shine {
            0%, 100% { transform: translateX(-100%); opacity: 0; }
            50% { transform: translateX(100%); opacity: 1; }
        }
        
        .logos {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            margin-top: 0px;
            gap: 20px;
        }
        
        .logo {
            max-width: 200px;
            height: auto;
            filter: brightness(0) invert(1);
        }
        
        .logo-placeholder {
            width: 200px;
            height: 60px;
            background: transparent;
            border: none;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #ffffff;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header h2 {
            font-size: 18px;
            font-weight: 400;
            margin: 0;
            color: #e0f2fe;
            opacity: 0.95;
        }
        
        .content { 
            padding: 30px;
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        }
        
        .section {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border: 1px solid #6b7280;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .section-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #f9fafb;
            margin: 0;
            letter-spacing: -0.25px;
        }
        
        .severity { 
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: 600; 
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .critical { 
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            border: 1px solid #fecaca;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .high { 
            background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
            border: 1px solid #fed7aa;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .medium { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: 1px solid #fde68a;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .low { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 1px solid #6ee7b7;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .tlp-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.75px;
            background: ${tlpColor.bg} !important;
            color: ${tlpColor.text} !important;
            border: 2px solid ${tlpColor.border} !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .tlp-badge::before {
            content: "TLP: ";
            font-weight: 700;
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }
        
        .metadata-item {
            padding: 16px;
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border: 1px solid #6b7280;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .metadata-label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
        }
        
        .metadata-value {
            font-size: 16px;
            color: #f9fafb;
            font-weight: 500;
        }
        
        .tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            border: 1px solid #60a5fa;
            border-radius: 16px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 500;
            margin: 4px 6px 4px 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .cve-tag {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: 1px solid #fbbf24;
            border-radius: 16px;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: 600;
            margin: 4px 6px 4px 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .mitre-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            border: 1px solid #374151;
        }
        
        .mitre-table th { 
            padding: 16px 12px; 
            text-align: left; 
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border-bottom: 2px solid #6b7280;
            font-weight: 700;
            color: #f9fafb;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .mitre-table td { 
            padding: 14px 12px; 
            border-bottom: 1px solid #374151;
            font-size: 14px;
            vertical-align: top;
            color: #e5e7eb;
        }
        
        .mitre-table tbody tr:hover {
            background: rgba(59, 130, 246, 0.1);
        }
        
        .mitre-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .mitre-tactic {
            font-weight: 600;
            color: #f9fafb;
        }
        
        .mitre-id {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #fbbf24;
            background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #fbbf24;
            font-size: 12px;
        }
        
        .mitre-technique {
            color: #d1d5db;
            line-height: 1.5;
        }
        
        .recommendation-list {
            list-style: none;
            padding: 0;
            counter-reset: recommendation-counter;
        }
        
        .recommendation-list li {
            counter-increment: recommendation-counter;
            margin: 16px 0;
            padding: 18px 20px 18px 60px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            border: 1px solid #60a5fa;
            border-left: 4px solid #60a5fa;
            border-radius: 8px;
            position: relative;
            color: #ffffff;
            line-height: 1.6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .recommendation-list li::before {
            content: counter(recommendation-counter);
            position: absolute;
            left: 20px;
            top: 18px;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 13px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .link-panel {
            margin-top: 32px;
            padding: 24px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            border: 1px solid #60a5fa;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        
        .link-panel p {
            margin: 8px 0;
            color: #ffffff;
        }
        
        .link-panel a {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border: 1px solid #6b7280;
            border-radius: 8px;
            display: inline-block;
            margin-top: 12px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .link-panel a:hover {
            background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
            border-color: #9ca3af;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .footer { 
            background: linear-gradient(135deg, #111827 0%, #000000 100%);
            padding: 32px 30px; 
            text-align: center; 
            border-top: 3px solid #3b82f6;
            color: #9ca3af;
        }
        
        .footer h3 {
            font-size: 20px;
            font-weight: 700;
            color: #f9fafb;
            margin: 0 0 8px 0;
        }
        
        .footer p {
            margin: 6px 0;
            font-size: 14px;
        }
        
        .footer .disclaimer {
            font-size: 12px;
            color: #6b7280;
            margin-top: 16px;
            font-style: italic;
        }
        
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: #f9fafb;
            margin: 24px 0 12px 0;
        }
        
        p, li {
            font-size: 15px;
            color: #d1d5db;
            line-height: 1.6;
        }
        
        .custom-message {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            border: 1px solid #34d399;
            border-left: 4px solid #34d399;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .custom-message h3 {
            color: #ffffff;
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .custom-message p {
            color: #ecfdf5;
            margin-bottom: 0;
        }
        
        /* Dark theme optimizations */
        ::selection {
            background: #3b82f6;
            color: #ffffff;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1f2937;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #374151;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
        }
        
        /* Email client specific styles */
        table {
            border-spacing: 0;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Outlook specific */
        .ReadMsgBody { width: 100%; }
        .ExternalClass { width: 100%; }
        .ExternalClass * { line-height: 100%; }
        
        /* Print optimizations */
        @media print {
            .container {
                box-shadow: none !important;
                border: 1px solid #374151 !important;
            }
            .header::before {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logos">
                <div class="logo-placeholder">
                    <img src="https://i.ibb.co/pv0VB82D/cybertech-logo.png" alt="CyberTech Logo" style="height: 60px; width: auto; background: transparent;">
                </div>
                <div class="logo-placeholder">
                    <img src="https://i.ibb.co/20vhMNrh/Eagleye-logo-1.png" alt="Eagleye Logo" style="height: 60px; width: auto; background: transparent;">
                </div>
            </div>
            <h1>🔒 THREAT ADVISORY</h1>
            <h2>${advisory.title}</h2>
            ${advisory.tlp ? `
            <div style="margin-top: 12px;">
                <span class="tlp-badge">
                    ${advisory.tlp.toUpperCase()}
                </span>
            </div>
            ` : ''}
        </div>
        
        <div class="content">
            ${customMessage ? `
            <div class="custom-message">
                <h3>📢 Message from Security Team</h3>
                <p>${customMessage.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
            
            <!-- BASIC THREAT PARAMETERS -->
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">⚠️</div>
                    <h2 class="section-title">Threat Parameters</h2>
                </div>
                
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <div class="metadata-label">🚨 Severity Level</div>
                        <div class="metadata-value">
                            <span class="severity ${advisory.severity?.toLowerCase() || 'low'}">
                                ${advisory.severity?.toUpperCase() || 'UNKNOWN'}
                            </span>
                        </div>
                    </div>
                    
                    ${advisory.category ? `
                    <div class="metadata-item">
                        <div class="metadata-label">📂 Category</div>
                        <div class="metadata-value">${advisory.category}</div>
                    </div>
                    ` : ''}
                    
                    ${advisory.publishedDate ? `
                    <div class="metadata-item">
                        <div class="metadata-label">📅 Published Date</div>
                        <div class="metadata-value">${new Date(advisory.publishedDate).toLocaleDateString()}</div>
                    </div>
                    ` : ''}
                    
                    ${advisory.author ? `
                    <div class="metadata-item">
                        <div class="metadata-label">👤 Security Analyst</div>
                        <div class="metadata-value">${advisory.author}</div>
                    </div>
                    ` : ''}
                </div>
                
                ${(advisory.cveIds?.length || advisory.cves?.length) ? `
                <div style="margin-top: 20px;">
                    <h3>🔓 CVE Identifiers</h3>
                    <div>
                        ${(advisory.cveIds || advisory.cves || []).map(cve => `<span class="cve-tag">${cve}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- EXECUTIVE SUMMARY -->
            ${advisory.executiveSummary || advisory.summary || advisory.description ? `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">📊</div>
                    <h2 class="section-title">Executive Summary</h2>
                </div>
                <p style="text-align: justify; line-height: 1.7; font-size: 16px;">${advisory.executiveSummary || advisory.summary || advisory.description}</p>
            </div>
            ` : ''}

            <!-- AFFECTED SYSTEMS & TARGETS -->
            ${(advisory.affectedProducts?.length || advisory.targetSectors?.length || advisory.regions?.length) ? `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">🎯</div>
                    <h2 class="section-title">Affected Systems & Targets</h2>
                </div>
                
                ${advisory.affectedProducts?.length ? `
                <div style="margin-bottom: 20px;">
                    <h3>💻 Affected Products</h3>
                    <div>
                        ${advisory.affectedProducts.map(product => `<span class="tag">💻 ${product}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${advisory.targetSectors?.length ? `
                <div style="margin-bottom: 20px;">
                    <h3>🏢 Target Industries</h3>
                    <div>
                        ${advisory.targetSectors.map(sector => `<span class="tag">🏢 ${sector}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${advisory.regions?.length ? `
                <div>
                    <h3>🌍 Affected Regions</h3>
                    <div>
                        ${advisory.regions.map(region => `<span class="tag">🌍 ${region}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- MITRE ATT&CK FRAMEWORK -->
            ${advisory.mitreTactics?.length && advisory.mitreTactics.some(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)) ? `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">🛡️</div>
                    <h2 class="section-title">MITRE ATT&CK Framework</h2>
                </div>
                
                <table class="mitre-table">
                    <thead>
                        <tr>
                            <th>Tactic</th>
                            <th>🔢 Technique ID</th>
                            <th>⚙️ Technique Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${advisory.mitreTactics.filter(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)).map(tactic => 
                            `<tr>
                                <td class="mitre-tactic">${tactic.name || tactic.tacticName || 'Unknown'}</td>
                                <td><span class="mitre-id">${tactic.id || tactic.techniqueId || 'N/A'}</span></td>
                                <td class="mitre-technique">${tactic.technique || tactic.name || 'No description available'}</td>
                            </tr>`
                        ).join('')}
                    </tbody>
                </table>
                <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 15px; font-style: italic;">
                    📊 Total MITRE Tactics Identified: ${advisory.mitreTactics.filter(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)).length}
                </p>
            </div>
            ` : ''}

            <!-- SECURITY RECOMMENDATIONS -->
            ${advisory.recommendations?.length ? `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">✅</div>
                    <h2 class="section-title">Security Recommendations</h2>
                </div>
                
                <ol class="recommendation-list">
                    ${advisory.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ol>
            </div>
            ` : ''}

            <!-- DETAILED INFORMATION -->
            <div class="link-panel">
                <p><strong>📋 For comprehensive threat analysis and detailed information:</strong></p>
                <a href="${baseUrl}/advisory/${advisory._id}">
                     View Full Advisory Report
                </a>
                <p style="font-size: 14px; color: #e5e7eb; margin-top: 12px;">
                    🔍 Access complete IOCs, patch details, and additional threat intelligence data
                </p>
            </div>
        </div>
        
        <div class="footer">
            <h3>🦅 EaglEye IntelDesk</h3>
            <p><strong>🛡️ Threat Intelligence Platform</strong></p>
            <p>🔬 Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
            <p class="disclaimer">
                🤖 This is an automated security advisory from your threat intelligence system.<br>
                📧 Please do not reply to this email. For support, contact your security team.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}
