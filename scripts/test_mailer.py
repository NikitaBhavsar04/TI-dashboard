#!/usr/bin/env python3
"""
Production test script for Microsoft Graph mailer.
Tests certificate authentication, token acquisition, and email sending.
"""

import os
import sys
import logging
from typing import Dict, Any

# Import from local mailer module
try:
    from mailer import validate_config, send_test_email, acquire_token_with_cert, load_private_key_from_file, load_private_key_from_aws
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from mailer import validate_config, send_test_email, acquire_token_with_cert, load_private_key_from_file, load_private_key_from_aws

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
LOG = logging.getLogger("test_mailer")


def test_configuration() -> bool:
    """Test that all required configuration is present."""
    LOG.info("🔍 Testing configuration...")
    try:
        config = validate_config()
        LOG.info("✅ Configuration validation passed")
        return True
    except SystemExit:
        LOG.error("❌ Configuration validation failed")
        return False
    except Exception as e:
        LOG.error(f"❌ Configuration test error: {e}")
        return False


def test_certificate_loading() -> bool:
    """Test loading the private certificate."""
    LOG.info("🔍 Testing certificate loading...")
    try:
        config = validate_config()
        
        if config.get("aws_secret"):
            LOG.info("Testing AWS Secrets Manager access...")
            private_key = load_private_key_from_aws(config["aws_secret"], region_name=config.get("aws_region"))
        else:
            LOG.info("Testing local file access...")
            private_key = load_private_key_from_file(config["cert_path"])
        
        if private_key and "BEGIN" in private_key and "PRIVATE KEY" in private_key:
            LOG.info("✅ Certificate loading passed")
            return True
        else:
            LOG.error("❌ Certificate content appears invalid")
            return False
            
    except Exception as e:
        LOG.error(f"❌ Certificate loading failed: {e}")
        return False


def test_token_acquisition() -> bool:
    """Test acquiring access token from Microsoft Graph."""
    LOG.info("🔍 Testing token acquisition...")
    try:
        config = validate_config()
        
        # Load private key
        if config.get("aws_secret"):
            private_key = load_private_key_from_aws(config["aws_secret"], region_name=config.get("aws_region"))
        else:
            private_key = load_private_key_from_file(config["cert_path"])
        
        # Acquire token
        token = acquire_token_with_cert(
            tenant_id=config["tenant_id"],
            client_id=config["client_id"],
            private_key=private_key,
            thumbprint=config["cert_thumb"],
            scope=config["graph_scope"]
        )
        
        if token and len(token) > 50:  # Basic token validation
            LOG.info("✅ Token acquisition passed")
            return True
        else:
            LOG.error("❌ Token appears invalid")
            return False
            
    except Exception as e:
        LOG.error(f"❌ Token acquisition failed: {e}")
        return False


def test_email_sending() -> bool:
    """Test sending an actual test email."""
    LOG.info("🔍 Testing email sending...")
    try:
        config = validate_config()
        success = send_test_email(config)
        
        if success:
            LOG.info("✅ Email sending passed")
            return True
        else:
            LOG.error("❌ Email sending failed")
            return False
            
    except Exception as e:
        LOG.error(f"❌ Email sending test failed: {e}")
        return False


def run_all_tests() -> Dict[str, bool]:
    """Run all tests and return results."""
    LOG.info("🚀 Starting comprehensive mailer tests...")
    LOG.info("=" * 60)
    
    tests = {
        "Configuration": test_configuration,
        "Certificate Loading": test_certificate_loading,
        "Token Acquisition": test_token_acquisition,
        "Email Sending": test_email_sending,
    }
    
    results = {}
    
    for test_name, test_func in tests.items():
        LOG.info(f"\n📋 Running: {test_name}")
        try:
            results[test_name] = test_func()
        except Exception as e:
            LOG.error(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
        
        status = "✅ PASSED" if results[test_name] else "❌ FAILED"
        LOG.info(f"   Result: {status}")
    
    return results


def main():
    """Main test runner with summary report."""
    results = run_all_tests()
    
    LOG.info("\n" + "=" * 60)
    LOG.info("📊 TEST SUMMARY")
    LOG.info("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        LOG.info(f"  {test_name:<20} {status}")
    
    LOG.info("-" * 60)
    LOG.info(f"  Total: {passed}/{total} tests passed")
    
    if passed == total:
        LOG.info("🎉 ALL TESTS PASSED! Your mailer is production-ready.")
        return 0
    else:
        LOG.error(f"💥 {total - passed} test(s) failed. Check configuration and setup.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)