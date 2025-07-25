// Quick debug script to test payload structure with all fields
const testPayload = {
  title: "Test Advisory with All Fields",
  description: "Test description",
  summary: "Test summary", 
  severity: "High",
  category: "Data Leakage",
  author: "Test Analyst",
  content: "Test content",
  tags: ["test"],
  references: ["http://example.com"],
  cveIds: ["CVE-2024-1234"],
  iocs: [],
  mitreTactics: [
    {
      id: "T1566",
      name: "Phishing",
      technique: "Spearphishing Attachment"
    }
  ],
  affectedProduct: "GitHub",
  targetSectors: ["Technology", "Finance"],
  regions: ["Global", "North America"],
  tlp: "TLP:AMBER",
  recommendations: ["Implement proper secret scanning", "Use repository hygiene"],
  patchDetails: ["Update to latest version", "Apply security patches"]
};

console.log("Test payload structure:");
console.log(JSON.stringify(testPayload, null, 2));

// Test if we can send this to the API
fetch('http://localhost:3000/api/advisories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
})
.then(response => response.json())
.then(data => {
  console.log("API Response:");
  console.log(JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error("Error:", error);
});
