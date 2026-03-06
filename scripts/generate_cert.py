from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption, NoEncryption
import datetime

# Usage: python scripts/generate_cert.py
# Produces mailer.pem (private key) and mailer.cer (public cert)

KEY_FILE = "mailer.pem"
CERT_FILE = "mailer.cer"
# Set this to None or a passphrase string to encrypt the private key
KEY_PASSWORD = None

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
    x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"State"),
    x509.NameAttribute(NameOID.LOCALITY_NAME, u"City"),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"YourOrg"),
    x509.NameAttribute(NameOID.COMMON_NAME, u"mailer"),
])

cert = (
    x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1))
    .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=3650))
    .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
    .sign(key, hashes.SHA256())
)

# Write private key
if KEY_PASSWORD:
    encryption = BestAvailableEncryption(KEY_PASSWORD.encode())
else:
    encryption = NoEncryption()

with open(KEY_FILE, "wb") as f:
    f.write(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=encryption,
        )
    )

# Write public cert
with open(CERT_FILE, "wb") as f:
    f.write(
        cert.public_bytes(serialization.Encoding.PEM)
    )

print(f"Wrote private key -> {KEY_FILE}")
print(f"Wrote public cert  -> {CERT_FILE}")
print("Make sure to send the .cer to admin and keep the .pem secret.")