import React, { useState, useEffect } from 'react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisory: {
    _id: string;
    title: string;
  };
}

export default function EmailModal({ isOpen, onClose, advisory }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('EmailModal useEffect triggered:', { isOpen, advisory: advisory?.title });
    if (isOpen) {
      setSubject(`Threat Advisory: ${advisory?.title || 'Untitled Advisory'}`);
    }
  }, [isOpen, advisory?.title]);

  const handleSendEmail = async () => {
    console.log('handleSendEmail called');
    
    if (!emailAddress.trim()) {
      alert('Please enter an email address');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        advisoryId: advisory?._id,
        recipients: [{
          type: 'individual',
          emails: [emailAddress]
        }],
        subject
      };

      console.log('Sending payload:', payload);

      const response = await fetch('/api/emails/send-advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('API response:', response.status, response.ok);
      const result = await response.json();
      console.log('API result:', result);

      if (response.ok) {
        alert('Email sent successfully!');
        onClose();
        setEmailAddress('');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    console.log('EmailModal not rendering - isOpen is false');
    return null;
  }

  console.log('EmailModal rendering - isOpen is true');

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        border: '2px solid #007bff',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '600px',
        padding: '30px',
        boxShadow: '0 0 50px rgba(0,0,0,0.8)'
      }}>
        <div style={{ color: 'black', fontSize: '16px' }}>
          <div style={{ borderBottom: '1px solid #ddd', paddingBottom: '20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', color: 'black' }}>
              Send Advisory Email
            </h2>
            <p style={{ color: '#666', margin: 0 }}>
              {advisory?.title || 'Untitled Advisory'}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              X
            </button>
          </div>

          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
                placeholder="Email subject"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email Address:</label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
                placeholder="email@example.com"
              />
            </div>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isLoading}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '12px 25px',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Sending...' : 'Send Email Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
