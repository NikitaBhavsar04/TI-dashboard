function generateAdvisory4EmailTemplate(advisory, customMessage = '') {
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
    if (Array.isArray(cves_raw)) {
      cve_list = cves_raw.filter(c => c && c.trim() && !c.includes('No CVE'));
    } else if (typeof cves_raw === 'string') {
      if (!cves_raw.includes('No CVE')) {
        cve_list = cves_raw.includes(',') ? cves_raw.split(',').map(c => c.trim()) : [cves_raw];
      }
    }
    if (cve_list.length === 0) cve_list = ['No CVE identified'];
    
    // CVSS - handle both old and new formats
    const cvss = advisory.cvss || advisory.cvss_score || null;
    let cvss_score = '';
    if (cvss) {
      if (Array.isArray(cvss) && cvss.length > 0) {
        // New format: array of CVSS entries
        const highest = cvss.reduce((prev, curr) =>
          (curr.score > (prev.score || 0)) ? curr : prev
        );
        cvss_score = highest.score || '';
      } else if (typeof cvss === 'object' && Object.keys(cvss).length > 0) {
        // Old format: object with nested values
        const first = Object.values(cvss)[0];
        cvss_score = first.score || first.baseScore || '';
      } else if (typeof cvss === 'number' || typeof cvss === 'string') {
        cvss_score = cvss;
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
          const value = ioc.value;
          
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
      cvss_score,
      // cvss_vector and cvss_source removed (no longer used)
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
    template = template.replace(/\{\{\s*cves\s*\|\s*join\(['"]\s*,\s*['"]\)\s*\}\}/g, cve_list.join(', '));

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
        cvss_html = `<strong style="color: #0B2233;">CVSS:</strong> ${cvss_score}`;
      } else {
        cvss_html = '<strong style="color: #999;">CVSS: N/A</strong>';
      }
    template = template.replace(/\{%\s*if\s+cvss\s*%\}[\s\S]*?\{%\s*else\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, cvss_html);

    // 5. MITRE ATT&CK table - Replace nested loop structure manually due to nested if/else complexity
    let mitre_html = '';
    if (mitre_array && mitre_array.length > 0) {
      mitre_array.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F7FAFD';
        const tactic = row.tactic || row.Tactic || row.TACTIC || 'N/A';
        const techniqueId = row.techniqueId || row.technique_id || row['Technique ID'] || row.id || 'N/A';
        const technique = row.technique || row.Technique || row.TECHNIQUE || 'N/A';
        
        mitre_html += `<tr style="background-color: ${bgColor};">
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${tactic}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${techniqueId}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${technique}</td>
                                        </tr>\n`;
      });
    } else {
      mitre_html = `<tr><td colspan="3" style="padding: 10px; border-bottom: 1px solid #D7DEE8;">No mapping available</td></tr>`;
    }
    // Use a more specific regex that accounts for nested structures
    template = template.replace(/\{%\s*if\s+mitre\s*%\}[\s\S]*?\{%\s*for\s+row\s+in\s+mitre\s*%\}[\s\S]*?\{%\s*endfor\s*%\}[\s\S]*?\{%\s*else\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, mitre_html);

    // 6. MBC (Malware Behavior Catalog) section - Replace loop first, then remove wrapper
    if (mbc && mbc.length > 0) {
      let mbc_html = '';
      mbc.forEach((b, index) => {
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F7FAFD';
        mbc_html += `<tr style="background-color: ${bgColor};">
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.behavior || 'N/A'}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.objective || 'N/A'}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.confidence || 'N/A'}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #D7DEE8; font-family: 'Roboto', Arial, sans-serif; font-size: 14px; color: #0B2233;">${b.evidence || 'N/A'}</td>
                                        </tr>\n`;
      });
      // Replace the loop
      template = template.replace(/\{%\s*for\s+b\s+in\s+mbc\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, mbc_html);
      // Remove the if wrapper - keep the content between {% if mbc %} and {% endif %}
      template = template.replace(/\{%\s*if\s+mbc\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
    } else {
      // Remove entire MBC section if no data
      template = template.replace(/\{%\s*if\s+mbc\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
    }
    
    // Clean up any remaining MBC placeholders that weren't caught by the loop replacement
    template = template.replace(/\{\{\s*b\.behavior\s*\}\}/g, 'N/A');
    template = template.replace(/\{\{\s*b\.objective\s*\}\}/g, 'N/A');
    template = template.replace(/\{\{\s*b\.confidence\s*\}\}/g, 'N/A');
    template = template.replace(/\{\{\s*b\.evidence\s*\}\}/g, 'N/A');

    // 7. IOCs section - Handle all IOC types
    const hasIOCs = iocs && Object.keys(iocs).length > 0 && (
      (iocs.ipv4 && iocs.ipv4.length > 0) ||
      (iocs.domains && iocs.domains.length > 0) ||
      (iocs.md5 && iocs.md5.length > 0) ||
      (iocs.sha1 && iocs.sha1.length > 0) ||
      (iocs.sha256 && iocs.sha256.length > 0)
    );
    
    if (hasIOCs) {
      // Replace IPv4 loop
      if (iocs.ipv4 && iocs.ipv4.length > 0) {
        let ipv4_html = '';
        iocs.ipv4.forEach(ip => {
          ipv4_html += `<li>${ip}</li>\n`;
        });
        template = template.replace(/\{%\s*for\s+ip\s+in\s+iocs\.ipv4\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, ipv4_html);
        template = template.replace(/\{%\s*if\s+iocs\.ipv4\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
      } else {
        template = template.replace(/\{%\s*if\s+iocs\.ipv4\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      }

      // Replace domains loop
      if (iocs.domains && iocs.domains.length > 0) {
        let domains_html = '';
        iocs.domains.forEach(d => {
          domains_html += `<li>${d}</li>\n`;
        });
        template = template.replace(/\{%\s*for\s+d\s+in\s+iocs\.domains\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, domains_html);
        template = template.replace(/\{%\s*if\s+iocs\.domains\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
      } else {
        template = template.replace(/\{%\s*if\s+iocs\.domains\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      }

      // Replace MD5 hashes loop
      if (iocs.md5 && iocs.md5.length > 0) {
        let md5_html = '';
        iocs.md5.forEach(h => {
          md5_html += `<li>${h}</li>\n`;
        });
        template = template.replace(/\{%\s*for\s+h\s+in\s+iocs\.md5\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, md5_html);
        template = template.replace(/\{%\s*if\s+iocs\.md5\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
      } else {
        template = template.replace(/\{%\s*if\s+iocs\.md5\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      }

      // Replace SHA1 hashes loop
      if (iocs.sha1 && iocs.sha1.length > 0) {
        let sha1_html = '';
        iocs.sha1.forEach(h => {
          sha1_html += `<li>${h}</li>\n`;
        });
        template = template.replace(/\{%\s*for\s+h\s+in\s+iocs\.sha1\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, sha1_html);
        template = template.replace(/\{%\s*if\s+iocs\.sha1\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
      } else {
        template = template.replace(/\{%\s*if\s+iocs\.sha1\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      }

      // Replace SHA256 hashes loop
      if (iocs.sha256 && iocs.sha256.length > 0) {
        let sha256_html = '';
        iocs.sha256.forEach(h => {
          sha256_html += `<li>${h}</li>\n`;
        });
        template = template.replace(/\{%\s*for\s+h\s+in\s+iocs\.sha256\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/g, sha256_html);
        template = template.replace(/\{%\s*if\s+iocs\.sha256\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, '$1');
      } else {
        template = template.replace(/\{%\s*if\s+iocs\.sha256\s*%\}[\s\S]*?\{%\s*endif\s*%\}/g, '');
      }
    }
    
    // Remove entire IOCs section if no IOCs - match from {% if iocs to {% endif %} before next major section
    if (!hasIOCs) {
      template = template.replace(/\{%\s*if\s+iocs\s+and\s+\([\s\S]*?iocs\.sha256[\s\S]*?\)\s*%\}[\s\S]*?<\/table>\s*\{%\s*endif\s*%\}/g, '');
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

    // ==================== FINAL CLEANUP ====================
    // Remove ALL remaining Jinja2 syntax that wasn't caught by specific replacements
    template = template.replace(/\{%\s*if\s+[\s\S]*?\s*%\}/g, '');
    template = template.replace(/\{%\s*else\s*%\}/g, '');
    template = template.replace(/\{%\s*endif\s*%\}/g, '');
    template = template.replace(/\{%\s*for\s+[\s\S]*?\s*%\}/g, '');
    template = template.replace(/\{%\s*endfor\s*%\}/g, '');
    template = template.replace(/\{\{\s*[\w\.]+\s*\}\}/g, 'N/A');
    
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
