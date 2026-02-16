function generateAdvisory4EmailTemplate(advisory, customMessage = '', iocDetectionData = null) {
  try {
    const fs = require('fs');
    const path = require('path');

    // Read the template
    const templatePath = path.resolve(process.cwd(), 'templates', 'advisory_4.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Extract data from advisory with fallbacks
    const title = advisory.title || advisory.display_title || 'Advisory';
    const criticality = (advisory.criticality || advisory.severity || 'MEDIUM').toUpperCase();
    const threat_type = advisory.threat_type || advisory.threatType || 'Unknown';
    const tlp = (advisory.tlp || 'CLEAR').toUpperCase();
    const advisory_id = advisory.advisory_id || advisory._id || advisory.id || '';
    const vendor = advisory.vendor || 'Unknown';
    
    // Executive summary - handle multiple formats including pre-split array
    let exec_summary_parts = [];
    if (Array.isArray(advisory.exec_summary_parts)) {
      // Manual advisory format - already split into parts
      exec_summary_parts = advisory.exec_summary_parts.filter(p => p && p.trim());
    } else {
      const exec_summary = advisory.executive_summary || advisory.exec_summary || advisory.description || advisory.summary || '';
      exec_summary_parts = exec_summary ? exec_summary.split('\n\n').filter(p => p.trim()) : [];
    }
    if (exec_summary_parts.length === 0) exec_summary_parts = ['No summary available'];
    
    // Affected items - ensure arrays
    let affected_products_array = [];
    if (Array.isArray(advisory.affected_products)) {
      affected_products_array = advisory.affected_products;
    } else if (advisory.affected_product) {
      affected_products_array = Array.isArray(advisory.affected_product) ? advisory.affected_product : [advisory.affected_product];
    } else if (typeof advisory.affected_products === 'string') {
      affected_products_array = [advisory.affected_products];
    }
    const affected_product = affected_products_array.length > 0 ? affected_products_array.join(', ') : 'Not specified';
    
    // Sectors and regions
    const sectors_raw = advisory.affected_sectors || advisory.sectors || advisory.sector || [];
    const sectors = Array.isArray(sectors_raw) ? sectors_raw : (sectors_raw ? [sectors_raw] : []);
    
    const regions_raw = advisory.affected_regions || advisory.regions || advisory.region || [];
    const regions = Array.isArray(regions_raw) ? regions_raw : (regions_raw ? [regions_raw] : []);
    
    // CVEs - handle "No CVE" strings
    const cves_raw = advisory.cves || advisory.cve_ids || advisory.cve || advisory.cveIds || [];
    let cve_list = [];
    let has_cve = false;
    if (Array.isArray(cves_raw)) {
      cve_list = cves_raw.filter(c => c && c.trim() && !c.includes('No CVE'));
    } else if (typeof cves_raw === 'string') {
      if (!cves_raw.includes('No CVE')) {
        cve_list = cves_raw.includes(',') ? cves_raw.split(',').map(c => c.trim()) : [cves_raw];
      }
    }
    has_cve = cve_list.length > 0;
    if (cve_list.length === 0) cve_list = ['Not Available'];
    
    // CVSS - handle both old and new formats
    const cvss = advisory.cvss || advisory.cvss_score || null;
    let cvss_score = '';
    let has_cvss = false;
    if (cvss) {
      if (Array.isArray(cvss) && cvss.length > 0) {
        // New format: array of CVSS entries
        const highest = cvss.reduce((prev, curr) =>
          (curr.score > (prev.score || 0)) ? curr : prev
        );
        cvss_score = highest.score || '';
        has_cvss = !!cvss_score;
      } else if (typeof cvss === 'object' && Object.keys(cvss).length > 0) {
        // Old format: object with nested values
        const first = Object.values(cvss)[0];
        cvss_score = first.score || first.baseScore || '';
        has_cvss = !!cvss_score;
      } else if (typeof cvss === 'number' || typeof cvss === 'string') {
        cvss_score = cvss;
        has_cvss = true;
      }
    }
    
    // MITRE ATT&CK
    const mitre_raw = advisory.mitre_attack || advisory.mitre || advisory.mitre_tactics || [];
    const mitre_array = Array.isArray(mitre_raw) ? mitre_raw.filter(m => m && (m.tactic || m.technique)) : [];
    
    // MBC (Malware Behavior Catalog)
    const mbc_raw = advisory.mbc || [];
    const mbc = Array.isArray(mbc_raw) ? mbc_raw.filter(b => b && (b.behavior || b.objective)) : [];
    
    // IOCs - handle both old dict format and new list format
    let iocs = {};
    const raw_iocs = advisory.iocs || {};
    
    const sanitizeIocVal = (val) => typeof val === 'string' ? val.replace(/[<>";]+/g, '').trim() : val;
    const sanitizeList = (arr = []) => Array.isArray(arr) ? arr.map(v => sanitizeIocVal(v)).filter(Boolean) : [];

    if (Array.isArray(raw_iocs)) {
      // New format: list of {type, value} objects
      iocs = {
        domains: [],
        ipv4: [],
        ips: [],
        hashes: [],
        md5: [],
        sha1: [],
        sha256: []
      };
      
      raw_iocs.forEach(ioc => {
        if (ioc.type && ioc.value) {
          const type = ioc.type.toLowerCase();
          const value = sanitizeIocVal(ioc.value);
          
          if (type === 'domain') {
            iocs.domains.push(value);
          } else if (type === 'ip' || type === 'ipv4') {
            iocs.ipv4.push(value);
            iocs.ips.push(value);
          } else if (type === 'hash') {
            iocs.hashes.push(value);
            // Try to determine hash type by length
            if (value.length === 32) {
              iocs.md5.push(value);
            } else if (value.length === 40) {
              iocs.sha1.push(value);
            } else if (value.length === 64) {
              iocs.sha256.push(value);
            }
          } else if (type === 'md5') {
            iocs.md5.push(value);
            iocs.hashes.push(value);
          } else if (type === 'sha1') {
            iocs.sha1.push(value);
            iocs.hashes.push(value);
          } else if (type === 'sha256') {
            iocs.sha256.push(value);
            iocs.hashes.push(value);
          }
        }
      });
    } else if (typeof raw_iocs === 'object') {
      // Old format: keep as-is
      iocs = raw_iocs;
    }

    // Sanitize any list-based IOCs to avoid stray characters like ;"> in output
    if (iocs.ipv4) iocs.ipv4 = sanitizeList(iocs.ipv4);
    if (iocs.domains) iocs.domains = sanitizeList(iocs.domains);
    if (iocs.md5) iocs.md5 = sanitizeList(iocs.md5);
    if (iocs.sha1) iocs.sha1 = sanitizeList(iocs.sha1);
    if (iocs.sha256) iocs.sha256 = sanitizeList(iocs.sha256);
    if (iocs.hashes) iocs.hashes = sanitizeList(iocs.hashes);
    
    // Recommendations
    const rec_raw = advisory.recommendations || advisory.recommendation || [];
    let recommendations = Array.isArray(rec_raw) ? rec_raw.filter(r => r && r.trim()) : (rec_raw ? [rec_raw] : []);
    if (recommendations.length === 0) {
      recommendations = [
        'Apply all available security patches immediately',
        'Monitor network traffic for suspicious activities',
        'Implement defense-in-depth security controls'
      ];
    }
    
    // References
    const ref_raw = advisory.references || advisory.reference || [];
    let ref_list = Array.isArray(ref_raw) ? ref_raw.filter(r => r && r.trim()) : (ref_raw ? [ref_raw] : []);
    if (ref_list.length === 0) ref_list = ['No references available'];
    
    // Patch details
    const patch_details_raw = advisory.patch_details || advisory.patches || [];
    let patch_details = [];
    if (Array.isArray(patch_details_raw)) {
      patch_details = patch_details_raw.filter(p => p && p.trim());
    } else if (typeof patch_details_raw === 'string' && patch_details_raw.trim()) {
      patch_details = patch_details_raw.split('\n').filter(p => p.trim());
    }

    console.log('📧 Generating email with ACTUAL ADVISORY DATA:', {
      title,
      criticality,
      threat_type,
      tlp,
      advisory_id,
      vendor,
      exec_summary_parts: exec_summary_parts.length,
      affected_products: affected_products_array.length,
      sectors: sectors.length,
      regions: regions.length,
      cves: cve_list.length,
      has_cve,
      cvss_score,
      has_cvss,
      mitre: mitre_array.length,
      mbc: mbc.length,
      iocs_keys: Object.keys(iocs),
      iocs_total_count: Object.values(iocs).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
      recommendations: recommendations.length,
      references: ref_list.length,
      patch_details: patch_details.length
    });

    // ==================== REPLACE ALL JINJA2 PATTERNS ====================
    
    // 1. Simple variable replacements
    template = template.replace(/\{\{\s*title\s*(?:or\s*['"].*?['"])?\s*\}\}/g, title);
    template = template.replace(/\{\{\s*criticality\s*\}\}/g, criticality);
    template = template.replace(/\{\{\s*threat_type\s*\}\}/g, threat_type);
    template = template.replace(/\{\{\s*tlp\s*\}\}/g, tlp);
    template = template.replace(/\{\{\s*advisory_id\s*\}\}/g, advisory_id);
    template = template.replace(/\{\{\s*affected_product\s*\}\}/g, affected_product);
    template = template.replace(/\{\{\s*vendor\s*\}\}/g, vendor);
    template = template.replace(/\{\{\s*sectors\s*\|\s*join\(['"]\s*,\s*['"]\)\s*\}\}/g, sectors.join(', ') || 'Not specified');
    template = template.replace(/\{\{\s*regions\s*\|\s*join\(['"]\s*,\s*['"]\)\s*\}\}/g, regions.join(', ') || 'Not specified');
    // Handle CVE display with styling for missing data
    const cve_display = has_cve 
      ? cve_list.join(', ')
      : '<span style="color: #94A3B8; font-style: italic;">Not Available</span>';
    template = template.replace(/\{\{\s*cves\s*\|\s*join\(['"]\s*,\s*['"]\)\s*\}\}/g, cve_display);

    // 2. TLP color indicators
    template = template.replace(/\{%\s*if\s+tlp\s*==\s*'CLEAR'\s*%\}#FFFFFF\{%\s*else\s*%\}transparent\{%\s*endif\s*%\}/g, 
      tlp === 'CLEAR' ? '#FFFFFF' : 'transparent');
    template = template.replace(/\{%\s*if\s+tlp\s*==\s*'GREEN'\s*%\}#2E7D32\{%\s*else\s*%\}transparent\{%\s*endif\s*%\}/g, 
      tlp === 'GREEN' ? '#2E7D32' : 'transparent');
    template = template.replace(/\{%\s*if\s+tlp\s+in\s+\['AMBER','AMBER\+STRICT'\]\s*%\}#F9A825\{%\s*else\s*%\}transparent\{%\s*endif\s*%\}/g, 
      (tlp.includes('AMBER')) ? '#F9A825' : 'transparent');
    template = template.replace(/\{%\s*if\s+tlp\s*==\s*'RED'\s*%\}#C62828\{%\s*else\s*%\}transparent\{%\s*endif\s*%\}/g, 
      tlp === 'RED' ? '#C62828' : 'transparent');

    // 3. Executive summary paragraphs loop
    let exec_html = '';
    exec_summary_parts.forEach(para => {
      exec_html += `<p style="margin: 15px 0 20px 0; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #0B2233; text-align: justify;">${para}</p>\n`;
    });
    template = template.replace(/\{%\s*for\s+para\s+in\s+exec_summary_parts\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, exec_html);

    // 4. CVSS Score section with enhanced information
      let cvss_html = '';
      if (cvss_score) {
        cvss_html = `<strong style="color: #0B1F33;">CVSS:</strong> ${cvss_score}`;
      } else {
        cvss_html = '<span style="color: #94A3B8; font-style: italic;"><strong>CVSS:</strong> Not Available</span>';
      }
    template = template.replace(/\{%\s*if\s+cvss\s*%\}[\s\S]*?\{%\s*else\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, cvss_html);

    // 5. MITRE ATT&CK table - Replace nested loop structure manually due to nested if/else complexity
    let mitre_html = '';
    if (mitre_array && mitre_array.length > 0) {
      let rows_html = '';
      mitre_array.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F7FAFD';
        const tactic = row.tactic || row.tacticName || row.name || row.Tactic || row.TACTIC || '';
        const techniqueId = row.id || row.techniqueId || row.technique_id || row['Technique ID'] || '';
        const technique = row.technique || (row.techniques && row.techniques[0]) || row.Technique || row.TECHNIQUE || '';
        
        rows_html += `<tr style="background-color: ${bgColor};">
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${tactic}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${techniqueId}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${technique}</td>
                                        </tr>\n`;
      });
      mitre_html = rows_html;
    } else {
      mitre_html = `<tr><td colspan="3" style="padding: 15px; border-bottom: 1px solid #D7DEE8; text-align: center; color: #94A3B8; font-style: italic; font-family: 'Roboto', Arial, sans-serif; font-size: 14px;">MITRE ATT&CK mapping not available for this threat</td></tr>`;
    }
    
    // Replace ONLY the MITRE tbody content - match from thead closing to tbody closing
    // This is more specific to avoid matching other tbody elements
    template = template.replace(
      /<\/thead>\s*<tbody>\s*\{%\s*if\s+mitre\s*%\}[\s\S]*?\{%\s*endif\s*%\}\s*<\/tbody>/,
      `</thead>\n                                    <tbody>\n                                        ${mitre_html}\n                                    </tbody>`
    );

    // 6. MBC (Malware Behavior Catalog) section - Replace loop first, then remove wrapper
    if (mbc && mbc.length > 0) {
      let mbc_html = '';
      mbc.forEach((b, index) => {
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F7FAFD';
        mbc_html += `<tr style="background-color: ${bgColor};">
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.behavior || ''}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.objective || ''}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.confidence || ''}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.evidence || ''}</td>
                                        </tr>\n`;
      });
      // Replace the loop
      template = template.replace(/\{%\s*for\s+b\s+in\s+mbc\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, mbc_html);
      // Remove the if wrapper - keep the content between {% if mbc %} and {% endif %}
      template = template.replace(/\{%\s*if\s+mbc\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
    } else {
      // Remove entire MBC section including the heading, table, and all content
      // This matches from {% if mbc %} through the entire table and {% endif %}
      template = template.replace(/\{%\s*if\s+mbc\s*%\}[\s\S]*?<\/table>[\s\S]*?\{%\s*endif\s*%\}/g, '');
    }
    
    // Clean up any remaining MBC placeholders that weren't caught by the loop replacement
    template = template.replace(/\{\{\s*b\.behavior\s*\}\}/g, '');
    template = template.replace(/\{\{\s*b\.objective\s*\}\}/g, '');
    template = template.replace(/\{\{\s*b\.confidence\s*\}\}/g, '');
    template = template.replace(/\{\{\s*b\.evidence\s*\}\}/g, '');

    // 7. IOCs section - build full block when present, remove entirely when absent
    const hasIOCs = iocs && (
      (Array.isArray(iocs.ipv4) && iocs.ipv4.length > 0) ||
      (Array.isArray(iocs.domains) && iocs.domains.length > 0) ||
      (Array.isArray(iocs.md5) && iocs.md5.length > 0) ||
      (Array.isArray(iocs.sha1) && iocs.sha1.length > 0) ||
      (Array.isArray(iocs.sha256) && iocs.sha256.length > 0)
    );

    const buildIocList = (heading, items, fontSize = '15px') => {
      if (!items || items.length === 0) return '';
      const list = items.map(v => `<li>${v}</li>`).join('\n');
      return `
                                <h4 style="font-family: 'Rajdhani', Arial, sans-serif; color: #0B1F33;">${heading}</h4>
                                <ul style="font-family: 'Roboto', Arial, sans-serif; font-size: ${fontSize}; color: #0B2233;${fontSize === '14px' ? ' word-break: break-all;' : ''}">
                                    ${list}
                                </ul>
      `;
    };

    if (hasIOCs) {
      const ipv4Block = buildIocList('IP Addresses', iocs.ipv4, '15px');
      const domainsBlock = buildIocList('Domains', iocs.domains, '15px');
      const md5Block = buildIocList('MD5 Hashes', iocs.md5, '14px');
      const sha1Block = buildIocList('SHA1 Hashes', iocs.sha1, '14px');
      const sha256Block = buildIocList('SHA256 Hashes', iocs.sha256, '14px');

      const iocSection = `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                        style="background-color: #FFFFFF; border: 1px solid #D7DEE8; border-radius: 12px; margin-top: 15px; box-shadow: 0 6px 18px rgba(11,31,51,.06);">
                        <tr>
                            <td style="padding: 20px;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td width="60" style="vertical-align: middle;">
                                            <div style="height: 6px; width: 60px; border-radius: 99px;
                                    background: linear-gradient(to right, #1FA4B8, #2C71C3);">
                                            </div>
                                        </td>
                                        <td style="padding-left: 10px; vertical-align: middle;">
                                            <h2 style="margin: 0;
                                   font-family: 'Rajdhani', Arial, sans-serif;
                                   font-size: 24px;
                                   font-weight: 700;
                                   color: #0B1F33;">
                                                Indicators of Compromise (IOCs)
                                            </h2>
                                        </td>
                                    </tr>
                                </table>

                                <div style="height: 15px;"></div>

${ipv4Block}${domainsBlock}${md5Block}${sha1Block}${sha256Block}

                            </td>
                        </tr>
                    </table>`;

      template = template.replace(/\{%\s*if\s+iocs\s+and\s+\([\s\S]*?\)\s*%\}[\s\S]*?\{%\s*endif\s*%\}/, iocSection);
      // Remove any other IOC conditional remnants to avoid duplication
      template = template.replace(/\{%\s*if\s+iocs[\s\S]*?%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      // Drop empty IOC sublists that might linger with blank <li>
      template = template.replace(/<h4[^>]*>(?:IP Addresses|Domains|MD5 Hashes|SHA1 Hashes|SHA256 Hashes)[^<]*<\/h4>\s*<ul[^>]*>\s*(?:<li>\s*<\/li>\s*)*<\/ul>/gi, '');
    } else {
      // Remove IOC block completely when no data; strip surrounding whitespace to avoid visual gaps
      template = template.replace(/\s*\{%\s*if\s+iocs[\s\S]*?%\}\s*<table[\s\S]*?Indicators of Compromise \(IOCs\)[\s\S]*?<\/table>\s*\{%\s*endif\s*%\}\s*/gi, '');
      template = template.replace(/\s*\{%\s*if\s+iocs\s+and\s+\([\s\S]*?\)\s*%\}[\s\S]*?\{%\s*endif\s*%\}\s*/g, '');
    }

    // ================= IOC DETECTION SECTION (SAFE VERSION) =================

    const hasIocDetection =
      iocDetectionData &&
      iocDetectionData.client_name &&
      Array.isArray(iocDetectionData.matches) &&
      iocDetectionData.matches.length > 0;

    if (hasIocDetection) {

      const checkedAt = iocDetectionData.checked_at
        ? new Date(iocDetectionData.checked_at).toLocaleString()
        : '';

      const matchCount = iocDetectionData.match_count || iocDetectionData.matches.length;

      let matchRows = '';

      iocDetectionData.matches.forEach((match, index) => {

        const safeIoc = sanitizeIocVal(match.ioc || '');
        const safeField = sanitizeIocVal(match.matched_field || '');
        const safeTime = match.timestamp
          ? new Date(match.timestamp).toLocaleString()
          : '';

        const bgColor = index % 2 === 0 ? '#F7FAFD' : '#FFFFFF';

        matchRows += `
<tr style="background-color:${bgColor};">
<td style="padding:10px;border-bottom:1px solid #D7DEE8;font-family:monospace;font-size:14px;color:#0B2233;">
${safeIoc}
</td>
<td style="padding:10px;border-bottom:1px solid #D7DEE8;font-family:'Roboto',Arial,sans-serif;font-size:14px;color:#0B2233;text-transform:uppercase;">
${safeField}
</td>
<td style="padding:10px;border-bottom:1px solid #D7DEE8;font-family:'Roboto',Arial,sans-serif;font-size:14px;color:#0B2233;">
${safeTime}
</td>
</tr>`;
      });

      template = template.replace(
        /\{%\s*for\s+match\s+in\s+ioc_detection\.matches\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/,
        matchRows
      );

      template = template.replace(
        /\{\{\s*ioc_detection\.checked_at\s*\}\}/g,
        checkedAt
      );

      template = template.replace(
        /\{\{\s*ioc_detection\.match_count\s*\}\}/g,
        matchCount
      );

      // Remove the wrapper conditional but keep content
      template = template.replace(
        /\{%\s*if\s+ioc_detection\s+and\s+ioc_detection\.client_name\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/,
        '$1'
      );

      // Handle the nested checked_at conditional
      template = template.replace(
        /\{%\s*if\s+ioc_detection\.checked_at\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/,
        '$1'
      );

      console.log('✅ [TEMPLATE GEN] IOC detection section included');

    } else {

      template = template.replace(
        /\{%\s*if\s+ioc_detection\s+and\s+ioc_detection\.client_name\s*%\}[\s\S]*?\{%\s*endif\s*%\}/,
        ''
      );

      console.log('⚠️ [TEMPLATE GEN] IOC detection section removed (no data)');
    }

    // 8. Recommendations loop
    let rec_html = '';
    recommendations.forEach(rec => {
      const cleanRec = String(rec).trim();
      if (cleanRec) {
        rec_html += `<tr>
                                        <td width="20" valign="top" style="padding-bottom: 8px; color: #1FA4B8; font-weight: 900;">✔</td>
                                        <td valign="top" style="padding-bottom: 8px; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; color: rgba(255,255,255,0.92);">${cleanRec}</td>
                                    </tr>\n`;
      }
    });
    template = template.replace(/\{%\s*for\s+rec\s+in\s+recommendations\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, rec_html);

    // 9. References loop
    let ref_html = '';
    ref_list.forEach(ref => {
      const cleanRef = String(ref).trim();
      if (cleanRef && cleanRef !== 'No references available') {
        ref_html += `<tr>
                                        <td width="20" valign="top" style="padding-bottom: 8px; color: #1FA4B8; font-weight: 900;">✔</td>
                                        <td valign="top" style="padding-bottom: 8px; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; color: rgba(255,255,255,0.92);">
                                            <a href="${cleanRef}" style="color: #64B5F6; text-decoration: none;">${cleanRef}</a>
                                        </td>
                                    </tr>\n`;
      } else {
        ref_html += `<tr>
                                        <td width="20" valign="top" style="padding-bottom: 8px; color: #1FA4B8; font-weight: 900;">✔</td>
                                        <td valign="top" style="padding-bottom: 8px; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; color: rgba(255,255,255,0.92);">No references available</td>
                                    </tr>\n`;
      }
    });
    template = template.replace(/\{%\s*for\s+ref\s+in\s+references\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, ref_html);

    // 10. Patch details section
    let patch_html = '';
    if (patch_details && patch_details.length > 0) {
      patch_details.forEach(p => {
        patch_html += `<tr>
                                        <td width="20" valign="top" style="padding-bottom: 8px; color: #1FA4B8; font-weight: 900;">✔</td>
                                        <td valign="top" style="padding-bottom: 8px; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; color: rgba(255,255,255,0.92);">${p}</td>
                                    </tr>\n`;
      });
    } else {
      patch_html = `<tr>
                                        <td width="20" valign="top" style="padding-bottom: 8px; color: #1FA4B8; font-weight: 900;">✔</td>
                                        <td valign="top" style="padding-bottom: 8px; font-family: 'Roboto', Arial, sans-serif; font-size: 16px; color: rgba(255,255,255,0.92);">No patch details provided.</td>
                                    </tr>`;
    }
    template = template.replace(/\{%\s*if\s+patch_details\s*%\}[\s\S]*?\{%\s*else\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, patch_html);

    // Add custom message if provided
    if (customMessage) {
      const customMessageHTML = `
            <tr>
              <td style="padding: 20px 30px; background-color: rgba(5, 150, 105, 0.8);">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #ffffff;">📢 Message from Security Team</h3>
                <p style="margin: 0; font-size: 14px; color: #ecfdf5; line-height: 1.5;">${customMessage.replace(/\n/g, '<br>')}</p>
              </td>
            </tr>
      `;
      template = template.replace(/(<\/tr>)/, `$1${customMessageHTML}`);
    }

    // ==================== FINAL CLEANUP (SAFE VERSION) ====================
    // This runs LAST after all specific replacements have been made
    
    // Remove any leftover simple placeholders that weren't handled
    template = template.replace(/\{\{[^}]+\}\}/g, '');

    // Remove ALL remaining Jinja2 control structures (these should already be processed)
    // This is safe because we run it AFTER all the specific content replacements above
    template = template.replace(/\{%\s*if\s+[^%]+%\}/g, '');
    template = template.replace(/\{%\s*endif\s*%\}/g, '');
    template = template.replace(/\{%\s*for\s+[^%]+%\}/g, '');
    template = template.replace(/\{%\s*endfor\s*%\}/g, '');
    template = template.replace(/\{%\s*else\s*%\}/g, '');
    template = template.replace(/\{%\s*set\s+[^%]+%\}/g, '');
    
    // Clean up any orphaned fragments left behind from template removal
    template = template.replace(/^[\t ]*;">$\n?/gm, '');
    
    // Remove empty <tr> elements or rows with only empty <td> cells
    template = template.replace(/<tr[^>]*>\s*<\/tr>/g, '');
    template = template.replace(/<tr[^>]*>(\s*<td[^>]*>\s*<\/td>\s*){2,}<\/tr>/g, '');
    
    // Clean up multiple consecutive blank lines
    template = template.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    console.log('Advisory_4 template generation complete - ALL PLACEHOLDERS REPLACED WITH ACTUAL DATA');
    // Ensure the template is wrapped in <html>...</html> tags
    if (!/^<html[\s>]/i.test(template.trim())) {
      return `<html>\n${template}\n</html>`;
    }
    return template;

  } catch (error) {
    console.error('❌ Error generating advisory_4 email template:', error);
    // Fallback to simple template
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h1>${advisory.title}</h1>
          <p>${advisory.executive_summary}</p>
          <p style="color: red;">Error: ${error.message}</p>
        </body>
      </html>
    `;
  }
}

module.exports = { generateAdvisory4EmailTemplate };
